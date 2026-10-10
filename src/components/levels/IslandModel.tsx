import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { createRandom, randomRange } from '@/utils/random';
import { IslandScatter } from './Decorations';

/**
 * The look of a floating island, without physics: a rounded grass slab on a
 * dirt block with faceted rock stalactites hanging below, like a little
 * diorama tile. `position` is the centre of the top surface.
 */

export interface IslandModelProps {
  position: [number, number, number];
  width: number;
  depth?: number;
  thickness?: number;
  seed?: number;
  grass?: string;
  decorate?: boolean;
  trees?: boolean;
}

const GRASS_HEIGHT = 0.35;

export default function IslandModel({
  position,
  width,
  depth = 3,
  thickness = 1.6,
  seed = 1,
  grass = '#4ade80',
  decorate = true,
  trees = true,
}: IslandModelProps) {
  const rocks = useMemo(() => {
    const random = createRandom(seed * 7919);
    const count = Math.max(1, Math.round(width / 3));
    return Array.from({ length: count }, (_, i) => {
      const spacing = width / count;
      return {
        x: -width / 2 + spacing * (i + 0.5) + randomRange(random, -spacing * 0.15, spacing * 0.15),
        radius: Math.min(spacing * 0.55, depth * 0.45) * randomRange(random, 0.85, 1.1),
        height: randomRange(random, 1.4, 2.6) * Math.min(1, width / 4 + 0.4),
        twist: random() * Math.PI,
      };
    });
  }, [width, depth, seed]);

  const dirtHeight = thickness - GRASS_HEIGHT;

  return (
    <group position={position}>
      <RoundedBox args={[width, GRASS_HEIGHT, depth]} radius={0.14} smoothness={3} position={[0, -GRASS_HEIGHT / 2, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={grass} roughness={0.9} />
      </RoundedBox>
      <RoundedBox
        args={[width * 0.97, dirtHeight, depth * 0.94]}
        radius={0.12}
        smoothness={2}
        position={[0, -GRASS_HEIGHT - dirtHeight / 2 + 0.05, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#b45309" roughness={1} />
      </RoundedBox>
      {rocks.map((rock, i) => (
        <mesh key={i} position={[rock.x, -thickness - rock.height / 2 + 0.1, 0]} rotation={[Math.PI, rock.twist, 0]} castShadow>
          <coneGeometry args={[rock.radius, rock.height, 6, 1]} />
          <meshStandardMaterial color={i % 2 ? '#78350f' : '#92400e'} flatShading roughness={1} />
        </mesh>
      ))}

      {decorate && <IslandScatter width={width} depth={depth} seed={seed} trees={trees} />}
    </group>
  );
}
