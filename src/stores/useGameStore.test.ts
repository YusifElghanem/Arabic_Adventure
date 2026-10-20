import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'arabic-adventure:game';
const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

/** Load a fresh copy of the store so it rehydrates from whatever is in localStorage. */
const loadStore = async () => {
  vi.resetModules();
  const mod = await import('./useGameStore');
  await mod.useGameStore.persist.rehydrate();
  return mod;
};

const readSaved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('initial state', () => {
  it('starts on the title screen with only level 1 unlocked', async () => {
    const { useGameStore } = await loadStore();
    const state = useGameStore.getState();
    expect(state.screen).toBe('title');
    expect(state.outfit).toBe('onesie');
    expect(state.unlockedLevels).toEqual([1]);
    expect(state.faceTextureUrl).toBeNull();
    expect(state.session).toBeNull();
    expect(state.hasHydrated).toBe(true);
  });
});

describe('UI state', () => {
  it('opens and closes the photo modal', async () => {
    const { useGameStore } = await loadStore();
    useGameStore.getState().openPhotoModal();
    expect(useGameStore.getState().isPhotoModalOpen).toBe(true);
    useGameStore.getState().closePhotoModal();
    expect(useGameStore.getState().isPhotoModalOpen).toBe(false);
  });

  it('only pauses while playing and only resumes while paused', async () => {
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;
    s().pauseGame();
    expect(s().screen).toBe('title');
    s().startLevel(1);
    s().resumeGame();
    expect(s().screen).toBe('playing');
    s().pauseGame();
    expect(s().screen).toBe('paused');
    s().resumeGame();
    expect(s().screen).toBe('playing');
  });

  it('toggles mute', async () => {
    const { useGameStore } = await loadStore();
    useGameStore.getState().toggleMuted();
    expect(useGameStore.getState().isMuted).toBe(true);
  });
});

describe('outfits', () => {
  it('sets and cycles outfits', async () => {
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;
    s().setOutfit('explorer');
    expect(s().outfit).toBe('explorer');
    s().cycleOutfit();
    expect(s().outfit).toBe('onesie');
    s().cycleOutfit();
    expect(s().outfit).toBe('explorer');
  });
});

describe('face texture', () => {
  it('accepts data:image URLs and rejects anything else', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;
    s().setFaceTextureUrl('https://example.com/face.png');
    expect(s().faceTextureUrl).toBeNull();
    s().setFaceTextureUrl('javascript:alert(1)');
    expect(s().faceTextureUrl).toBeNull();
    s().setFaceTextureUrl(PNG_DATA_URL);
    expect(s().faceTextureUrl).toBe(PNG_DATA_URL);
  });

  it('revokes a previous blob URL when replaced or cleared', async () => {
    const revoke = vi.fn();
    URL.revokeObjectURL = revoke;
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;
    s().setFaceTextureUrl('blob:http://localhost/a');
    s().setFaceTextureUrl('blob:http://localhost/b');
    expect(revoke).toHaveBeenCalledWith('blob:http://localhost/a');
    s().clearFaceTexture();
    expect(revoke).toHaveBeenCalledWith('blob:http://localhost/b');
    expect(s().faceTextureUrl).toBeNull();
  });

  it('persists data URLs but never blob URLs', async () => {
    URL.revokeObjectURL = vi.fn();
    const { useGameStore } = await loadStore();
    useGameStore.getState().setFaceTextureUrl(PNG_DATA_URL);
    expect(readSaved().state.faceTextureUrl).toBe(PNG_DATA_URL);
    useGameStore.getState().setFaceTextureUrl('blob:http://localhost/x');
    expect(readSaved().state.faceTextureUrl).toBeNull();
  });
});

