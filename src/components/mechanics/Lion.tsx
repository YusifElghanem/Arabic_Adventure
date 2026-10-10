import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group, type Mesh } from 'three';

/**
 * A friendly low-poly lion (أسد) built from faceted primitives in the same
 * style as the floating islands. It idles (breathing, tail swish, head
 * tilt) and does a cute roar each time `roarSignal` changes.
 */

const BODY = '#f2b13c';
const MANE = '#c2410c';
const CREAM = '#fde7c0';
const DARK = '#3b1f12';

interface LionProps {
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  /** Increment to trigger a roar. */
  roarSignal?: number;
}

const flat = { flatShading: true, roughness: 0.85 } as const;

export default function Lion({ position = [0, 0, 0], rotationY = 0, scale = 1, roarSignal = 0 }: LionProps) {
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const mane = useRef<Mesh>(null);
  const mouth = useRef<Mesh>(null);
  const tail = useRef<Group>(null);
  const anim = useRef({ roar: 0, lastSignal: roarSignal });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const a = anim.current;
    if (roarSignal !== a.lastSignal) {
      a.lastSignal = roarSignal;
      a.roar = 1;
    }
    a.roar = Math.max(0, a.roar - dt * 1.4);
    const roar = Math.sin(Math.min(1, a.roar * 1.3) * Math.PI);

    if (body.current) body.current.scale.y = 1 + Math.sin(t * 2) * 0.02;
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 0.9) * 0.08;
      head.current.rotation.x = -roar * 0.25;
      head.current.scale.setScalar(1 + roar * 0.12);
    }
    if (mane.current) mane.current.scale.setScalar(1 + roar * 0.15 + Math.sin(t * 2) * 0.01);
    if (mouth.current) mouth.current.scale.y = MathUtils.lerp(0.04, 0.12, roar);
    if (tail.current) tail.current.rotation.z = 0.6 + Math.sin(t * 2.4) * 0.35;
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group ref={body}>
        {/* Body */}
        <mesh position={[0, 0.66, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.36, 0.55, 3, 7]} />
          <meshStandardMaterial color={BODY} {...flat} />
        </mesh>
        {/* Legs and paws */}
        {[
          [0.38, 0.17],
          [0.38, -0.17],
          [-0.38, 0.17],
          [-0.38, -0.17],
        ].map(([x, z]) => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.25, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.12, 0.45, 6]} />
              <meshStandardMaterial color={BODY} {...flat} />
            </mesh>
            <mesh position={[0, 0.06, 0.04]} castShadow>
              <dodecahedronGeometry args={[0.12, 0]} />
              <meshStandardMaterial color={CREAM} {...flat} />
            </mesh>
          </group>
        ))}
        {/* Tail */}
        <group ref={tail} position={[-0.75, 0.78, 0]}>
          <mesh position={[-0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.05, 0.5, 5]} />
            <meshStandardMaterial color={BODY} {...flat} />
          </mesh>
          <mesh position={[-0.52, 0, 0]}>
            <dodecahedronGeometry args={[0.11, 0]} />
            <meshStandardMaterial color={MANE} {...flat} />
          </mesh>
        </group>
      </group>

      {/* Head, turned towards the camera */}
      <group ref={head} position={[0.62, 1.05, 0.08]} rotation={[0, -0.9, 0]}>
        <mesh ref={mane} castShadow>
          <dodecahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color={MANE} {...flat} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.27, 0.32, 0.1]}>
            <icosahedronGeometry args={[0.1, 0]} />
            <meshStandardMaterial color={BODY} {...flat} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.16]} castShadow>
          <icosahedronGeometry args={[0.34, 1]} />
          <meshStandardMaterial color={BODY} {...flat} />
        </mesh>
        <mesh position={[0, -0.1, 0.4]} scale={[0.2, 0.14, 0.13]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={CREAM} {...flat} />
        </mesh>
        <mesh position={[0, -0.03, 0.52]} scale={[0.07, 0.05, 0.05]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={DARK} {...flat} />
        </mesh>
        <mesh ref={mouth} position={[0, -0.19, 0.46]} scale={[0.08, 0.04, 0.04]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#7f1d1d" roughness={0.6} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.13, 0.08, 0.44]}>
            <mesh scale={0.055}>
              <sphereGeometry args={[1, 12, 10]} />
              <meshStandardMaterial color={DARK} roughness={0.3} />
            </mesh>
            <mesh position={[0.018, 0.02, 0.045]} scale={0.018}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
