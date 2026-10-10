import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import HUD from '@/components/ui/HUD';
import LevelCompleteScreen from '@/components/ui/LevelCompleteScreen';
import LoadingScreen from '@/components/ui/LoadingScreen';
import PauseMenu from '@/components/ui/PauseMenu';
import PhotoUploadModal from '@/components/ui/PhotoUploadModal';
import TitleScreen from '@/components/ui/TitleScreen';
import TouchControls from '@/components/ui/TouchControls';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useGameStore } from '@/stores/useGameStore';

// Phaser is large; download it only when a level starts.
const PhaserGame = lazy(() => import('@/game/PhaserGame'));

/**
 * Top-level layout: the title screen, or the game canvas with its HTML
 * overlays (HUD, touch controls, pause and level-complete screens). The
 * parent photo dialog can open above either.
 */
export default function App() {
  const screen = useGameStore((s) => s.screen);
  const hasSession = useGameStore((s) => s.session !== null);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const exitLevel = useGameStore((s) => s.exitLevel);
  const inGame = hasSession && (screen === 'playing' || screen === 'paused' || screen === 'levelComplete');
  const [sceneReady, setSceneReady] = useState(false);

  useKeyboardControls(screen === 'playing');

  // The loader shows again for each fresh entry into the game.
  useEffect(() => {
    if (!inGame) setSceneReady(false);
  }, [inGame]);
  const onReady = useCallback(() => setSceneReady(true), []);

  // Pause when the tab is hidden or the device locks.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) pauseGame();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pauseGame]);

  // Escape / P toggles pause (for grown-ups on keyboards).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Escape' && event.code !== 'KeyP') return;
      if (useGameStore.getState().isPhotoModalOpen) return;
      const current = useGameStore.getState().screen;
      if (current === 'playing') pauseGame();
      else if (current === 'paused') resumeGame();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pauseGame, resumeGame]);

  return (
    <main className="relative h-full w-full overflow-hidden select-none">
      {inGame ? (
        <ErrorBoundary key="game" onReset={exitLevel}>
          <div className="absolute inset-0">
            <Suspense fallback={null}>
              <PhaserGame onReady={onReady} />
            </Suspense>
          </div>
          {!sceneReady && <LoadingScreen />}
          {sceneReady && screen === 'playing' && (
            <>
              <HUD />
              <TouchControls />
            </>
          )}
          {screen === 'paused' && <PauseMenu />}
          {screen === 'levelComplete' && <LevelCompleteScreen />}
        </ErrorBoundary>
      ) : (
        <ErrorBoundary key="title">
          <TitleScreen />
        </ErrorBoundary>
      )}
      <PhotoUploadModal />
    </main>
  );
}
