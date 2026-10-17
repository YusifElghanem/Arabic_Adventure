import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type Outfit = 'onesie' | 'explorer';

export const OUTFITS: readonly Outfit[] = ['onesie', 'explorer'] as const;

/** Top-level UI screen the app is currently showing. */
export type GameScreen = 'title' | 'avatarSetup' | 'playing' | 'paused' | 'levelComplete';

/** Kindergarten-level Arabic letters, written without diacritics. */
export const ARABIC_LETTERS = [
  'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص',
  'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي',
] as const;

export type ArabicLetter = (typeof ARABIC_LETTERS)[number];

/** Total number of levels shipped with the game. */
export const LEVEL_COUNT = 27;

/** Maximum stars a single level can award (used for the HUD and best scores). */
export const MAX_STARS_PER_LEVEL = 3;

export interface LevelRecord {
  completed: boolean;
  /** Best star count ever achieved on this level (0..MAX_STARS_PER_LEVEL). */
  bestStars: number;
}

/** What a level asks the child to do. A level registers this when it mounts. */
export interface LevelGoals {
  totalStars: number;
  letterDotsRequired: number;
}

/** Progress inside the level being played. Never persisted, so a reload starts the level fresh. */
export interface LevelSession {
  levelId: number;
  /** Increments on every (re)start so level content can remount from scratch. */
  runId: number;
  starsCollected: number;
  totalStars: number;
  letterDotsCollected: number;
  letterDotsRequired: number;
}

interface PersistedState {
  outfit: Outfit;
  unlockedLevels: number[];
  levelRecords: Record<number, LevelRecord>;
  /** A base64 `data:image/...` URL (persisted) or a `blob:` URL (session only). */
  faceTextureUrl: string | null;
  lettersDiscovered: ArabicLetter[];
  isMuted: boolean;
}

interface TransientState {
  screen: GameScreen;
  isPhotoModalOpen: boolean;
  session: LevelSession | null;
  /** Number of level runs started this page load; feeds LevelSession.runId. */
  runCounter: number;
  /** True once the persisted state has been read from storage. */
  hasHydrated: boolean;
}

interface GameActions {
  // UI
  setScreen: (screen: GameScreen) => void;
  openPhotoModal: () => void;
  closePhotoModal: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;

  // Avatar
  setOutfit: (outfit: Outfit) => void;
  cycleOutfit: () => void;
  setFaceTextureUrl: (url: string) => void;
  clearFaceTexture: () => void;

  // Levels
  isLevelUnlocked: (levelId: number) => boolean;
  startLevel: (levelId: number) => boolean;
  registerLevelGoals: (goals: LevelGoals) => void;
  collectStar: () => void;
  collectLetterDot: () => void;
  discoverLetter: (letter: ArabicLetter) => void;
  completeLevel: () => void;
  exitLevel: () => void;

  // Maintenance
  resetProgress: () => void;
  setHasHydrated: (value: boolean) => void;
}

export type GameState = PersistedState & TransientState & GameActions;

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'arabic-adventure:game';
const STORAGE_VERSION = 1;
const FIRST_LEVEL = 1;

const isValidLevelId = (levelId: number): boolean =>
  Number.isInteger(levelId) && levelId >= FIRST_LEVEL && levelId <= LEVEL_COUNT;

const isDataImageUrl = (url: string): boolean => url.startsWith('data:image/');
const isBlobUrl = (url: string): boolean => url.startsWith('blob:');

