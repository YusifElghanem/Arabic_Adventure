/** Engine-wide constants. World units are pixels at the design height. */

/** Every screen sees this much world height; the visible width adapts to the screen. */
export const DESIGN_HEIGHT = 720;
/** Minimum visible world width, so tall phone screens still see what's ahead. */
export const MIN_VISIBLE_WIDTH = 960;
/** Cap on the device pixel ratio: sharp on retina, without burning low-end GPUs. */
export const MAX_PIXEL_RATIO = 2;

export const SKY_COLOR = '#8fd8ff';

/** The display font for letters drawn as Phaser text (self-hosted, see main.tsx). */
export const DISPLAY_FONT = '"Baloo Bhaijaan 2", "Noto Sans Arabic", sans-serif';

export const SceneKeys = {
  Boot: 'Boot',
  Preload: 'Preload',
  Level: 'Level',
} as const;

/** Data passed to the level scene on (re)start. */
export interface LevelSceneData {
  levelId: number;
  runId: number;
}

/* ------------------------------ Player feel ------------------------------ */
/* Gentle values: the audience is 3–6 years old. Units are world pixels. */

export const GRAVITY = 2000;
export const MOVE_SPEED = 340;
export const GROUND_ACCEL = 2600;
export const AIR_ACCEL = 1700;
/** Jump apex = JUMP_SPEED² / (2·GRAVITY) ≈ 182 px. */
export const JUMP_SPEED = 853;
/**
 * Double jump: one extra jump in the air, a little stronger than the ground
 * jump (owner request), apex ≈ 900² / 4000 ≈ 202 px above where it starts.
 * Level layouts never require it.
 */
export const AIR_JUMPS = 1;
export const DOUBLE_JUMP_SPEED = 900;
/** Seconds after leaving a ledge during which a jump still counts. */
export const COYOTE_TIME = 0.2;
/** Seconds a jump press is remembered before landing. */
export const JUMP_BUFFER = 0.16;
export const MAX_FALL_SPEED = 1300;
export const RESPAWN_DURATION = 1.2;
/** Physics body size: narrower than the art, so near-misses count as landings. */
export const PLAYER_BODY = { width: 46, height: 128 } as const;