describe('level flow', () => {
  it('refuses to start invalid levels; every valid level is open', async () => {
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;
    expect(s().isLevelUnlocked(27)).toBe(true);
    expect(s().startLevel(0)).toBe(false);
    expect(s().startLevel(99)).toBe(false);
    expect(s().screen).toBe('title');
    expect(s().startLevel(1)).toBe(true);
    expect(s().screen).toBe('playing');
    expect(s().session?.levelId).toBe(1);
  });

  it('caps collectibles at the registered goals', async () => {
    const { useGameStore, selectSunProgress, selectIsLetterComplete } = await loadStore();
    const s = useGameStore.getState;
    s().startLevel(1);
    s().registerLevelGoals({ totalStars: 2, letterDotsRequired: 1 });
    expect(selectSunProgress(s())).toBe(0);

    s().collectStar();
    s().collectStar();
    s().collectStar(); // over the cap
    s().collectLetterDot();
    s().collectLetterDot(); // over the cap

    expect(s().session?.starsCollected).toBe(2);
    expect(s().session?.letterDotsCollected).toBe(1);
    expect(selectSunProgress(s())).toBe(1);
    expect(selectIsLetterComplete(s())).toBe(true);
  });

  it('ignores collectibles while paused', async () => {
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;
    s().startLevel(1);
    s().registerLevelGoals({ totalStars: 3, letterDotsRequired: 1 });
    s().pauseGame();
    s().collectStar();
    expect(s().session?.starsCollected).toBe(0);
  });

  it('completing a level unlocks the next and keeps the best star score', async () => {
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;

    s().startLevel(1);
    s().registerLevelGoals({ totalStars: 3, letterDotsRequired: 1 });
    s().collectStar();
    s().collectStar();
    s().collectStar();
    s().completeLevel();
    expect(s().screen).toBe('levelComplete');
    expect(s().unlockedLevels).toEqual([1, 2]);
    expect(s().levelRecords[1]).toEqual({ completed: true, bestStars: 3 });

    // Replaying with zero stars still awards 1, but never lowers the best score.
    s().startLevel(1);
    s().registerLevelGoals({ totalStars: 3, letterDotsRequired: 1 });
    s().completeLevel();
    expect(s().levelRecords[1].bestStars).toBe(3);
    expect(s().unlockedLevels).toEqual([1, 2]);
  });

  it('always awards at least one star for finishing', async () => {
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;
    s().startLevel(1);
    s().registerLevelGoals({ totalStars: 5, letterDotsRequired: 0 });
    s().completeLevel();
    expect(s().levelRecords[1].bestStars).toBe(1);
  });

  it('does not unlock beyond the last level', async () => {
    const { useGameStore, LEVEL_COUNT } = await loadStore();
    const s = useGameStore.getState;
    for (let level = 1; level <= LEVEL_COUNT; level++) {
      expect(s().startLevel(level)).toBe(true);
      s().completeLevel();
    }
    expect(s().unlockedLevels).toHaveLength(LEVEL_COUNT);
    expect(s().unlockedLevels).not.toContain(LEVEL_COUNT + 1);
  });

  it('exitLevel clears the session', async () => {
    const { useGameStore } = await loadStore();
    useGameStore.getState().startLevel(1);
    useGameStore.getState().exitLevel();
    expect(useGameStore.getState().session).toBeNull();
    expect(useGameStore.getState().screen).toBe('title');
  });

  it('records discovered letters once', async () => {
    const { useGameStore } = await loadStore();
    useGameStore.getState().discoverLetter('أ');
    useGameStore.getState().discoverLetter('أ');
    useGameStore.getState().discoverLetter('ب');
    expect(useGameStore.getState().lettersDiscovered).toEqual(['أ', 'ب']);
  });
});

