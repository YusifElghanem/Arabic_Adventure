import { describe, expect, it } from 'vitest';
import {
  MAX_REGION_SHARE,
  MIN_REGION_SHARE,
  clampRegion,
  defaultFaceRegion,
  detectFaceBoxFromPixels,
  findFaceBlob,
  isSkinPixel,
  loadPhoto,
  regionFromFaceBox,
  scaleRegion,
} from './faceCropper';

type RGB = [number, number, number];

/** Paints an RGBA buffer: background colour, then filled ellipses on top. */
function paint(
  width: number,
  height: number,
  background: RGB,
  ellipses: { cx: number; cy: number; rx: number; ry: number; color: RGB }[],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let color = background;
      for (const e of ellipses) {
        if (((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 <= 1) color = e.color;
      }
      const p = (y * width + x) * 4;
      data[p] = color[0];
      data[p + 1] = color[1];
      data[p + 2] = color[2];
      data[p + 3] = 255;
    }
  }
  return data;
}

describe('isSkinPixel', () => {
  it.each<[string, RGB]>([
    ['very light', [255, 224, 196]],
    ['light', [241, 194, 167]],
    ['medium', [198, 134, 66]],
    ['tan', [224, 172, 105]],
    ['brown', [141, 85, 36]],
    ['dark', [90, 56, 37]],
  ])('accepts %s skin', (_, [r, g, b]) => {
    expect(isSkinPixel(r, g, b)).toBe(true);
  });

  it.each<[string, RGB]>([
    ['white wall', [255, 255, 255]],
    ['black', [10, 10, 10]],
    ['sky blue', [120, 180, 240]],
    ['grass green', [60, 160, 70]],
    ['grey', [128, 128, 128]],
    ['purple', [140, 60, 200]],
  ])('rejects %s', (_, [r, g, b]) => {
    expect(isSkinPixel(r, g, b)).toBe(false);
  });
});

describe('findFaceBlob', () => {
  it('returns null for an empty mask', () => {
    expect(findFaceBlob(new Uint8Array(100), 10, 10)).toBeNull();
  });

  it('ignores specks smaller than the minimum share', () => {
    const mask = new Uint8Array(100 * 100);
    mask[5050] = 1;
    mask[5051] = 1;
    expect(findFaceBlob(mask, 100, 100)).toBeNull();
  });

  it('prefers the large central blob over a small corner blob', () => {
    const w = 100;
    const h = 100;
    const mask = new Uint8Array(w * h);
    const fillRect = (x0: number, y0: number, x1: number, y1: number) => {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) mask[y * w + x] = 1;
    };
    fillRect(0, 0, 8, 8); // corner speck (64 px, above the minimum share)
    fillRect(35, 25, 65, 60); // central face-sized blob
    expect(findFaceBlob(mask, w, h)).toEqual({ x: 35, y: 25, width: 30, height: 35 });
  });

  it('rejects thin, sparse streaks such as furniture edges', () => {
    const w = 100;
    const h = 100;
    const mask = new Uint8Array(w * h);
    // A diagonal line: large bounding box, very low fill.
    for (let i = 0; i < 100; i++) {
      mask[i * w + i] = 1;
      if (i < 99) mask[i * w + i + 1] = 1;
    }
    expect(findFaceBlob(mask, w, h)).toBeNull();
  });

  it('trims a face blob that runs down into the neck and body', () => {
    const w = 100;
    const h = 100;
    const mask = new Uint8Array(w * h);
    for (let y = 10; y < 95; y++) for (let x = 40; x < 60; x++) mask[y * w + x] = 1;
    const box = findFaceBlob(mask, w, h)!;
    expect(box.width).toBe(20);
    expect(box.height).toBe(27); // 20 * 1.35
    expect(box.y).toBe(10);
  });
});

