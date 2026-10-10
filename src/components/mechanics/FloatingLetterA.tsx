import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import { CuboidCollider, RigidBody, type IntersectionEnterPayload } from '@react-three/rapier';
import { MathUtils, type Group } from 'three';
import { isPlayer } from '@/game/playerTracker';
import { useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import { speakArabic } from '@/utils/speech';
import { createLetterStrokeGeometry } from '@/utils/strokeShape';
import Lion from './Lion';

/**
 * A giant, smiling letter أ (alef with hamza) floating above the island,
 * with its word-friend the lion (أسد). When the child walks up, the letter
 * spins happily, the lion roars, and the device says "ألف… أسد" where an
 * Arabic voice is available.
 */

const ALEF_POINTS: [number, number][] = [
  [0.08, -1.35],
  [0.02, 0],
  [-0.05, 1.35],
];
/** The hamza (ء): a small hook with a tail, sitting above the alef. */
const HAMZA_POINTS: [number, number][] = [
  [0.34, 2.42],
  [0.08, 2.48],
  [-0.06, 2.3],
  [0.1, 2.12],
  [0.44, 2.08],
  [-0.2, 1.9],
];
const DEPTH = 0.7;
const COLOR = '#f87171';

interface FloatingLetterAProps {
  /** Ground point the letter hovers over (the island surface). */
  position: [number, number, number];
  /** Lion position relative to `position`. */
  lionOffset?: [number, number, number];
}

export default function FloatingLetterA({ position, lionOffset = [2.2, 0, 0.6] }: FloatingLetterAProps) {
  const alef = useMemo(() => createLetterStrokeGeometry(ALEF_POINTS, { width: 0.62, depth: DEPTH }), []);
  const hamza = useMemo(() => createLetterStrokeGeometry(HAMZA_POINTS, { width: 0.16, depth: DEPTH * 0.7, samples: 40 }), []);
  useEffect(
    () => () => {
      alef.dispose();
      hamza.dispose();
    },
    [alef, hamza],
  );

  const discoverLetter = useGameStore((s) => s.discoverLetter);
  const [roarSignal, setRoarSignal] = useState(0);
  const [discovered, setDiscovered] = useState(false);
  const spin = useRef<Group>(null);
  const anim = useRef({ celebrate: 0, lastGreet: -Infinity });

  const onIntersectionEnter = ({ other }: IntersectionEnterPayload) => {
    if (!isPlayer(other)) return;
    const now = performance.now();
    // Greet at most every few seconds so walking back and forth isn't noisy.
    if (now - anim.current.lastGreet < 3500) return;
    anim.current.lastGreet = now;
    anim.current.celebrate = 1;
    setRoarSignal((n) => n + 1);
    setDiscovered(true);
    discoverLetter('أ');
    playSound('roar');
    window.setTimeout(() => speakArabic('ألف… أسد'), 450);
  };

  useFrame((_, delta) => {
    const a = anim.current;
    a.celebrate = Math.max(0, a.celebrate - Math.min(delta, 0.05) * 0.9);
    if (spin.current) {
      // One full happy spin with a hop, easing out.
      const progress = 1 - a.celebrate;
      spin.current.rotation.y = a.celebrate > 0 ? MathUtils.smootherstep(progress, 0, 1) * Math.PI * 2 : 0;
      spin.current.position.y = Math.sin(progress * Math.PI) * 0.6 * (a.celebrate > 0 ? 1 : 0);
    }
  });

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2.4, 2.2, 1.6]} position={[0.8, 2, 1.4]} sensor onIntersectionEnter={onIntersectionEnter} />
      </RigidBody>

      <group position={[0, 2.1, 0]} scale={1.25}>
        <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.9} floatingRange={[-0.15, 0.15]}>
          <group ref={spin}>
            <mesh geometry={alef} castShadow>
              <meshStandardMaterial color={COLOR} roughness={0.45} emissive={COLOR} emissiveIntensity={discovered ? 0.2 : 0.05} />
            </mesh>
            <mesh geometry={hamza} castShadow>
              <meshStandardMaterial color={COLOR} roughness={0.45} emissive={COLOR} emissiveIntensity={discovered ? 0.2 : 0.05} />
            </mesh>
            <LetterFace z={DEPTH / 2 + 0.02} />
          </group>
        </Float>
        {discovered && <Sparkles count={30} scale={[2.5, 4.5, 2]} size={4} speed={0.5} color="#fecaca" />}
      </group>

      <Lion position={lionOffset} rotationY={-0.25} roarSignal={roarSignal} />
    </group>
  );
}

/** Big friendly eyes, rosy cheeks and a smile on the front of the alef. */
function LetterFace({ z }: { z: number }) {
  return (
    <group position={[0, 0.45, z]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.15, 0.12, 0]}>
          <mesh scale={[0.12, 0.14, 0.06]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0.01, -0.01, 0.05]} scale={[0.07, 0.085, 0.04]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color="#1f2937" roughness={0.2} />
          </mesh>
          <mesh position={[0.035, 0.035, 0.085]} scale={0.022}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[side * 0.08, -0.25, -0.005]} scale={[0.07, 0.045, 0.02]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#fb7185" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Smile: the lower half of a torus */}
      <mesh position={[0, -0.12, 0]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.13, 0.03, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.5} />
      </mesh>
    </group>
  );
}