describe('persistence', () => {
  it('saves progress but not the transient UI state', async () => {
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;
    s().setOutfit('explorer');
    s().startLevel(1);
    s().completeLevel();
    const saved = readSaved().state;
    expect(saved.outfit).toBe('explorer');
    expect(saved.unlockedLevels).toEqual([1, 2]);
    expect(saved).not.toHaveProperty('screen');
    expect(saved).not.toHaveProperty('session');
    expect(saved).not.toHaveProperty('isPhotoModalOpen');
  });

  it('restores saved progress on reload', async () => {
    const first = await loadStore();
    first.useGameStore.getState().setOutfit('explorer');
    first.useGameStore.getState().setFaceTextureUrl(PNG_DATA_URL);

    const second = await loadStore();
    const state = second.useGameStore.getState();
    expect(state.outfit).toBe('explorer');
    expect(state.faceTextureUrl).toBe(PNG_DATA_URL);
    expect(state.screen).toBe('title');
  });

  it('sanitises corrupted or tampered save data', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          outfit: 'pirate',
          unlockedLevels: [3, 3, 99, -1, 'x'],
          levelRecords: { 1: { completed: 'yes', bestStars: 42 }, 77: { completed: true, bestStars: 1 } },
          faceTextureUrl: 'https://evil.example/tracker.png',
          lettersDiscovered: ['أ', 'Z', 'ب'],
          isMuted: 'loud',
        },
      }),
    );
    const { useGameStore } = await loadStore();
    const state = useGameStore.getState();
    expect(state.outfit).toBe('onesie');
    expect(state.unlockedLevels).toEqual([1, 3]);
    expect(state.levelRecords).toEqual({ 1: { completed: true, bestStars: 3 } });
    expect(state.faceTextureUrl).toBeNull();
    expect(state.lettersDiscovered).toEqual(['أ', 'ب']);
    expect(state.isMuted).toBe(false);
  });

  it('survives unparseable storage', async () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { useGameStore } = await loadStore();
    expect(useGameStore.getState().unlockedLevels).toEqual([1]);
  });

  it('drops the face photo and still saves progress when the quota is exceeded', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { useGameStore } = await loadStore();
    const realSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (value.includes('data:image/')) throw new DOMException('full', 'QuotaExceededError');
      realSetItem.call(this, key, value);
    });

    useGameStore.getState().setOutfit('explorer');
    useGameStore.getState().setFaceTextureUrl(PNG_DATA_URL);

    const saved = readSaved().state;
    expect(saved.outfit).toBe('explorer');
    expect(saved.faceTextureUrl).toBeNull();
    // In-memory state keeps the photo for the current session.
    expect(useGameStore.getState().faceTextureUrl).toBe(PNG_DATA_URL);
  });

  it('resetProgress wipes everything back to defaults', async () => {
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;
    s().setOutfit('explorer');
    s().setFaceTextureUrl(PNG_DATA_URL);
    s().startLevel(1);
    s().completeLevel();
    s().resetProgress();
    expect(s().outfit).toBe('onesie');
    expect(s().unlockedLevels).toEqual([1]);
    expect(s().faceTextureUrl).toBeNull();
    expect(s().levelRecords).toEqual({});
    expect(s().screen).toBe('title');
    expect(s().hasHydrated).toBe(true);
  });
});

describe('run ids', () => {
  it('gives every level start a new runId, including replays after exiting', async () => {
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;
    s().startLevel(1);
    const first = s().session!.runId;
    s().startLevel(1);
    const second = s().session!.runId;
    s().exitLevel();
    s().startLevel(1);
    const third = s().session!.runId;
    expect(new Set([first, second, third]).size).toBe(3);
  });
});

describe('coins and shop', () => {
  it('collects coins into the purse and the session', async () => {
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;
    s().startLevel(1);
    s().collectCoin();
    s().collectCoin();
    expect(s().coins).toBe(2);
    expect(s().session!.coinsCollected).toBe(2);
  });

  it('buys only affordable, unowned items, then wears them', async () => {
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;
    useGameStore.setState({ coins: 35, outfit: 'explorer' });
    expect(s().buyItem('costume:cat')).toBe(false); // costs 40
    expect(s().buyItem('costume:bunny')).toBe(true);
    expect(s()).toMatchObject({ coins: 5, costume: 'bunny', outfit: 'onesie' });
    expect(s().buyItem('costume:bunny')).toBe(false);
    expect(s().buyItem('nope')).toBe(false);
  });

  it('toggles the equipped tool and ignores unowned items', async () => {
    const { useGameStore } = await loadStore();
    const s = useGameStore.getState;
    s().equipItem('tool:bubble');
    expect(s().tool).toBeNull();
    useGameStore.setState({ coins: 100 });
    s().buyItem('tool:bubble');
    expect(s().tool).toBe('bubble');
    s().equipItem('tool:bubble');
    expect(s().tool).toBeNull();
  });
});
