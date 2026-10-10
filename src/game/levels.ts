import type { LevelGoals } from '@/stores/useGameStore';

/**
 * Catalog of the levels in this build: sizes and goals only, with no engine
 * code, so the React UI can use it without loading Phaser. The level scenes
 * build their content from these definitions.
 */

export interface LevelDefinition {
  id: number;
  /** World size in pixels. */
  width: number;
  height: number;
  goals: LevelGoals;
}

export const LEVEL_DEFINITIONS: Record<number, LevelDefinition> = {
  1: { id: 1, width: 6400, height: 1440, goals: { totalStars: 3, letterDotsRequired: 1 } },
};

export const isLevelAvailable = (levelId: number): boolean => levelId in LEVEL_DEFINITIONS;

export const getLevelDefinition = (levelId: number): LevelDefinition | undefined => LEVEL_DEFINITIONS[levelId];
