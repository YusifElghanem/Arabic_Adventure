import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/stores/useGameStore';
import { connectGameToStore, currentLevelData, type LevelController } from './bridge';
import { LEVEL_DEFINITIONS, getLevelDefinition, isLevelAvailable } from './levels';

function createController(started = true) {
  const controller = {
    started,
    isLevelStarted: vi.fn(() => controller.started),
    startLevel: vi.fn(),
    pauseLevel: vi.fn(),
    resumeLevel: vi.fn(),
  };
  return controller satisfies LevelController & { started: boolean };
}

beforeEach(() => {
  localStorage.clear();
  useGameStore.getState().resetProgress();
});

describe('connectGameToStore', () => {
  it('pauses and resumes the level with the screen state', () => {
    const s = useGameStore.getState;
    s().startLevel(1);
    const c = createController();
    const disconnect = connectGameToStore(c);

    s().pauseGame();
    expect(c.pauseLevel).toHaveBeenCalledTimes(1);
    s().resumeGame();
    expect(c.resumeLevel).toHaveBeenCalledTimes(1);

    s().completeLevel();
    expect(c.pauseLevel).toHaveBeenCalledTimes(2);
    disconnect();
  });

  it('restarts the level scene when a new run begins', () => {
    const s = useGameStore.getState;
    s().startLevel(1);
    const c = createController();
    const disconnect = connectGameToStore(c);

    s().completeLevel();
    s().startLevel(1); // "play again"
    expect(c.startLevel).toHaveBeenCalledWith({ levelId: 1, runId: s().session!.runId });
    disconnect();
  });

  it('leaves starting to the preloader while the level scene has not started yet', () => {
    const s = useGameStore.getState;
    const c = createController(false);
    const disconnect = connectGameToStore(c);
    s().startLevel(1);
    s().pauseGame();
    expect(c.startLevel).not.toHaveBeenCalled();
    expect(c.pauseLevel).not.toHaveBeenCalled();
    disconnect();
  });

  it('ignores unrelated store changes and stops listening after disconnect', () => {
    const s = useGameStore.getState;
    s().startLevel(1);
    const c = createController();
    const disconnect = connectGameToStore(c);
    s().collectStar();
    s().setOutfit('explorer');
    expect(c.startLevel).not.toHaveBeenCalled();
    expect(c.pauseLevel).not.toHaveBeenCalled();
    disconnect();
    s().pauseGame();
    expect(c.pauseLevel).not.toHaveBeenCalled();
  });

  it('currentLevelData reflects the active session', () => {
    expect(currentLevelData()).toBeNull();
    useGameStore.getState().startLevel(1);
    expect(currentLevelData()).toEqual({ levelId: 1, runId: useGameStore.getState().session!.runId });
  });
});

describe('level catalog', () => {
  it('defines a playable level 1 with valid goals and size', () => {
    expect(isLevelAvailable(1)).toBe(true);
    expect(isLevelAvailable(2)).toBe(true);
    expect(isLevelAvailable(28)).toBe(false);
    const level = getLevelDefinition(1)!;
    expect(level.width).toBeGreaterThan(0);
    expect(level.goals.letterDotsRequired).toBeGreaterThan(0);
    for (const [id, def] of Object.entries(LEVEL_DEFINITIONS)) expect(def.id).toBe(Number(id));
  });
});
