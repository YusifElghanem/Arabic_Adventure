import { describe, expect, it } from 'vitest';
import { fixedView, layerLeft, wrap } from './view';

const camera = (width: number, height: number, zoom: number, scrollX = 0) => ({ width, height, zoom, scrollX }) as never;

describe('fixedView', () => {
  it('is the whole canvas at zoom 1', () => {
    expect(fixedView(camera(1280, 720, 1))).toEqual({ left: 0, top: 0, width: 1280, height: 720 });
  });

  it('grows around the centre when zoomed out and shrinks when zoomed in', () => {
    const out = fixedView(camera(1000, 1000, 0.5));
    expect(out).toEqual({ left: -500, top: -500, width: 2000, height: 2000 });
    const zoomIn = fixedView(camera(1000, 1000, 2));
    expect(zoomIn).toEqual({ left: 250, top: 250, width: 500, height: 500 });
  });
});

describe('layerLeft', () => {
  it('scrolls slower for distant layers', () => {
    const cam = camera(1280, 720, 1, 1000);
    const view = fixedView(cam);
    expect(layerLeft(cam, view, 1)).toBe(1000);
    expect(layerLeft(cam, view, 0.25)).toBe(250);
    expect(layerLeft(cam, view, 0)).toBe(0);
  });
});

describe('wrap', () => {
  it('wraps positive and negative values into range', () => {
    expect(wrap(5, 10)).toBe(5);
    expect(wrap(15, 10)).toBe(5);
    expect(wrap(-3, 10)).toBe(7);
  });
});
