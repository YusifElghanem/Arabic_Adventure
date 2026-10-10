import { PALETTE } from './palette';
import { createRandom, n, periodicCurvePath, range, sampleCurve, svgDocument, type Point } from './svg';

/**
 * Three seamless rolling-hill tiles for the parallax layers. Each ridge is a
 * sum of sine waves with whole-number wave counts across the tile width, so
 * the tile's left and right edges match exactly and repeat forever. Each
 * ridge gets a soft vertical gradient and a glossy candy rim highlight.
 * Decorations (lollipop trees, gumdrops, flowers) are kept away from the
 * tile edges so they never get cut in half at a seam.
 */

export const HILL_TILE = { width: 1024, height: 512 } as const;
/**
 * Transparent rows left at the bottom of every repeating strip. Tile
 * sprites wrap vertically too, so a solid bottom row would bleed into the
 * top edge as a faint line; the game covers this gap with a solid fill.
 */
export const STRIP_BOTTOM_PADDING = 4;

export interface Wave {
  /** Whole number of waves across the tile: keeps the tile seamless. */
  count: number;
  amplitude: number;
  phase: number;
}

export interface Ridge {
  base: number;
  waves: readonly Wave[];
}

export const ridgeHeight = (ridge: Ridge, x: number): number =>
  ridge.base + ridge.waves.reduce((y, w) => y + w.amplitude * Math.sin((2 * Math.PI * w.count * x) / HILL_TILE.width + w.phase), 0);

export const HILL_RIDGES = {
  farBack: { base: 210, waves: [{ count: 2, amplitude: 60, phase: 0.4 }, { count: 5, amplitude: 14, phase: 1.3 }] },
  farFront: { base: 270, waves: [{ count: 3, amplitude: 52, phase: 2.1 }, { count: 7, amplitude: 10, phase: 0.2 }] },
  mid: { base: 230, waves: [{ count: 2, amplitude: 70, phase: 1.1 }, { count: 4, amplitude: 22, phase: 2.6 }] },
  near: { base: 220, waves: [{ count: 3, amplitude: 56, phase: 0.6 }, { count: 6, amplitude: 14, phase: 1.9 }] },
} satisfies Record<string, Ridge>;

const SAMPLES = 128;

function ridgePath(ridge: Ridge): { fill: string; rim: string; points: Point[] } {
  const { width: w } = HILL_TILE;
  const h = HILL_TILE.height - STRIP_BOTTOM_PADDING;
  const points = sampleCurve(w, SAMPLES, (x) => ridgeHeight(ridge, x));
  const curve = periodicCurvePath(points, w);
  return { fill: `${curve} L${w},${h} L0,${h} Z`, rim: curve, points };
}

function ridgeLayer(id: string, ridge: Ridge, top: string, bottom: string, rim: string, rimOpacity = 0.75) {
  const path = ridgePath(ridge);
  const defs =
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
  const body =
    `<path d="${path.fill}" fill="url(#${id})"/>` +
    // Rim highlight just inside the ridge top; butt caps keep it seamless at the edges.
    `<path d="${path.rim}" transform="translate(0 9)" fill="none" stroke="${rim}" stroke-width="9" stroke-opacity="${rimOpacity}"/>`;
  return { defs, body };
}

/** Lollipop tree standing on (x, y): candy-striped stick and a swirl top. */
function lollipop(x: number, y: number, size: number, colour: string): string {
  const stick = size * 1.6;
  const r = size * 0.55;
  const cy = y - stick;
  const swirl = Array.from({ length: 3 }, (_, i) => {
    const rr = r * (0.85 - i * 0.27);
    return `<circle cx="${n(x)}" cy="${n(cy)}" r="${n(rr)}" fill="none" stroke="#fff" stroke-width="${n(r * 0.12)}" stroke-dasharray="${n(rr * 3)} ${n(rr * 1.4)}" stroke-linecap="round"/>`;
  }).join('');
  return (
    `<rect x="${n(x - size * 0.06)}" y="${n(cy)}" width="${n(size * 0.12)}" height="${n(stick)}" rx="${n(size * 0.06)}" fill="#fff"/>` +
    `<circle cx="${n(x)}" cy="${n(cy)}" r="${n(r)}" fill="${colour}"/>${swirl}` +
    `<ellipse cx="${n(x - r * 0.35)}" cy="${n(cy - r * 0.4)}" rx="${n(r * 0.28)}" ry="${n(r * 0.16)}" fill="#fff" opacity="0.7"/>`
  );
}

