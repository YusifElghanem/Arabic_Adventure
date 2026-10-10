/**
 * Small helpers for authoring SVG art in code: document wrapper, data URIs,
 * deterministic randomness, and smooth (optionally seamless/periodic) curves.
 */

export type Point = readonly [number, number];

/** Rounds to 2 decimals to keep generated SVG compact. */
export const n = (value: number): number => Math.round(value * 100) / 100;

export function svgDocument(width: number, height: number, body: string, defs = ''): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    (defs ? `<defs>${defs}</defs>` : '') +
    body +
    '</svg>'
  );
}

/**
 * Base64 data URI. Phaser's loader decodes every data: URI with atob, so
 * percent-encoded URIs fail; bytes go through TextEncoder so any UTF-8 is safe.
 */
export function toDataUri(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

/** Deterministic PRNG (mulberry32), so generated art is identical on every load. */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const range = (random: () => number, min: number, max: number): number => min + random() * (max - min);

/**
 * Samples y = f(x) at `samples` even intervals across [0, width], inclusive
 * of both ends. Use a periodic f (integer wave counts) for seamless tiles.
 */
export function sampleCurve(width: number, samples: number, f: (x: number) => number): Point[] {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const x = (i / samples) * width;
    return [x, f(x)] as const;
  });
}

/** Catmull-Rom → cubic Bézier for one segment. */
function segment(p0: Point, p1: Point, p2: Point, p3: Point): string {
  const c1x = p1[0] + (p2[0] - p0[0]) / 6;
  const c1y = p1[1] + (p2[1] - p0[1]) / 6;
  const c2x = p2[0] - (p3[0] - p1[0]) / 6;
  const c2y = p2[1] - (p3[1] - p1[1]) / 6;
  return `C${n(c1x)},${n(c1y)} ${n(c2x)},${n(c2y)} ${n(p2[0])},${n(p2[1])}`;
}

/**
 * A smooth curve through points that are periodic over `width`: the first
 * and last points share y, and the tangents match across the wrap, so tiles
 * placed side by side join without a visible seam. Returns path commands
 * starting with M.
 */
export function periodicCurvePath(points: readonly Point[], width: number): string {
  const last = points.length - 1;
  const at = (i: number): Point => {
    if (i < 0) return [points[last + i][0] - width, points[last + i][1]];
    if (i > last) return [points[i - last][0] + width, points[i - last][1]];
    return points[i];
  };
  let d = `M${n(points[0][0])},${n(points[0][1])}`;
  for (let i = 0; i < last; i++) d += segment(at(i - 1), at(i), at(i + 1), at(i + 2));
  return d;
}

/** A smooth open curve through points (end tangents are clamped). Starts with M. */
export function curvePath(points: readonly Point[]): string {
  const last = points.length - 1;
  const at = (i: number): Point => points[Math.min(last, Math.max(0, i))];
  let d = `M${n(points[0][0])},${n(points[0][1])}`;
  for (let i = 0; i < last; i++) d += segment(at(i - 1), at(i), at(i + 1), at(i + 2));
  return d;
}

/** Same as curvePath but continuing an existing path (no leading M). */
export const curveContinue = (points: readonly Point[]): string => curvePath(points).replace(/^M[^C]*/, '');
