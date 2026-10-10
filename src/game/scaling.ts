import { DESIGN_HEIGHT, MAX_PIXEL_RATIO, MIN_VISIBLE_WIDTH } from './constants';

/**
 * Screen-size maths, kept as pure functions so they can be unit tested
 * without a browser or Phaser.
 */

export interface CanvasSize {
  /** Backing-store size in device pixels. */
  width: number;
  height: number;
  /** Device pixel ratio used. */
  pixelRatio: number;
}

/** Device-pixel canvas size for a CSS-pixel container (rounded, at least 1×1). */
export function computeCanvasSize(cssWidth: number, cssHeight: number, devicePixelRatio: number): CanvasSize {
  const pixelRatio = Math.min(Math.max(devicePixelRatio || 1, 1), MAX_PIXEL_RATIO);
  return {
    width: Math.max(1, Math.round(cssWidth * pixelRatio)),
    height: Math.max(1, Math.round(cssHeight * pixelRatio)),
    pixelRatio,
  };
}

/**
 * Camera zoom so that DESIGN_HEIGHT world pixels fill the screen height,
 * zoomed out further on narrow (portrait) screens so at least
 * MIN_VISIBLE_WIDTH of the world stays visible.
 */
export function computeCameraZoom(canvasWidth: number, canvasHeight: number): number {
  if (canvasWidth <= 0 || canvasHeight <= 0) return 1;
  return Math.min(canvasHeight / DESIGN_HEIGHT, canvasWidth / MIN_VISIBLE_WIDTH);
}
