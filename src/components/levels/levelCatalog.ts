/**
 * IDs of the levels in this build, kept apart from the level components so
 * UI code can check what is playable without importing the physics engine.
 * Keep this in sync with `levels.ts`.
 */
export const AVAILABLE_LEVEL_IDS: readonly number[] = [1];

export const isLevelAvailable = (levelId: number): boolean => AVAILABLE_LEVEL_IDS.includes(levelId);
