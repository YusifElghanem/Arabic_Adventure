import { useGameStore, type GameState } from '@/stores/useGameStore';
import type { LevelSceneData } from './constants';

/**
 * Keeps the Phaser game in step with the Zustand store:
 *   screen 'playing'                    → level scene runs
 *   screen 'paused' / 'levelComplete'   → level scene is paused
 *   a new session runId                 → level scene restarts from scratch
 *
 * It talks to the game through the narrow LevelController interface, so it
 * can be tested without Phaser.
 */

export interface LevelController {
  /** True once the level scene has been started at least once (running or paused). */
  isLevelStarted(): boolean;
  startLevel(data: LevelSceneData): void;
  pauseLevel(): void;
  resumeLevel(): void;
}

type StoreApi = Pick<typeof useGameStore, 'getState' | 'subscribe'>;

const shouldRun = (state: GameState) => state.screen === 'playing';

export function connectGameToStore(controller: LevelController, store: StoreApi = useGameStore): () => void {
  let lastRunId = store.getState().session?.runId ?? null;
  let lastRunning = shouldRun(store.getState());

  return store.subscribe((state) => {
    const runId = state.session?.runId ?? null;

    if (runId !== null && runId !== lastRunId && state.session) {
      lastRunId = runId;
      if (controller.isLevelStarted()) {
        controller.startLevel({ levelId: state.session.levelId, runId });
      }
      // A fresh start always begins running.
      lastRunning = shouldRun(state);
      if (!lastRunning) controller.pauseLevel();
      return;
    }
    lastRunId = runId;

    const running = shouldRun(state);
    if (running === lastRunning) return;
    lastRunning = running;
    if (!controller.isLevelStarted()) return;
    if (running) controller.resumeLevel();
    else controller.pauseLevel();
  });
}

/** The level the game should show right now, from the store. */
export function currentLevelData(store: Pick<StoreApi, 'getState'> = useGameStore): LevelSceneData | null {
  const session = store.getState().session;
  return session ? { levelId: session.levelId, runId: session.runId } : null;
}
