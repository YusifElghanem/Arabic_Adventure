import { describe, expect, it } from 'vitest';
import { chooseArtResolution } from '../assets';
import { ART } from './index';
import { CLOUDS, CLOUD_SEA_SIZE, cloudSeaEdge, fitCloud } from './clouds';
import { HILL_RIDGES, HILL_TILE, ridgeHeight } from './hills';
import { PLATFORM_MID_WIDTH, frostingTop, stripeCentre } from './platforms';
import { periodicCurvePath, sampleCurve, toDataUri } from './svg';

const slope = (f: (x: number) => number, x: number, h = 1e-4) => (f(x + h) - f(x - h)) / (2 * h);

describe('art manifest', () => {
  it('has unique keys', () => {
    const keys = ART.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(ART.map((a) => [a.key, a] as const))('%s is valid SVG at its declared size', (_, piece) => {
    const doc = new DOMParser().parseFromString(piece.svg(), 'image/svg+xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    const root = doc.documentElement;
    expect(root.tagName).toBe('svg');
    expect(Number(root.getAttribute('width'))).toBe(piece.width);
    expect(Number(root.getAttribute('height'))).toBe(piece.height);
    expect(piece.svg()).toBe(piece.svg()); // deterministic
  });
});

describe('seamless tiles', () => {
  it.each(Object.entries(HILL_RIDGES))('hill ridge "%s" matches height and slope at both edges', (_, ridge) => {
    const f = (x: number) => ridgeHeight(ridge, x);
    expect(f(HILL_TILE.width)).toBeCloseTo(f(0), 9);
    expect(slope(f, HILL_TILE.width)).toBeCloseTo(slope(f, 0), 6);
  });

  it('hill ridges stay inside the tile', () => {
    for (const ridge of Object.values(HILL_RIDGES)) {
      for (let x = 0; x <= HILL_TILE.width; x += 8) {
        const y = ridgeHeight(ridge, x);
        expect(y).toBeGreaterThan(60); // room for decorations on top
        expect(y).toBeLessThan(HILL_TILE.height - 100);
      }
    }
  });

  it('cloud sea edge repeats', () => {
    const f = (x: number) => cloudSeaEdge(x, 9, 128, 40);
    expect(f(CLOUD_SEA_SIZE.width)).toBeCloseTo(f(0), 9);
  });

  it('platform features repeat across a middle tile, and the frosting mirrors cleanly', () => {
    expect(frostingTop(PLATFORM_MID_WIDTH)).toBeCloseTo(frostingTop(0), 9);
    expect(stripeCentre(PLATFORM_MID_WIDTH)).toBeCloseTo(stripeCentre(0), 9);
    expect(slope(stripeCentre, PLATFORM_MID_WIDTH)).toBeCloseTo(slope(stripeCentre, 0), 6);
    for (const x of [5, 17, 40]) expect(frostingTop(-x)).toBeCloseTo(frostingTop(x), 9);
  });

  it('periodic curves start and end on the sampled edge points', () => {
    const points = sampleCurve(100, 10, (x) => 50 + 10 * Math.sin((2 * Math.PI * x) / 100));
    const d = periodicCurvePath(points, 100);
    expect(d.startsWith('M0,50')).toBe(true);
    expect(d.endsWith(' 100,50')).toBe(true);
  });
});

describe('clouds', () => {
  it.each(Object.entries(CLOUDS))('%s fits every puff (and its shade) inside the texture', (_, cloud) => {
    for (const [x, y, r] of cloud.puffs) {
      expect(x - r).toBeGreaterThanOrEqual(0);
      expect(y - r).toBeGreaterThanOrEqual(0);
      expect(x + r).toBeLessThanOrEqual(cloud.width);
      expect(y + r + 9).toBeLessThanOrEqual(cloud.height);
    }
  });

  it('fitCloud normalises any puff layout', () => {
    const fitted = fitCloud({ puffs: [[-50, -20, 30], [40, 10, 20]] });
    expect(Math.min(...fitted.puffs.map(([x, , r]) => x - r))).toBeGreaterThan(0);
  });
});

describe('encoding and resolution', () => {
  it('toDataUri produces base64 that decodes back to the original, including non-ASCII', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>أ ب ✨</text></svg>';
    const uri = toDataUri(svg);
    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const bytes = Uint8Array.from(atob(uri.split(',')[1]), (c) => c.charCodeAt(0));
    expect(new TextDecoder().decode(bytes)).toBe(svg);
  });

  it('uses 2x art only when the camera zooms in noticeably', () => {
    expect(chooseArtResolution(0.8)).toBe(1);
    expect(chooseArtResolution(1.08)).toBe(1);
    expect(chooseArtResolution(1.5)).toBe(2);
    expect(chooseArtResolution(2.13)).toBe(2);
  });
});
