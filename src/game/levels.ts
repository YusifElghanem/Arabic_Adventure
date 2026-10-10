import type { LevelGoals } from '@/stores/useGameStore';

/**
 * Catalog of the levels in this build: geometry and goals only, with no
 * engine code, so the React UI can use it without loading Phaser. The level
 * scene builds everything on screen from these definitions.
 */

/** A floating platform: left cap + `middles` middle tiles + right cap. */
export interface PlatformSpec {
  /** World x of the left edge. */
  x: number;
  /** World y of the walking surface. */
  y: number;
  middles: number;
  /** Skip tall decorations (trees) where a mechanic needs open space above. */
  sparse?: boolean;
}

/** Where each learning mechanic sits. Positions are world pixels; `groundY` is a surface. */
export interface LevelMechanics {
  stars: readonly { x: number; y: number }[];
  /** Centre of the Mystery Block. */
  mysteryBlock: { x: number; y: number };
  /** The ب trampoline, centred on x, standing on groundY. */
  letterB: { x: number; groundY: number };
  /** The floating أ and its lion friend. */
  letterA: { x: number; groundY: number; lionX: number };
  goal: { x: number; groundY: number };
}

export interface LevelDefinition {
  id: number;
  /** World size in pixels. */
  width: number;
  height: number;
  /** Where the child starts (feet position). */
  spawn: { x: number; y: number };
  /** Height of the main ground: the parallax horizons are placed relative to it. */
  groundY: number;
  /** World y where the cloud sea starts; falling below it means falling off the world. */
  cloudSeaY: number;
  platforms: readonly PlatformSpec[];
  mechanics: LevelMechanics;
  goals: LevelGoals;
  /** Seed for decoration scattering, so a level always looks the same. */
  decorSeed: number;
}

export const LEVEL_DEFINITIONS: Record<number, LevelDefinition> = {
  1: {
    id: 1,
    width: 5120,
    height: 1440,
    spawn: { x: 180, y: 1100 },
    groundY: 1100,
    cloudSeaY: 1290,
    platforms: [
      { x: 0, y: 1100, middles: 5 },
      { x: 992, y: 1100, middles: 7, sparse: true },
      { x: 2304, y: 760, middles: 5, sparse: true },
      { x: 3328, y: 960, middles: 3 },
      { x: 4064, y: 960, middles: 5 },
    ],
    // Path: star → gap → bonk the block (its dot flies to ب) → bounce on ب up to
    // the high island → star, giant أ and the lion → step down → star →
    // rainbow arch. The ب bowl is the only way up, so every child uses it.
    mechanics: {
      stars: [
        { x: 560, y: 1036 },
        { x: 2500, y: 696 },
        { x: 3620, y: 896 },
      ],
      mysteryBlock: { x: 1340, y: 846 },
      letterB: { x: 1950, groundY: 1100 },
      letterA: { x: 2640, groundY: 760, lionX: 2900 },
      goal: { x: 4620, groundY: 960 },
    },
    goals: { totalStars: 3, letterDotsRequired: 1 },
    decorSeed: 1,
  },
};

export const isLevelAvailable = (levelId: number): boolean => levelId in LEVEL_DEFINITIONS;

export const getLevelDefinition = (levelId: number): LevelDefinition | undefined => LEVEL_DEFINITIONS[levelId];
