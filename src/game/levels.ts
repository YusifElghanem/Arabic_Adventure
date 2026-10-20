import type { LevelGoals } from '@/stores/useGameStore';
import { generateChallengeLevel, generateGuardLevel, generateTemplateLevel } from './levelGenerator';
import { LETTERS, TOTAL_LEVELS, letterForLevel, type LetterSpec } from './letters';

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
  /** A moving platform: swings ±dx / ±dy around its spot, one full swing per `period` seconds. */
  move?: { dx: number; dy: number; period: number; phase?: number };
}

/**
 * Thief kinds (challenge mode mixes them per world):
 * - looper: loops over the arena (the easy one).
 * - dasher: darts away when the child comes close.
 * - armored: wears a candy helmet that needs one extra touch.
 * - blinker: pops to another spot on its loop every few seconds.
 * - splitter: when caught, splits into two little thieves.
 * - king: big, three touches, throws more candy (last letter of a world).
 */
export type ThiefKind = 'looper' | 'dasher' | 'armored' | 'blinker' | 'splitter' | 'king';

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

/** Mechanic positions in a generated (template) level. */
export interface TemplateMechanics {
  stars: readonly { x: number; y: number }[];
  /** Mystery Block centres, one per dot the letter needs. */
  blocks: readonly { x: number; y: number }[];
  /** Where the big letter stands (centre x, on the surface groundY). */
  letter: { x: number; groundY: number };
  /** Where the word picture stands. */
  friend: { x: number; groundY: number };
  goal: { x: number; groundY: number };
}

/** Thieves mode arena: the child guards the big letter from the letter thieves. */
export interface GuardMechanics {
  stars: readonly { x: number; y: number }[];
  letter: { x: number; groundY: number };
  /** How many thieves come in this arena. */
  thieves: number;
  /** At most this many thieves at once. */
  maxAtOnce: number;
  /** Where thieves fly in from (just outside the world). */
  entries: readonly { x: number; y: number }[];
  /** The loop a thief flies while carrying its letter: centre, half-width, base height, bob. */
  roam: { cx: number; halfWidth: number; y: number; bob: number };
  /** Challenge mode: the thieves in order (absent = all loopers). */
  cast?: readonly ThiefKind[];
  /** Challenge mode: thieves speed multiplier, and seconds between candy throws (0 = none). */
  speed?: number;
  throwEvery?: number;
}

/** 'classic' = hand-made Level 1 (أ and ب); 'template' = generated from a letter; 'guard' = thieves mode. */
export type LevelKind = 'classic' | 'template' | 'guard';

export interface LevelDefinition {
  id: number;
  kind: LevelKind;
  /** Which of the 7 worlds (1-based). */
  world: number;
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
  /** Classic level only. */
  mechanics?: LevelMechanics;
  /** Template levels only. */
  template?: TemplateMechanics;
  /** Thieves mode only. */
  guard?: GuardMechanics;
  /** Template and guard levels: the letter this level teaches. */
  letter?: LetterSpec;
  goals: LevelGoals;
  /** Seed for decoration scattering, so a level always looks the same. */
  decorSeed: number;
}

export const LEVEL_DEFINITIONS: Record<number, LevelDefinition> = {
  1: {
    id: 1,
    kind: 'classic',
    world: 1,
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

/** Level 1 is hand-made; levels 2..TOTAL_LEVELS are generated from the letter table. */
export const isLevelAvailable = (levelId: number): boolean =>
  Number.isInteger(levelId) && levelId >= 1 && levelId <= TOTAL_LEVELS;

export function getLevelDefinition(levelId: number): LevelDefinition | undefined {
  if (!isLevelAvailable(levelId)) return undefined;
  const cached = LEVEL_DEFINITIONS[levelId];
  if (cached) return cached;
  const spec = letterForLevel(levelId);
  if (!spec) return undefined;
  // Generated once, then cached: generation is deterministic.
  return (LEVEL_DEFINITIONS[levelId] = generateTemplateLevel(spec, levelId));
}

const GUARD_LEVELS: Record<number, LevelDefinition> = {};

/** Thieves mode arena for a letter (id = letter index + 1, so 1..28). */
export function getGuardLevel(id: number): LevelDefinition | undefined {
  const spec = LETTERS[id - 1];
  if (!spec) return undefined;
  return (GUARD_LEVELS[id] ??= generateGuardLevel(spec, id));
}

const CHALLENGE_LEVELS: Record<number, LevelDefinition> = {};

/** Challenge mode arena: a different map and cast for every letter (id 1..28). */
export function getChallengeLevel(id: number): LevelDefinition | undefined {
  const spec = LETTERS[id - 1];
  if (!spec) return undefined;
  return (CHALLENGE_LEVELS[id] ??= generateChallengeLevel(spec, id));
}

/** How many thieves must become friends (a splitter brings two little ones). */
export const thiefCount = (guard: GuardMechanics): number =>
  guard.cast ? guard.cast.reduce((n, kind) => n + (kind === 'splitter' ? 3 : 1), 0) : guard.thieves;
