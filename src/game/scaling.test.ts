import { describe, expect, it } from 'vitest';
import { DESIGN_HEIGHT, MAX_PIXEL_RATIO, MIN_VISIBLE_WIDTH } from './constants';
import { computeCameraZoom, computeCanvasSize } from './scaling';

describe('computeCanvasSize', () => {
  it('scales CSS pixels by the device pixel ratio', () => {
    expect(computeCanvasSize(800, 600, 2)).toEqual({ width: 1600, height: 1200, pixelRatio: 2 });
  });

  it('caps very high pixel ratios', () => {
    expect(computeCanvasSize(400, 800, 3.5).pixelRatio).toBe(MAX_PIXEL_RATIO);
  });

  it('treats missing or sub-1 ratios as 1 and never returns zero size', () => {
    expect(computeCanvasSize(0, 0, 0)).toEqual({ width: 1, height: 1, pixelRatio: 1 });
    expect(computeCanvasSize(1000, 500, 0.5).pixelRatio).toBe(1);
  });
});

describe('computeCameraZoom', () => {
  it('fits the design height on landscape screens', () => {
    expect(computeCameraZoom(1920, 1080)).toBeCloseTo(1080 / DESIGN_HEIGHT);
    expect(computeCameraZoom(2560, 1440)).toBeCloseTo(2);
  });

  it('zooms out on portrait phones to keep enough width visible', () => {
    const zoom = computeCameraZoom(780, 1688);
    expect(780 / zoom).toBeCloseTo(MIN_VISIBLE_WIDTH);
    expect(1688 / zoom).toBeGreaterThan(DESIGN_HEIGHT);
  });

  it('is safe for zero-sized canvases', () => {
    expect(computeCameraZoom(0, 0)).toBe(1);
  });
});