/** Gumdrop bush sitting on (x, y), sugar-dusted. */
function gumdrop(x: number, y: number, size: number, colour: string, random: () => number): string {
  const dots = Array.from({ length: 6 }, () => {
    const a = range(random, Math.PI * 1.1, Math.PI * 1.9);
    const rr = range(random, 0.2, 0.8) * size;
    return `<circle cx="${n(x + Math.cos(a) * rr)}" cy="${n(y + Math.sin(a) * rr * 0.8)}" r="${n(size * 0.05)}" fill="#fff" opacity="0.85"/>`;
  }).join('');
  return (
    `<path d="M${n(x - size)},${n(y + 4)} Q${n(x - size)},${n(y - size * 0.95)} ${n(x)},${n(y - size * 0.95)} Q${n(x + size)},${n(y - size * 0.95)} ${n(x + size)},${n(y + 4)} Z" fill="${colour}"/>` +
    dots
  );
}

export function farHillsSvg(): string {
  const back = ridgeLayer('fb', HILL_RIDGES.farBack, PALETTE.farHillA, '#c9a4ee', PALETTE.farHillLight, 0.55);
  const front = ridgeLayer('ff', HILL_RIDGES.farFront, PALETTE.farHillB, '#ef9cc6', PALETTE.farHillLight, 0.8);
  return svgDocument(HILL_TILE.width, HILL_TILE.height, back.body + front.body, back.defs + front.defs);
}

export function midHillsSvg(): string {
  const random = createRandom(31);
  const layer = ridgeLayer('m', HILL_RIDGES.mid, PALETTE.midHill, PALETTE.midHillDeep, PALETTE.midHillLight);
  const colours = [PALETTE.candyPink, PALETTE.candyPurple, PALETTE.candyOrange, PALETTE.candyBlue];
  let decor = '';
  // Fixed slots, inset from the edges so nothing is cut at the seam.
  [150, 330, 560, 720, 880].forEach((x, i) => {
    const y = ridgeHeight(HILL_RIDGES.mid, x) + 6;
    decor +=
      i % 2 === 0
        ? lollipop(x, y, range(random, 34, 46), colours[i % colours.length])
        : gumdrop(x, y, range(random, 26, 34), colours[(i + 1) % colours.length], random);
  });
  return svgDocument(HILL_TILE.width, HILL_TILE.height, layer.body + decor, layer.defs);
}

export function nearHillsSvg(): string {
  const random = createRandom(47);
  const layer = ridgeLayer('nh', HILL_RIDGES.near, PALETTE.nearHill, PALETTE.nearHillDeep, PALETTE.nearHillLight);
  const flowerColours = [PALETTE.candyPink, PALETTE.white, PALETTE.candyYellow, PALETTE.candyPurple];
  let decor = '';
  for (let i = 0; i < 34; i++) {
    const x = range(random, 30, HILL_TILE.width - 30);
    const y = ridgeHeight(HILL_RIDGES.near, x) + range(random, 26, 150);
    const c = flowerColours[i % flowerColours.length];
    const r = range(random, 4, 7);
    decor +=
      [0, 1, 2, 3, 4]
        .map((k) => {
          const a = (k / 5) * Math.PI * 2;
          return `<circle cx="${n(x + Math.cos(a) * r)}" cy="${n(y + Math.sin(a) * r)}" r="${n(r * 0.7)}" fill="${c}"/>`;
        })
        .join('') + `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.55)}" fill="${PALETTE.candyYellow}"/>`;
  }
  return svgDocument(HILL_TILE.width, HILL_TILE.height, layer.body + decor, layer.defs);
}
