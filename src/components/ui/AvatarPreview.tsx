import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Float } from '@react-three/drei';
import type { Group } from 'three';
import PlayerAvatar from '@/components/characters/PlayerAvatar';
import IslandModel from '@/components/levels/IslandModel';

/** A small 3D stage on the title screen showing the child's own avatar waving hello. */
export default function AvatarPreview({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0.7, 5.4], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, -0.3, 0)}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 4]} intensity={2} />
        <hemisphereLight args={['#e0f2fe', '#86efac', 0.5]} />
        <Suspense fallback={null}>
          <Stage />
        </Suspense>
      </Canvas>
    </div>
  );
}

function Stage() {
  const turntable = useRef<Group>(null);
  useFrame((state) => {
    if (turntable.current) turntable.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.35;
  });
  return (
    <Float speed={1.4} rotationIntensity={0.05} floatIntensity={0.35}>
      <group ref={turntable} position={[0, -0.75, 0]}>
        <PlayerAvatar />
        <IslandModel position={[0, 0, 0]} width={2.2} depth={2} thickness={0.9} seed={7} decorate={false} />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={2.4} blur={2} far={1.5} />
      </group>
    </Float>
  );
}
