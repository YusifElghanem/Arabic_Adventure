import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { CuboidCollider, RigidBody, type IntersectionEnterPayload } from '@react-three/rapier';
import { MathUtils, type Group, type MeshStandardMaterial } from 'three';
import { isPlayer } from '@/game/playerTracker';
import { selectIsLetterComplete, useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import { speakArabic } from '@/utils/speech';

/**
 * A rainbow arch at the end of the level. It glows once the level's letter
 * is complete, and walking through it finishes the level. If the letter
 * still needs its dot, the arch gives a gentle wobble instead: a nudge,
 * never a "no".
 */

const BANDS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#60a5fa', '#a78bfa'];
const RADIUS = 2.1;
const BAND = 0.16;

interface GoalGateProps {
  position: [number, number, number];
}

export default function GoalGate({ position }: GoalGateProps) {
  const ready = useGameStore(selectIsLetterComplete);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const arch = useRef<Group>(null);
  const materials = useRef<(MeshStandardMaterial | null)[]>([]);
  const anim = useRef({ wobble: 0, lastHint: -Infinity, done: false });

  const onIntersectionEnter = ({ other }: IntersectionEnterPayload) => {
    if (!isPlayer(other) || anim.current.done) return;
    if (!useGameStore.getState().session) return;
    if (selectIsLetterComplete(useGameStore.getState())) {
      anim.current.done = true;
      playSound('win');
      window.setTimeout(() => speakArabic('أحسنت'), 300);
      completeLevel();
      return;
    }
    const now = performance.now();
    if (now - anim.current.lastHint > 1500) {
      anim.current.lastHint = now;
      anim.current.wobble = 1;
      playSound('tap');
    }
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const a = anim.current;
    a.wobble = Math.max(0, a.wobble - dt * 1.5);
    if (arch.current) {
      arch.current.rotation.z = Math.sin(a.wobble * Math.PI * 6) * 0.06 * a.wobble;
      arch.current.scale.setScalar(ready ? 1 + Math.sin(t * 3) * 0.02 : 1);
    }
    for (const material of materials.current) {
      if (!material) continue;
      material.emissiveIntensity = MathUtils.damp(material.emissiveIntensity, ready ? 0.55 : 0.04, 3, dt);
      material.opacity = MathUtils.damp(material.opacity, ready ? 1 : 0.55, 3, dt);
    }
  });

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.6, 1.6, 1.5]} position={[0, 1.6, 0]} sensor onIntersectionEnter={onIntersectionEnter} />
      </RigidBody>

      <group ref={arch} position={[0, 0, -0.4]}>
        {BANDS.map((color, i) => (
          <mesh key={color} castShadow>
            <torusGeometry args={[RADIUS - i * BAND, BAND / 2 + 0.01, 10, 48, Math.PI]} />
            <meshStandardMaterial
              ref={(m) => {
                materials.current[i] = m;
              }}
              color={color}
              emissive={color}
              emissiveIntensity={0.04}
              roughness={0.5}
              transparent
              opacity={0.55}
            />
          </mesh>
        ))}
        {/* Fluffy cloud feet */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * (RADIUS - BAND * 2.5), 0.15, 0]}>
            {[[0, 0, 0, 0.42], [0.3, -0.05, 0.1, 0.3], [-0.3, -0.05, 0.1, 0.3]].map(([x, y, z, r], j) => (
              <mesh key={j} position={[x, y, z]} castShadow>
                <icosahedronGeometry args={[r, 1]} />
                <meshStandardMaterial color="#ffffff" roughness={0.9} flatShading />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      {ready && <Sparkles count={40} scale={[4, 3.5, 1.5]} position={[0, 1.6, -0.4]} size={5} speed={0.6} color="#fff7ed" />}
    </group>
  );
}
