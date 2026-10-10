import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { ACESFilmicToneMapping } from 'three';
import { LEVELS } from '@/components/levels/levels';
import { GRAVITY } from '@/game/constants';
import { useGameStore } from '@/stores/useGameStore';

/**
 * The 3D canvas: renderer settings, the Rapier physics world (paused with
 * the game), and the current level. The level is keyed by the session's
 * runId, so "play again" rebuilds it from scratch.
 */

interface GameSceneProps {
  onReady: () => void;
}

export default function GameScene({ onReady }: GameSceneProps) {
  const screen = useGameStore((s) => s.screen);
  const levelId = useGameStore((s) => s.session?.levelId);
  const runId = useGameStore((s) => s.session?.runId);
  const Level = levelId !== undefined ? LEVELS[levelId] : undefined;

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.75]}
      camera={{ fov: 42, near: 0.1, far: 200, position: [0, 4, 13] }}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping }}
      className="touch-none"
    >
      <Suspense fallback={null}>
        <Physics gravity={[0, GRAVITY, 0]} paused={screen !== 'playing'}>
          {Level && <Level key={runId} />}
        </Physics>
        <ReadySignal onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

/** Renders inside the Suspense boundary: mounts only once everything has loaded. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    // Wait one frame so the first image is on screen before hiding the loader.
    const id = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}
