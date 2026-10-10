import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { BallCollider, RigidBody, type IntersectionEnterPayload } from '@react-three/rapier';
import { ExtrudeGeometry, Shape, type Group, type MeshStandardMaterial } from 'three';
import { isPlayer } from '@/game/playerTracker';
import { useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';

/** A chubby spinning star. Touching it collects it with a sparkly burst. */

function createStarGeometry(): ExtrudeGeometry {
  const shape = new Shape();
  const points = 5;
  for (let i = 0; i <= points * 2; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.24;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.07,
    bevelSegments: 3,
  });
  geometry.center();
  return geometry;
}

// One shared geometry for every star in the scene.
let sharedStarGeometry: ExtrudeGeometry | null = null;

interface StarProps {
  position: [number, number, number];
}

export default function Star({ position }: StarProps) {
  const geometry = useMemo(() => (sharedStarGeometry ??= createStarGeometry()), []);
  const collectStar = useGameStore((s) => s.collectStar);
  const [collected, setCollected] = useState(false);
  const [gone, setGone] = useState(false);
  const star = useRef<Group>(null);
  const material = useRef<MeshStandardMaterial>(null);
  const burst = useRef(0);

  const onIntersectionEnter = ({ other }: IntersectionEnterPayload) => {
    if (collected || !isPlayer(other)) return;
    setCollected(true);
    collectStar();
    playSound('collect');
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (!star.current) return;
    if (!collected) {
      star.current.rotation.y = t * 1.8 + position[0];
      star.current.position.y = Math.sin(t * 2.2 + position[0]) * 0.15;
      return;
    }
    // Collected: zoom up, spin fast, then fade away.
    burst.current = Math.min(1, burst.current + dt * 1.8);
    const b = burst.current;
    star.current.rotation.y += dt * 18;
    star.current.position.y = b * 1.6;
    star.current.scale.setScalar(1 + Math.sin(b * Math.PI) * 0.6 - b * 0.9);
    if (material.current) material.current.opacity = 1 - b;
    if (b >= 1 && !gone) setGone(true);
  });

  if (gone) return null;

  return (
    <group position={position}>
      {!collected && (
        <RigidBody type="fixed" colliders={false}>
          <BallCollider args={[0.65]} sensor onIntersectionEnter={onIntersectionEnter} />
        </RigidBody>
      )}
      <group ref={star}>
        <mesh geometry={geometry} castShadow>
          <meshStandardMaterial
            ref={material}
            color="#facc15"
            emissive="#f59e0b"
            emissiveIntensity={0.45}
            roughness={0.35}
            metalness={0.1}
            transparent
          />
        </mesh>
      </group>
      <Sparkles count={collected ? 30 : 8} scale={collected ? 2.4 : 1.4} size={collected ? 6 : 3} speed={collected ? 2 : 0.5} color="#fef9c3" />
    </group>
  );
}
