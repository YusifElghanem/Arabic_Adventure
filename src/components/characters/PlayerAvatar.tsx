import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { CapsuleGeometry, DoubleSide, MathUtils, SphereGeometry, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { useGameStore, type Outfit } from '@/stores/useGameStore';
import { SKIN_COLOR, useFaceTexture } from './useFaceTexture';

/**
 * The visual toddler avatar: a big round head with the child's photo (or a
 * cartoon face) on the front, a chunky body, and swappable outfits. It is
 * driven by an optional `motion` ref from <Player>. Without one it plays a
 * friendly idle wave, used by the title screen preview.
 *
 * Origin is at the feet; total height is ~1.4 units to match the capsule.
 */

export interface AvatarMotion {
  /** Horizontal speed as a share of max speed (0..1). */
  speed: number;
  /** Vertical velocity (units/s). */
  vy: number;
  grounded: boolean;
  /** -1 = moving left, 1 = moving right, 0 = facing the camera. */
  facing: number;
  respawning: boolean;
}

export const createAvatarMotion = (): AvatarMotion => ({
  speed: 0,
  vy: 0,
  grounded: true,
  facing: 0,
  respawning: false,
});

/* ------------------------------- Geometry -------------------------------- */

const HEAD_RADIUS = 0.34;
const HEAD_Y = 1.04;
const FACE_ANGLE = 0.95;

/**
 * A spherical cap on the front (+Z) of the head with planar UVs, so a flat
 * face image projects onto it without the stretching of spherical UVs.
 */
function createFaceCapGeometry(radius: number, angle: number): SphereGeometry {
  const geometry = new SphereGeometry(radius, 48, 24, 0, Math.PI * 2, 0, angle);
  geometry.rotateX(Math.PI / 2); // move the cap from +Y to +Z
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const extent = 2 * radius * Math.sin(angle);
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, 0.5 + pos.getX(i) / extent, 0.5 + pos.getY(i) / extent);
  }
  uv.needsUpdate = true;
  return geometry;
}

