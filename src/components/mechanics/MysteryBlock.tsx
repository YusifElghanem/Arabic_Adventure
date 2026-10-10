import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Sparkles } from '@react-three/drei';
import { CuboidCollider, RigidBody, type CollisionEnterPayload } from '@react-three/rapier';
import { CanvasTexture, MathUtils, SRGBColorSpace, Vector3, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { PLAYER_FOOT_OFFSET } from '@/game/constants';
import { isPlayer, playerTracker } from '@/game/playerTracker';
import { useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';

/**
 * A glowing gift block. When the child bonks it from below, it bounces and
 * releases a bright dot. The dot arcs through the air and snaps into place
 * under the Letter B bowl, completing the letter ب.
 */

const SIZE = 1;
const FLIGHT_SECONDS = 1.5;

/** Front-face artwork: a bright dot with sparkle rays, hinting at what's inside. */
function createFaceTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, '#fcd34d');
    g.addColorStop(1, '#f59e0b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r1 = i % 2 ? 62 : 72;
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(a) * 48, 128 + Math.sin(a) * 48);
      ctx.lineTo(128 + Math.cos(a) * (r1 + 20), 128 + Math.sin(a) * (r1 + 20));
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(128, 128, 34, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

interface MysteryBlockProps {
  position: [number, number, number];
  /** World position the released dot flies to (the Letter B dot slot). */
  dotTarget: [number, number, number];
}

export default function MysteryBlock({ position, dotTarget }: MysteryBlockProps) {
  const collectLetterDot = useGameStore((s) => s.collectLetterDot);
  const faceTexture = useMemo(createFaceTexture, []);
  useEffect(() => () => faceTexture.dispose(), [faceTexture]);

  const [used, setUsed] = useState(false);
  const [flying, setFlying] = useState(false);
  const block = useRef<Group>(null);
  const blockMaterial = useRef<MeshStandardMaterial>(null);
  const particle = useRef<Group>(null);
  const particleCore = useRef<Mesh>(null);
  const anim = useRef({ bump: 0, flight: 0, delivered: false });

  const path = useMemo(() => {
    const start = new Vector3(position[0], position[1] + SIZE * 0.7, position[2] + 0.2);
    const end = new Vector3(...dotTarget);
    const control = start.clone().lerp(end, 0.5);
    control.y = Math.max(start.y, end.y) + 3;
    return { start, control, end, point: new Vector3() };
  }, [position, dotTarget]);

  const onCollisionEnter = ({ other }: CollisionEnterPayload) => {
    if (used || !isPlayer(other)) return;
    // Only a hit from underneath counts: the child's head is below the block's base.
    const headY = playerTracker.position.y + PLAYER_FOOT_OFFSET;
    if (headY > position[1] - SIZE * 0.25) return;
    setUsed(true);
    setFlying(true);
    anim.current.bump = 1;
    anim.current.flight = 0;
    playSound('bump');
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const a = anim.current;
    const t = state.clock.elapsedTime;

    a.bump = Math.max(0, a.bump - dt * 4);
    if (block.current) {
      block.current.position.y = Math.sin(a.bump * Math.PI) * 0.35;
      block.current.rotation.y = used ? 0 : Math.sin(t * 1.5) * 0.12;
    }
    if (blockMaterial.current) {
      blockMaterial.current.emissiveIntensity = used ? 0.05 : 0.35 + Math.sin(t * 4) * 0.15;
    }

    if (!flying || a.delivered || !particle.current) return;
    // Hold the dot mid-air while paused, so the letter never misses its dot.
    if (useGameStore.getState().screen !== 'playing') return;

    a.flight = Math.min(1, a.flight + dt / FLIGHT_SECONDS);
    const u = MathUtils.smootherstep(a.flight, 0, 1);
    const { start, control, end, point } = path;
    // Quadratic Bézier from the block, up over, and down onto the letter.
    point
      .copy(start)
      .multiplyScalar((1 - u) * (1 - u))
      .addScaledVector(control, 2 * (1 - u) * u)
      .addScaledVector(end, u * u);
    particle.current.position.copy(point);
    particleCore.current?.scale.setScalar(0.22 * (1 + Math.sin(t * 18) * 0.12));

    if (a.flight >= 1) {
      // Guard against a second frame running before React re-renders.
      a.delivered = true;
      setFlying(false);
      collectLetterDot();
    }
  });

  return (
    <>
      <RigidBody type="fixed" colliders={false} position={position}>
        <CuboidCollider args={[SIZE / 2, SIZE / 2, SIZE / 2]} onCollisionEnter={onCollisionEnter} />
        <group ref={block}>
          <RoundedBox args={[SIZE, SIZE, SIZE]} radius={0.12} smoothness={4} castShadow receiveShadow>
            <meshStandardMaterial
              ref={blockMaterial}
              color={used ? '#fde68a' : '#fbbf24'}
              emissive="#f59e0b"
              emissiveIntensity={0.35}
              roughness={0.5}
            />
          </RoundedBox>
          {!used && (
            <mesh position={[0, 0, SIZE / 2 + 0.002]}>
              <planeGeometry args={[SIZE * 0.82, SIZE * 0.82]} />
              <meshStandardMaterial map={faceTexture} roughness={0.5} emissive="#ffffff" emissiveMap={faceTexture} emissiveIntensity={0.25} />
            </mesh>
          )}
        </group>
        {!used && <Sparkles count={10} scale={[1.6, 1.6, 1.6]} size={3} speed={0.4} color="#fff7cc" />}
      </RigidBody>

      {flying && (
        <group ref={particle} position={path.start}>
          <mesh ref={particleCore}>
            <sphereGeometry args={[1, 20, 14]} />
            <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <Sparkles count={24} scale={1.2} size={5} speed={2} color="#fde047" />
        </group>
      )}
    </>
  );
}
