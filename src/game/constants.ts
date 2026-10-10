/** Engine-wide constants. World units are pixels at the design height. */

/** Every screen sees this much world height; the visible width adapts to the screen. */
export const DESIGN_HEIGHT = 720;
/** Minimum visible world width, so tall phone screens still see what's ahead. */
export const MIN_VISIBLE_WIDTH = 960;
/** Cap on the device pixel ratio: sharp on retina, without burning low-end GPUs. */
export const MAX_PIXEL_RATIO = 2;

export const SKY_COLOR = '#8fd8ff';

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