describe('detectFaceBoxFromPixels', () => {
  it.each<[string, RGB]>([
    ['light', [241, 194, 167]],
    ['dark', [110, 70, 45]],
  ])('finds a %s-skinned face on a blue background', (_, skin) => {
    const data = paint(120, 120, [90, 150, 230], [{ cx: 60, cy: 50, rx: 22, ry: 28, color: skin }]);
    const box = detectFaceBoxFromPixels(data, 120, 120)!;
    expect(box).not.toBeNull();
    expect(Math.abs(box.x + box.width / 2 - 60)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y + box.height / 2 - 50)).toBeLessThanOrEqual(1.5);
    expect(box.width).toBeGreaterThanOrEqual(42);
    expect(box.width).toBeLessThanOrEqual(46);
  });

  it('returns null when the photo has no skin', () => {
    const data = paint(80, 80, [60, 160, 70], [{ cx: 40, cy: 40, rx: 20, ry: 20, color: [120, 180, 240] }]);
    expect(detectFaceBoxFromPixels(data, 80, 80)).toBeNull();
  });

  it('ignores transparent pixels', () => {
    const data = paint(50, 50, [241, 194, 167], []);
    for (let p = 3; p < data.length; p += 4) data[p] = 0;
    expect(detectFaceBoxFromPixels(data, 50, 50)).toBeNull();
  });
});

describe('regions', () => {
  it('pads the face box into a taller-than-wide oval', () => {
    const region = regionFromFaceBox({ x: 100, y: 100, width: 100, height: 120 });
    expect(region.cx).toBe(150);
    expect(region.cy).toBeLessThan(160); // shifted towards the forehead
    expect(region.rx).toBeGreaterThan(50);
    expect(region.ry / region.rx).toBeGreaterThanOrEqual(1.1);
    expect(region.ry / region.rx).toBeLessThanOrEqual(1.4);
  });

  it('keeps the oval ratio sane even for odd boxes', () => {
    const wide = regionFromFaceBox({ x: 0, y: 0, width: 200, height: 40 });
    expect(wide.ry / wide.rx).toBeCloseTo(1.1);
    const tall = regionFromFaceBox({ x: 0, y: 0, width: 40, height: 400 });
    expect(tall.ry / tall.rx).toBeCloseTo(1.4);
  });

  it('default region is centred in the upper part of the frame', () => {
    const region = defaultFaceRegion(1000, 800);
    expect(region.cx).toBe(500);
    expect(region.cy).toBeLessThan(400);
    expect(region.ry).toBeGreaterThan(region.rx);
  });

  it('clamps size and position to the image', () => {
    const tooBig = clampRegion({ cx: 5000, cy: -50, rx: 4000, ry: 5000 }, 1000, 800);
    expect(tooBig.cx).toBe(1000);
    expect(tooBig.cy).toBe(0);
    expect(tooBig.ry).toBeCloseTo(800 * MAX_REGION_SHARE);

    const tooSmall = clampRegion({ cx: 10, cy: 10, rx: 1, ry: 1 }, 1000, 800);
    expect(tooSmall.ry).toBeCloseTo(800 * MIN_REGION_SHARE);
    expect(tooSmall.ry / tooSmall.rx).toBeCloseTo(1.1);
  });

  it('scales about the centre', () => {
    const scaled = scaleRegion({ cx: 10, cy: 20, rx: 30, ry: 40 }, 1.5);
    expect(scaled).toEqual({ cx: 10, cy: 20, rx: 45, ry: 60 });
  });
});

describe('loadPhoto validation', () => {
  it('rejects non-image files', async () => {
    await expect(loadPhoto(new Blob(['hello'], { type: 'text/plain' }))).rejects.toMatchObject({
      code: 'not-an-image',
    });
  });

  it('rejects files over the size limit', async () => {
    const huge = { type: 'image/jpeg', size: 25 * 1024 * 1024 } as Blob;
    await expect(loadPhoto(huge)).rejects.toMatchObject({ code: 'too-large' });
  });
});
