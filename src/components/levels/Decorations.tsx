import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { createRandom, randomRange } from '@/utils/random';

/** Low-poly scenery in the faceted "floating diorama" style. No physics. */

const flat = { flatShading: true, roughness: 0.9 } as const;

export function Tree({ position, scale = 1, variant = 0 }: { position: [number, number, number]; scale?: number; variant?: number }) {
  const leaves = ['#22c55e', '#16a34a', '#4ade80'][variant % 3];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.13, 0.7, 6]} />
        <meshStandardMaterial color="#92400e" {...flat} />
      </mesh>
      {variant % 2 === 0 ? (
        <>
          <mesh position={[0, 1.0, 0]} castShadow>
            <coneGeometry args={[0.55, 0.9, 7]} />
            <meshStandardMaterial color={leaves} {...flat} />
          </mesh>
          <mesh position={[0, 1.5, 0]} castShadow>
            <coneGeometry args={[0.4, 0.7, 7]} />
            <meshStandardMaterial color={leaves} {...flat} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, 1.1, 0]} castShadow>
          <icosahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial color={leaves} {...flat} />
        </mesh>
      )}
    </group>
  );
}

export function Flower({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.24, 4]} />
        <meshStandardMaterial color="#15803d" {...flat} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <icosahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial color={color} {...flat} />
      </mesh>
      <mesh position={[0, 0.27, 0.03]}>
        <icosahedronGeometry args={[0.035, 0]} />
        <meshStandardMaterial color="#fde047" {...flat} />
      </mesh>
    </group>
  );
}

export function Rock({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <mesh position={position} scale={[scale, scale * 0.7, scale]} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.25, 0]} />
      <meshStandardMaterial color="#a8a29e" {...flat} />
    </mesh>
  );
}

/** A puffy faceted cloud that drifts slowly back and forth. */
export function Cloud({ position, scale = 1, seed = 1 }: { position: [number, number, number]; scale?: number; seed?: number }) {
  const ref = useRef<Group>(null);
  const puffs = useMemo(() => {
    const random = createRandom(seed);
    const count = 4 + Math.floor(random() * 3);
    return Array.from({ length: count }, (_, i) => ({
      x: (i - (count - 1) / 2) * 0.55 + randomRange(random, -0.1, 0.1),
      y: randomRange(random, -0.1, 0.25),
      z: randomRange(random, -0.2, 0.2),
      r: randomRange(random, 0.4, 0.7) * (1 - Math.abs(i - (count - 1) / 2) / count),
    }));
  }, [seed]);

  useFrame((state) => {
    if (ref.current) ref.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 0.08 + seed) * 1.5;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <icosahedronGeometry args={[p.r + 0.2, 1]} />
          <meshStandardMaterial color="#ffffff" {...flat} />
        </mesh>
      ))}
    </group>
  );
}

const FLOWER_COLORS = ['#f472b6', '#f87171', '#ffffff', '#a78bfa', '#fb923c'];

/** Scatters trees, flowers and rocks across an island top, away from the walking lane. */
export function IslandScatter({ width, depth, seed, trees = true }: { width: number; depth: number; seed: number; trees?: boolean }) {
  const items = useMemo(() => {
    const random = createRandom(seed);
    const halfW = width / 2 - 0.5;
    const out: { kind: 'tree' | 'flower' | 'rock'; pos: [number, number, number]; scale: number; variant: number; color: string }[] = [];
    // Trees stay at the back so they never hide the child.
    const treeCount = trees ? Math.max(1, Math.floor(width / 3.5)) : 0;
    for (let i = 0; i < treeCount; i++) {
      out.push({
        kind: 'tree',
        pos: [randomRange(random, -halfW, halfW), 0, randomRange(random, -depth / 2 + 0.35, -depth / 2 + 0.7)],
        scale: randomRange(random, 0.8, 1.25),
        variant: Math.floor(random() * 3),
        color: '',
      });
    }
    const flowerCount = Math.floor(width * 1.2);
    for (let i = 0; i < flowerCount; i++) {
      const front = random() > 0.5;
      out.push({
        kind: 'flower',
        pos: [
          randomRange(random, -halfW, halfW),
          0,
          front ? randomRange(random, 0.75, depth / 2 - 0.15) : randomRange(random, -depth / 2 + 0.15, -0.75),
        ],
        scale: 1,
        variant: 0,
        color: FLOWER_COLORS[Math.floor(random() * FLOWER_COLORS.length)],
      });
    }
    const rockCount = Math.floor(width / 4);
    for (let i = 0; i < rockCount; i++) {
      out.push({
        kind: 'rock',
        pos: [randomRange(random, -halfW, halfW), 0.08, randomRange(random, 0.8, depth / 2 - 0.2)],
        scale: randomRange(random, 0.6, 1.2),
        variant: 0,
        color: '',
      });
    }
    return out;
  }, [width, depth, seed, trees]);

  return (
    <>
      {items.map((item, i) =>
        item.kind === 'tree' ? (
          <Tree key={i} position={item.pos} scale={item.scale} variant={item.variant} />
        ) : item.kind === 'flower' ? (
          <Flower key={i} position={item.pos} color={item.color} />
        ) : (
          <Rock key={i} position={item.pos} scale={item.scale} />
        ),
      )}
    </>
  );
}
