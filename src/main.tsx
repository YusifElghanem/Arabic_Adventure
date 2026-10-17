import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// The display font, self-hosted (works offline; Phaser text needs it loaded).
import '@fontsource/baloo-bhaijaan-2/arabic-700.css';
import '@fontsource/baloo-bhaijaan-2/arabic-800.css';
import '@fontsource/baloo-bhaijaan-2/700.css';
import '@fontsource/baloo-bhaijaan-2/800.css';
import './index.css';

if (import.meta.env.DEV) {
  // Development-only handle for debugging and automated play-testing. It is
  // stripped from production builds.
  void Promise.all([import('@/stores/useGameStore'), import('@/stores/useInputStore'), import('@/game/EventBus')]).then(
    ([game, input, bus]) => {
      (window as unknown as Record<string, unknown>).__game = {
        game: game.useGameStore,
        input: input.useInputStore,
        events: bus.EventBus,
      };
    },
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
