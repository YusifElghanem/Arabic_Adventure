import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { RigidBody, TrimeshCollider, type CollisionEnterPayload } from '@react-three/rapier';
import { MathUtils, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { isPlayer, playerTracker } from '@/game/playerTracker';
import { selectIsLetterComplete, useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import { speakArabic } from '@/utils/speech';
import { createLetterStrokeGeometry, toTrimeshArgs } from '@/utils/strokeShape';

/**
 * The letter ب as a chunky, bouncy bowl. It works as a trampoline: any touch
 * from the child launches them high into the air with a squash-and-stretch
 * "boing". Its dot starts as a faint ghost. When the Mystery Block's
 * glowing dot arrives, it snaps into place and the letter celebrates.
 */

/** Centre line of the ب bowl, drawn right to left as written. */
const BOWL_POINTS: [number, number][] = [
  [1.95, 0.5],
  [1.8, 0.12],
  [1.25, -0.08],
  [0, -0.13],
  [-1.25, -0.08],
  [-1.9, 0.12],
  [-2.1, 0.45],
];
const STROKE_WIDTH = 0.42;
const DEPTH = 0.9;

/** Where the dot sits, relative to the letter's origin. Exported so levels can aim particles at it. */
export const LETTER_B_DOT_OFFSET: [number, number, number] = [0, -0.78, 0];
const DOT_RADIUS = 0.24;
/** Upward speed given to the child: apex ≈ 15.5² / 44 ≈ 5.5 units. */
export const LETTER_B_LAUNCH_SPEED = 15.5;

const COLOR = '#38bdf8';
const COLOR_COMPLETE = '#0ea5e9';

interface LetterBProps {
  position: [number, number, number];
}

export default function LetterB({ position }: LetterBProps) {
  const geometry = useMemo(() => createLetterStrokeGeometry(BOWL_POINTS, { width: STROKE_WIDTH, depth: DEPTH }), []);
  const [vertices, indices] = useMemo(() => toTrimeshArgs(geometry), [geometry]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const complete = useGameStore(selectIsLetterComplete);
  const discoverLetter = useGameStore((s) => s.discoverLetter);

  const visual = useRef<Group>(null);
  const ghost = useRef<Mesh>(null);
  const dot = useRef<Mesh>(null);
  const bowlMaterial = useRef<MeshStandardMaterial>(null);
  // Spring state for squash-and-stretch, plus celebration timers.
  const spring = useRef({ value: 0, velocity: 0, lastLaunch: -Infinity, celebrate: 0, dotPop: 0 });

  const wasComplete = useRef(complete);
  useEffect(() => {
    if (complete && !wasComplete.current) {
      spring.current.celebrate = 1;
      spring.current.dotPop = 1;
      playSound('pop');
      discoverLetter('ب');
      window.setTimeout(() => speakArabic('باء'), 350);
    }
    wasComplete.current = complete;
  }, [complete, discoverLetter]);

  const onCollisionEnter = ({ other }: CollisionEnterPayload) => {
    if (!isPlayer(other) || playerTracker.respawning) return;
    const now = performance.now();
    // Debounce: a capsule can touch several triangles in the same instant.
    if (now - spring.current.lastLaunch < 250) return;
    // Launch only when the child is above the bowl's base, not when they bump its underside.
    if (playerTracker.position.y < position[1] - 0.3) return;
    spring.current.lastLaunch = now;
    spring.current.velocity -= 9;
    playerTracker.launch(LETTER_B_LAUNCH_SPEED);
    playSound('boing');
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const s = spring.current;

    // Damped spring back to rest.
    s.velocity += (-90 * s.value - 9 * s.velocity) * dt;
    s.value += s.velocity * dt;

    const idle = Math.sin(t * 2.4) * 0.03;
    s.celebrate = Math.max(0, s.celebrate - dt * 0.8);
    s.dotPop = Math.max(0, s.dotPop - dt * 2.5);

    if (visual.current) {
      const squash = s.value + idle;
      visual.current.scale.set(1 - squash * 0.35, 1 + squash, 1 - squash * 0.35);
      visual.current.rotation.z = Math.sin(s.celebrate * Math.PI * 4) * 0.12 * s.celebrate;
      visual.current.position.y = Math.sin(s.celebrate * Math.PI) * 0.4;
    }

    if (ghost.current) {
      const material = ghost.current.material as MeshStandardMaterial;
      material.opacity = complete ? 0 : 0.35 + Math.sin(t * 3) * 0.15;
      ghost.current.visible = !complete;
      ghost.current.scale.setScalar(DOT_RADIUS * (1 + Math.sin(t * 3) * 0.08));
    }
    if (dot.current) {
      dot.current.visible = complete;
      dot.current.scale.setScalar(DOT_RADIUS * (1 + s.dotPop * 0.8));
    }
    if (bowlMaterial.current) {
      bowlMaterial.current.emissiveIntensity = MathUtils.damp(
        bowlMaterial.current.emissiveIntensity,
        complete ? 0.25 + s.celebrate * 0.5 : 0.05,
        4,
        dt,
      );
    }
  });

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false} onCollisionEnter={onCollisionEnter}>
        <TrimeshCollider args={[vertices, indices]} friction={0.4} />
      </RigidBody>

      <group ref={visual}>
        <mesh geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial
            ref={bowlMaterial}
            color={complete ? COLOR_COMPLETE : COLOR}
            emissive={COLOR}
            emissiveIntensity={0.05}
            roughness={0.45}
          />
        </mesh>
      </group>

      <group position={LETTER_B_DOT_OFFSET}>
        {/* Ghost dot: a gentle "something goes here" hint. */}
        <mesh ref={ghost}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.4} emissive="#bae6fd" emissiveIntensity={0.6} depthWrite={false} />
        </mesh>
        <mesh ref={dot} visible={false} castShadow>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={1.2} roughness={0.3} />
        </mesh>
        {complete && <Sparkles count={18} scale={1.6} size={4} speed={0.6} color="#fef08a" />}
      </group>
    </group>
  );
}