/** A sphere with a round opening facing +Z: hoods and hair. */
function createShellGeometry(radius: number, opening: number): SphereGeometry {
  const geometry = new SphereGeometry(radius, 40, 28, 0, Math.PI * 2, opening, Math.PI - opening);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

const geo = {
  head: new SphereGeometry(HEAD_RADIUS, 40, 28),
  face: createFaceCapGeometry(HEAD_RADIUS * 1.006, FACE_ANGLE),
  hood: createShellGeometry(0.4, 1.0),
  hair: createShellGeometry(HEAD_RADIUS * 1.04, 1.2),
  torso: new CapsuleGeometry(0.24, 0.16, 8, 20),
  arm: new CapsuleGeometry(0.075, 0.18, 6, 12),
  leg: new CapsuleGeometry(0.095, 0.12, 6, 12),
  ball: new SphereGeometry(1, 24, 16),
};

/* -------------------------------- Palette -------------------------------- */

interface OutfitPalette {
  top: string;
  bottom: string;
  arms: string;
  legs: string;
  feet: string;
  accent: string;
}

const PALETTES: Record<Outfit, OutfitPalette> = {
  onesie: { top: '#a78bfa', bottom: '#a78bfa', arms: '#a78bfa', legs: '#a78bfa', feet: '#8b5cf6', accent: '#ede9fe' },
  explorer: { top: '#d6b97b', bottom: '#8b5a2b', arms: SKIN_COLOR, legs: SKIN_COLOR, feet: '#6b3a1e', accent: '#ef4444' },
};

/* ------------------------------- Component ------------------------------- */

interface PlayerAvatarProps {
  motion?: RefObject<AvatarMotion>;
  /** Override the store (handy for previews of the other outfit). */
  outfit?: Outfit;
  faceUrl?: string | null;
}

export default function PlayerAvatar({ motion, outfit: outfitProp, faceUrl: faceProp }: PlayerAvatarProps) {
  const storeOutfit = useGameStore((s) => s.outfit);
  const storeFace = useGameStore((s) => s.faceTextureUrl);
  const outfit = outfitProp ?? storeOutfit;
  const faceTexture = useFaceTexture(faceProp === undefined ? storeFace : faceProp);
  const palette = PALETTES[outfit];

  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const bubble = useRef<Mesh>(null);
  const anim = useRef({ phase: 0, squash: 0, wasGrounded: true, yaw: 0, air: 0 });

  const materials = useMemo(
    () => ({
      skin: { color: SKIN_COLOR, roughness: 0.75 },
      top: { color: palette.top, roughness: 0.8 },
      bottom: { color: palette.bottom, roughness: 0.8 },
      arms: { color: palette.arms, roughness: 0.8 },
      legs: { color: palette.legs, roughness: 0.8 },
      feet: { color: palette.feet, roughness: 0.7 },
      accent: { color: palette.accent, roughness: 0.7 },
    }),
    [palette],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const m = motion?.current;
    const a = anim.current;

    const speed = m ? m.speed : 0;
    const grounded = m ? m.grounded : true;
    const respawning = m ? m.respawning : false;

    // Landing squash.
    if (grounded && !a.wasGrounded && m && !respawning) a.squash = Math.min(1, Math.abs(m.vy) / 10 + 0.4);
    a.wasGrounded = grounded;
    a.squash = MathUtils.damp(a.squash, 0, 9, dt);

    a.air = MathUtils.damp(a.air, grounded || respawning ? 0 : 1, 12, dt);
    a.phase += dt * (6 + speed * 8) * (grounded ? 1 : 0.2);

    // Turn partly towards the movement direction, but keep the face visible:
    // seeing their own face is the point for the child.
    const targetYaw = m ? m.facing * 0.65 : Math.sin(t * 0.6) * 0.25;
    a.yaw = MathUtils.damp(a.yaw, targetYaw, 10, dt);
    if (root.current) root.current.rotation.y = a.yaw;

    if (body.current) {
      const bob = grounded ? Math.abs(Math.sin(a.phase)) * 0.06 * speed : 0;
      const breathe = Math.sin(t * 2.2) * 0.015 * (1 - speed);
      const stretch = m && !grounded ? MathUtils.clamp(m.vy * 0.012, -0.08, 0.1) : 0;
      body.current.position.y = bob;
      body.current.scale.set(1 + a.squash * 0.12, 1 - a.squash * 0.16 + breathe + stretch, 1 + a.squash * 0.12);
    }

    if (head.current) {
      head.current.rotation.z = Math.sin(a.phase) * 0.06 * speed;
      head.current.rotation.x = -a.air * 0.12 + Math.sin(t * 1.7) * 0.03;
    }

    const swing = Math.sin(a.phase) * 0.9 * speed;
    if (legL.current && legR.current) {
      legL.current.rotation.x = swing * (1 - a.air) - a.air * 0.6;
      legR.current.rotation.x = -swing * (1 - a.air) + a.air * 0.3;
    }
    if (armL.current && armR.current) {
      const raise = a.air * 2.3;
      armL.current.rotation.x = -swing * 0.8 * (1 - a.air);
      armR.current.rotation.x = swing * 0.8 * (1 - a.air);
      armL.current.rotation.z = -0.15 - raise;
      if (m) {
        armR.current.rotation.z = 0.15 + raise;
      } else {
        // Title-screen wave.
        armR.current.rotation.z = 2.4 + Math.sin(t * 7) * 0.35;
      }
    }

    if (bubble.current) {
      const material = bubble.current.material as MeshStandardMaterial;
      material.opacity = MathUtils.damp(material.opacity, respawning ? 0.35 : 0, 8, dt);
      bubble.current.visible = material.opacity > 0.01;
      bubble.current.scale.setScalar(0.95 + Math.sin(t * 5) * 0.03);
    }
  });

  return (
    <group ref={root}>
      <group ref={body}>
        {/* Torso */}
        <mesh geometry={geo.torso} position={[0, 0.52, 0]} castShadow>
          <meshStandardMaterial {...materials.top} />
        </mesh>

        {outfit === 'onesie' ? (
          <>
            {/* Belly patch */}
            <mesh geometry={geo.ball} position={[0, 0.48, 0.19]} scale={[0.15, 0.17, 0.07]}>
              <meshStandardMaterial {...materials.accent} />
            </mesh>
            {/* Pom-pom tail */}
            <mesh geometry={geo.ball} position={[0, 0.32, -0.24]} scale={0.08}>
              <meshStandardMaterial {...materials.accent} />
            </mesh>
          </>
        ) : (
          <>
            {/* Shorts and belt */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <cylinderGeometry args={[0.245, 0.25, 0.16, 20]} />
              <meshStandardMaterial {...materials.bottom} />
            </mesh>
            <mesh position={[0, 0.39, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.245, 0.025, 8, 24]} />
              <meshStandardMaterial color="#5b3416" roughness={0.6} />
            </mesh>
            {/* Scarf */}
            <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.17, 0.055, 10, 24]} />
              <meshStandardMaterial {...materials.accent} />
            </mesh>
            {/* Backpack */}
            <RoundedBox args={[0.34, 0.36, 0.16]} radius={0.05} smoothness={3} position={[0, 0.56, -0.27]} castShadow>
              <meshStandardMaterial color="#16a34a" roughness={0.8} />
            </RoundedBox>
          </>
        )}

        {/* Arms (pivot at the shoulder) */}
        {([
          [armL, -1],
          [armR, 1],
        ] as const).map(([ref, side]) => (
          <group key={side} ref={ref} position={[side * 0.29, 0.72, 0]}>
            <mesh geometry={geo.arm} position={[0, -0.14, 0]} castShadow>
              <meshStandardMaterial {...materials.arms} />
            </mesh>
            <mesh geometry={geo.ball} position={[0, -0.29, 0]} scale={0.085} castShadow>
              <meshStandardMaterial {...materials.skin} />
            </mesh>
          </group>
        ))}

        {/* Legs (pivot at the hip) */}
        {([
          [legL, -1],
          [legR, 1],
        ] as const).map(([ref, side]) => (
          <group key={side} ref={ref} position={[side * 0.12, 0.33, 0]}>
            <mesh geometry={geo.leg} position={[0, -0.12, 0]} castShadow>
              <meshStandardMaterial {...materials.legs} />
            </mesh>
            <mesh geometry={geo.ball} position={[0, -0.26, 0.04]} scale={[0.12, 0.075, 0.16]} castShadow>
              <meshStandardMaterial {...materials.feet} />
            </mesh>
          </group>
        ))}

        {/* Head */}
        <group ref={head} position={[0, HEAD_Y, 0]}>
          <mesh geometry={geo.head} castShadow>
            <meshStandardMaterial {...materials.skin} />
          </mesh>
          <mesh geometry={geo.face}>
            <meshStandardMaterial
              map={faceTexture}
              transparent
              roughness={0.85}
              polygonOffset
              polygonOffsetFactor={-2}
              depthWrite={false}
            />
          </mesh>

          {outfit === 'onesie' ? (
            <>
              <mesh geometry={geo.hood} castShadow>
                <meshStandardMaterial {...materials.top} side={DoubleSide} />
              </mesh>
              <mesh position={[0, 0, 0.22]}>
                <torusGeometry args={[0.345, 0.045, 10, 40]} />
                <meshStandardMaterial {...materials.accent} />
              </mesh>
              {[-1, 1].map((side) => (
                <group key={side} position={[side * 0.25, 0.3, -0.05]}>
                  <mesh geometry={geo.ball} scale={0.11} castShadow>
                    <meshStandardMaterial {...materials.top} />
                  </mesh>
                  <mesh geometry={geo.ball} position={[0, 0, 0.06]} scale={[0.065, 0.065, 0.04]}>
                    <meshStandardMaterial color="#f9a8d4" roughness={0.8} />
                  </mesh>
                </group>
              ))}
            </>
          ) : (
            <>
              <group rotation={[0.3, 0, 0]}>
                <mesh geometry={geo.hair}>
                  <meshStandardMaterial color="#3b2416" roughness={0.9} side={DoubleSide} />
                </mesh>
              </group>
              {/* Safari hat, tilted back so the face stays visible */}
              <group position={[0, 0.27, -0.03]} rotation={[-0.18, 0, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.5, 0.5, 0.035, 32]} />
                  <meshStandardMaterial color="#a16207" roughness={0.85} />
                </mesh>
                <mesh position={[0, 0.11, 0]} castShadow>
                  <cylinderGeometry args={[0.25, 0.3, 0.2, 24]} />
                  <meshStandardMaterial color="#ca8a04" roughness={0.85} />
                </mesh>
                <mesh position={[0, 0.045, 0]}>
                  <cylinderGeometry args={[0.305, 0.305, 0.05, 24]} />
                  <meshStandardMaterial color="#7c2d12" roughness={0.7} />
                </mesh>
              </group>
            </>
          )}
        </group>
      </group>

      {/* Respawn bubble */}
      <mesh ref={bubble} geometry={geo.ball} position={[0, 0.72, 0]} visible={false}>
        <meshStandardMaterial color="#7dd3fc" transparent opacity={0} roughness={0.1} metalness={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}