const revokeIfBlob = (url: string | null): void => {
  if (url && isBlobUrl(url) && typeof URL !== 'undefined') {
    URL.revokeObjectURL(url);
  }
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Stars awarded for a finished session, scaled to MAX_STARS_PER_LEVEL. */
export const computeAwardedStars = (session: LevelSession): number => {
  if (session.totalStars <= 0) return MAX_STARS_PER_LEVEL;
  const ratio = session.starsCollected / session.totalStars;
  // Finishing a level always earns at least one star; preschoolers are never "failed".
  return clamp(Math.round(ratio * MAX_STARS_PER_LEVEL), 1, MAX_STARS_PER_LEVEL);
};

const createInitialPersistedState = (): PersistedState => ({
  outfit: 'onesie',
  unlockedLevels: [FIRST_LEVEL],
  levelRecords: {},
  faceTextureUrl: null,
  lettersDiscovered: [],
  isMuted: false,
});

const createInitialTransientState = (): Omit<TransientState, 'hasHydrated' | 'runCounter'> => ({
  screen: 'title',
  isPhotoModalOpen: false,
  session: null,
});

/**
 * localStorage wrapper that never throws. Private browsing modes and full
 * quotas make `setItem` throw. A face photo data URL can be hundreds of KB, so
 * if the quota is exceeded we retry without the photo. That way level progress
 * is still saved.
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return typeof window === 'undefined' ? null : window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(name, value);
    } catch (error) {
      try {
        const parsed = JSON.parse(value) as { state?: Partial<PersistedState> };
        if (parsed.state?.faceTextureUrl) {
          parsed.state.faceTextureUrl = null;
          window.localStorage.setItem(name, JSON.stringify(parsed));
          console.warn('[GameStore] Storage quota exceeded; saved progress without the face photo.');
          return;
        }
      } catch {
        // Fall through to the generic warning below.
      }
      console.warn('[GameStore] Unable to persist game state.', error);
    }
  },
  removeItem: (name) => {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(name);
    } catch {
      // Ignore: nothing we can do if storage is unavailable.
    }
  },
};

/* -------------------------------------------------------------------------- */
/*                                   Store                                    */
/* -------------------------------------------------------------------------- */

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...createInitialPersistedState(),
      ...createInitialTransientState(),
      runCounter: 0,
      hasHydrated: false,

      /* ------------------------------- UI -------------------------------- */

      setScreen: (screen) => set({ screen }),

      openPhotoModal: () => set({ isPhotoModalOpen: true }),

      closePhotoModal: () => set({ isPhotoModalOpen: false }),

      pauseGame: () => {
        if (get().screen === 'playing') set({ screen: 'paused' });
      },

      resumeGame: () => {
        if (get().screen === 'paused') set({ screen: 'playing' });
      },

      setMuted: (muted) => set({ isMuted: muted }),

      toggleMuted: () => set((state) => ({ isMuted: !state.isMuted })),

      /* ----------------------------- Avatar ------------------------------ */

      setOutfit: (outfit) => {
        if (OUTFITS.includes(outfit)) set({ outfit });
      },

      cycleOutfit: () =>
        set((state) => {
          const index = OUTFITS.indexOf(state.outfit);
          return { outfit: OUTFITS[(index + 1) % OUTFITS.length] };
        }),

      setFaceTextureUrl: (url) => {
        if (!isDataImageUrl(url) && !isBlobUrl(url)) {
          console.warn('[GameStore] Rejected face texture: expected a data:image/ or blob: URL.');
          return;
        }
        const previous = get().faceTextureUrl;
        if (previous !== url) revokeIfBlob(previous);
        set({ faceTextureUrl: url });
      },

      clearFaceTexture: () => {
        revokeIfBlob(get().faceTextureUrl);
        set({ faceTextureUrl: null });
      },

      /* ----------------------------- Levels ------------------------------ */

      isLevelUnlocked: (levelId) => get().unlockedLevels.includes(levelId),

      startLevel: (levelId) => {
        if (!isValidLevelId(levelId) || !get().isLevelUnlocked(levelId)) return false;
        set((state) => ({
          runCounter: state.runCounter + 1,
          screen: 'playing',
          isPhotoModalOpen: false,
          session: {
            levelId,
            runId: state.runCounter + 1,
            starsCollected: 0,
            totalStars: 0,
            letterDotsCollected: 0,
            letterDotsRequired: 0,
          },
        }));
        return true;
      },

      registerLevelGoals: ({ totalStars, letterDotsRequired }) =>
        set((state) => {
          if (!state.session) return state;
          const safeTotalStars = Math.max(0, Math.floor(totalStars));
          const safeDotsRequired = Math.max(0, Math.floor(letterDotsRequired));
          return {
            session: {
              ...state.session,
              totalStars: safeTotalStars,
              letterDotsRequired: safeDotsRequired,
              starsCollected: Math.min(state.session.starsCollected, safeTotalStars),
              letterDotsCollected: Math.min(state.session.letterDotsCollected, safeDotsRequired),
            },
          };
        }),

      collectStar: () =>
        set((state) => {
          if (!state.session || state.screen !== 'playing') return state;
          const { starsCollected, totalStars } = state.session;
          if (starsCollected >= totalStars) return state;
          return { session: { ...state.session, starsCollected: starsCollected + 1 } };
        }),

      collectLetterDot: () =>
        set((state) => {
          if (!state.session || state.screen !== 'playing') return state;
          const { letterDotsCollected, letterDotsRequired } = state.session;
          if (letterDotsCollected >= letterDotsRequired) return state;
          return {
            session: { ...state.session, letterDotsCollected: letterDotsCollected + 1 },
          };
        }),

      discoverLetter: (letter) =>
        set((state) =>
          state.lettersDiscovered.includes(letter)
            ? state
            : { lettersDiscovered: [...state.lettersDiscovered, letter] },
        ),

      completeLevel: () => {
        const { session, levelRecords, unlockedLevels } = get();
        if (!session) return;

        const awarded = computeAwardedStars(session);
        const previous = levelRecords[session.levelId];
        const nextLevelId = session.levelId + 1;

        set({
          screen: 'levelComplete',
          levelRecords: {
            ...levelRecords,
            [session.levelId]: {
              completed: true,
              bestStars: Math.max(previous?.bestStars ?? 0, awarded),
            },
          },
          unlockedLevels:
            isValidLevelId(nextLevelId) && !unlockedLevels.includes(nextLevelId)
              ? [...unlockedLevels, nextLevelId].sort((a, b) => a - b)
              : unlockedLevels,
        });
      },

      exitLevel: () => set({ screen: 'title', session: null }),

      /* --------------------------- Maintenance --------------------------- */

      resetProgress: () => {
        revokeIfBlob(get().faceTextureUrl);
        set({ ...createInitialPersistedState(), ...createInitialTransientState() });
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state): PersistedState => ({
        outfit: state.outfit,
        unlockedLevels: state.unlockedLevels,
        levelRecords: state.levelRecords,
        // blob: URLs die with the page, so only base64 data URLs are worth persisting.
        faceTextureUrl:
          state.faceTextureUrl && isDataImageUrl(state.faceTextureUrl) ? state.faceTextureUrl : null,
        lettersDiscovered: state.lettersDiscovered,
        isMuted: state.isMuted,
      }),
      // Check everything read back from storage. Values a parent's browser may
      // have tampered with or corrupted must never crash the game.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PersistedState>;
        const defaults = createInitialPersistedState();

        const unlockedLevels = Array.isArray(saved.unlockedLevels)
          ? Array.from(new Set(saved.unlockedLevels.filter(isValidLevelId))).sort((a, b) => a - b)
          : defaults.unlockedLevels;
        if (!unlockedLevels.includes(FIRST_LEVEL)) unlockedLevels.unshift(FIRST_LEVEL);

        const levelRecords: Record<number, LevelRecord> = {};
        if (saved.levelRecords && typeof saved.levelRecords === 'object') {
          for (const [key, record] of Object.entries(saved.levelRecords)) {
            const levelId = Number(key);
            if (!isValidLevelId(levelId) || !record || typeof record !== 'object') continue;
            levelRecords[levelId] = {
              completed: Boolean(record.completed),
              bestStars: clamp(Math.floor(Number(record.bestStars) || 0), 0, MAX_STARS_PER_LEVEL),
            };
          }
        }

        return {
          ...current,
          outfit: saved.outfit && OUTFITS.includes(saved.outfit) ? saved.outfit : defaults.outfit,
          unlockedLevels,
          levelRecords,
          faceTextureUrl:
            typeof saved.faceTextureUrl === 'string' && isDataImageUrl(saved.faceTextureUrl)
              ? saved.faceTextureUrl
              : null,
          lettersDiscovered: Array.isArray(saved.lettersDiscovered)
            ? saved.lettersDiscovered.filter((letter): letter is ArabicLetter =>
                (ARABIC_LETTERS as readonly string[]).includes(letter),
              )
            : defaults.lettersDiscovered,
          isMuted: typeof saved.isMuted === 'boolean' ? saved.isMuted : defaults.isMuted,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/* -------------------------------------------------------------------------- */
/*                                 Selectors                                  */
/* -------------------------------------------------------------------------- */

/** Share of the current level's goals that are done (0..1). Fills the HUD sun. */
export const selectSunProgress = (state: GameState): number => {
  const session = state.session;
  if (!session) return 0;
  const goalTotal = session.totalStars + session.letterDotsRequired;
  if (goalTotal === 0) return 0;
  return clamp((session.starsCollected + session.letterDotsCollected) / goalTotal, 0, 1);
};

export const selectIsLetterComplete = (state: GameState): boolean =>
  !!state.session &&
  state.session.letterDotsRequired > 0 &&
  state.session.letterDotsCollected >= state.session.letterDotsRequired;

export const selectIsPlaying = (state: GameState): boolean => state.screen === 'playing';
