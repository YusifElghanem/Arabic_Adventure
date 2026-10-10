import type Phaser from 'phaser';

/**
 * The visible rectangle in "screen-fixed" coordinates (objects with
 * scrollFactor 0). Phaser zooms around the camera centre, so at zoom z a
 * fixed object at x shows at (x - W/2)·z + W/2. To cover the screen exactly,
 * a fixed object must span [W/2 - W/(2z), W/2 + W/(2z)].
 */
export interface FixedView {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function fixedView(camera: Phaser.Cameras.Scene2D.Camera): FixedView {
  const { width: w, height: h, zoom } = camera;
  return { left: w / 2 - w / (2 * zoom), top: h / 2 - h / (2 * zoom), width: w / zoom, height: h / zoom };
}

/**
 * For a layer with parallax factor `factor`, the layer-space x shown at the
 * left edge of the screen. Phaser's own scrollFactor maths is
 * x_screen = x - scrollX·factor in fixed space.
 */
export const layerLeft = (camera: Phaser.Cameras.Scene2D.Camera, view: FixedView, factor: number): number =>
  camera.scrollX * factor + view.left;

/** Positive modulo, for wrapping drifting objects. */
export const wrap = (value: number, size: number): number => ((value % size) + size) % size;
