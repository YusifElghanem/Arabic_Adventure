import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

if (import.meta.env.DEV) {
  // Development-only handle for debugging and automated play-testing. It is
  // stripped from production builds.
  void Promise.all([import('@/stores/useGameStore'), import('@/stores/useInputStore'), import('@/game/playerTracker')]).then(
    ([game, input, tracker]) => {
      (window as unknown as Record<string, unknown>).__game = {
        game: game.useGameStore,
        input: input.useInputStore,
        player: tracker.playerTracker,
      };
    },
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// No <StrictMode>: its double-invoked effects make @react-three/rapier lose
// collider event registrations in development, so collision-driven mechanics
// (the Mystery Block, the ب trampoline) would stop responding.
createRoot(root).render(<App />);
