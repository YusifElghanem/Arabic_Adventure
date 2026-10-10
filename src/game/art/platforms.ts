import { PALETTE, SPRINKLES } from './palette';
import { curvePath, n, sampleCurve, svgDocument, type Point } from './svg';

/**
 * Candy floating-island platforms, built from tiles: a rounded left cap,
 * two interchangeable middle tiles, and a right cap (the mirrored left
 * cap). Any width is just cap + N middles + cap, so nothing is ever
 * stretched.
 *
 * Every horizontal feature (frosting top, drip line, caramel body,
 * chocolate stripe, underside joint) is a function of x with a period that
 * divides the tile width, so tiles join seamlessly in any order.
 *
 * Layout (tile-local y):
 *   0 ─────────── transparent headroom for frosting bumps
 *   SURFACE_Y ─── the walkable top (physics surface)
 *   ~60 ───────── frosting drip line
 *   54–138 ────── caramel body with a chocolate stripe
 *   138–200 ───── chocolate rock stalactites (decorative underside)
 */

export const PLATFORM_TILE_HEIGHT = 200;
export const PLATFORM_MID_WIDTH = 128;
export const PLATFORM_CAP_WIDTH = 96;
/** Tile-local y of the walking surface. */
export const PLATFORM_SURFACE_Y = 30;
/** Depth of the solid part below the surface (for the physics body). */
export const PLATFORM_SOLID_DEPTH = 108;

const DRIP_BASE = 60;
const BODY_TOP = 54;
const BODY_BOTTOM = 138;

/** Frosting top: gentle bumps, period 64 (divides 128). Even function, so mirroring is seamless. */
export const frostingTop = (x: number): number => PLATFORM_SURFACE_Y + 2 * (1 - Math.cos((2 * Math.PI * x) / 64));
/** Chocolate stripe centre line, period 128. */
export const stripeCentre = (x: number): number => 104 + 3 * Math.sin((2 * Math.PI * x) / PLATFORM_MID_WIDTH);

const defs =
  `<linearGradient id="caramel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PALETTE.caramelLight}"/>` +
  `<stop offset="1" stop-color="${PALETTE.caramelDeep}"/></linearGradient>` +
  `<linearGradient id="choc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PALETTE.chocolate}"/>` +
  `<stop offset="1" stop-color="${PALETTE.chocolateDeep}"/></linearGradient>` +
  `<linearGradient id="frost" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PALETTE.frosting}"/>` +
  `<stop offset="1" stop-color="${PALETTE.frostingDeep}"/></linearGradient>`;

interface Drip {
  x: number;
  length: number;
  width: number;
}

/**
 * The frosting's lower edge along DRIP_BASE from x = `from` to x = `to` (either
 * direction), with rounded drips hanging off it. Starts with an L command.
 */
function dripLine(from: number, to: number, drips: readonly Drip[]): string {
  const dir = Math.sign(to - from) || 1;
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  let d = `L${n(from)},${DRIP_BASE}`;
  const ordered = drips.filter((drip) => drip.x > lo && drip.x < hi).sort((a, b) => dir * (a.x - b.x));
  for (const drip of ordered) {
    const half = drip.width / 2;
    const tip = DRIP_BASE + drip.length;
    const near = drip.x - dir * half;
    const far = drip.x + dir * half;
    d +=
      ` L${n(near - dir * 4)},${DRIP_BASE}` +
      ` C${n(near)},${DRIP_BASE} ${n(near)},${n(tip)} ${n(drip.x)},${n(tip)}` +
      ` C${n(far)},${n(tip)} ${n(far)},${DRIP_BASE} ${n(far + dir * 4)},${DRIP_BASE}`;
  }
  return `${d} L${n(to)},${DRIP_BASE}`;
}

function sprinkles(items: readonly [x: number, y: number, angle: number][]): string {
  return items
    .map(
      ([x, y, a], i) =>
        `<rect x="${n(x - 5)}" y="${n(y - 1.6)}" width="10" height="3.2" rx="1.6" fill="${SPRINKLES[i % SPRINKLES.length]}" transform="rotate(${a} ${n(x)} ${n(y)})"/>`,
    )
    .join('');
}

function midTile(variant: 'a' | 'b'): string {
  const w = PLATFORM_MID_WIDTH;
  const top = sampleCurve(w, 16, frostingTop);
  const drips: Drip[] =
    variant === 'a'
      ? [{ x: 38, length: 22, width: 18 }, { x: 94, length: 13, width: 14 }]
      : [{ x: 22, length: 14, width: 14 }, { x: 68, length: 26, width: 20 }, { x: 108, length: 10, width: 12 }];
  const underside =
    variant === 'a'
      ? `M0,${BODY_BOTTOM} C30,${BODY_BOTTOM + 2} 44,196 64,196 C84,196 98,${BODY_BOTTOM + 2} ${w},${BODY_BOTTOM} Z`
      : `M0,${BODY_BOTTOM} C14,${BODY_BOTTOM + 1} 22,176 36,176 C50,176 54,${BODY_BOTTOM + 2} 64,${BODY_BOTTOM + 2} ` +
        `C74,${BODY_BOTTOM + 2} 82,188 96,188 C110,188 116,${BODY_BOTTOM + 1} ${w},${BODY_BOTTOM} Z`;
  const stripe = sampleCurve(w, 16, stripeCentre);
  const stripeTop = curvePath(stripe.map(([x, y]) => [x, y - 6] as Point));
  const stripeBottom = curvePath([...stripe].reverse().map(([x, y]) => [x, y + 6] as Point)).replace(/^M/, 'L');
  const sprinkleSet: [number, number, number][] =
    variant === 'a'
      ? [[20, 44, 30], [52, 40, -20], [76, 47, 70], [108, 42, 10]]
      : [[12, 42, -40], [40, 47, 15], [88, 40, 60], [116, 46, -15]];

  const body =
    `<path d="${underside}" fill="url(#choc)"/>` +
    `<rect x="0" y="${BODY_TOP}" width="${w}" height="${BODY_BOTTOM - BODY_TOP}" fill="url(#caramel)"/>` +
    `<path d="${stripeTop} ${stripeBottom} Z" fill="${PALETTE.chocolate}" opacity="0.85"/>` +
    `<path d="${curvePath(top)} ${dripLine(w, 0, drips)} Z" fill="url(#frost)"/>` +
    `<path d="${curvePath(top.map(([x, y]) => [x, y + 5] as Point))}" fill="none" stroke="${PALETTE.frostingLight}" stroke-width="4" stroke-opacity="0.85"/>` +
    sprinkles(sprinkleSet);
  return svgDocument(w, PLATFORM_TILE_HEIGHT, body, defs);
}

/** Left end cap. Its right edge (x = 96) joins a middle tile's left edge (x = 0). */
function leftCap(): string {
  const w = PLATFORM_CAP_WIDTH;
  // Map cap x to middle-tile phase so the joint at x = w matches mid x = 0.
  const u = (x: number) => x - w + PLATFORM_MID_WIDTH * 2;
  const top = sampleCurve(w - 30, 10, (x) => frostingTop(u(x + 30))).map(([x, y]) => [x + 30, y] as Point);
  const topRtl = [...top].reverse();
  const stripe = [12, 30, 50, 70, w].map((x) => [x, stripeCentre(u(x))] as Point);

  const body =
    `<path d="M${w},${BODY_BOTTOM} C80,${BODY_BOTTOM + 2} 72,186 56,186 C40,186 24,154 12,118 Z" fill="url(#choc)"/>` +
    `<path d="M${w},${BODY_TOP} L40,${BODY_TOP} Q12,${BODY_TOP} 12,82 L12,110 Q12,${BODY_BOTTOM} 40,${BODY_BOTTOM} L${w},${BODY_BOTTOM} Z" fill="url(#caramel)"/>` +
    `<path d="${curvePath(stripe.map(([x, y]) => [x, y - 6] as Point))} ${curvePath(
      [...stripe].reverse().map(([x, y]) => [x, y + 6] as Point),
    ).replace(/^M/, 'L')} Z" fill="${PALETTE.chocolate}" opacity="0.85"/>` +
    // Frosting: along the top from the joint, round the corner, drip line back.
    `<path d="${curvePath(topRtl)} Q6,${PLATFORM_SURFACE_Y} 6,50 L6,54 Q6,${DRIP_BASE + 2} 18,${DRIP_BASE} ` +
    `${dripLine(18, w, [{ x: 46, length: 18, width: 16 }])} Z" fill="url(#frost)"/>` +
    `<path d="${curvePath(topRtl.map(([x, y]) => [x, y + 5] as Point))} Q14,${PLATFORM_SURFACE_Y + 5} 13,46" fill="none" stroke="${PALETTE.frostingLight}" stroke-width="4" stroke-opacity="0.85" stroke-linecap="round"/>` +
    sprinkles([[30, 44, 40], [62, 41, -25], [84, 48, 75]]);
  return svgDocument(w, PLATFORM_TILE_HEIGHT, body, defs);
}

/** Right cap: the left cap mirrored, so both ends always match. */
function rightCap(): string {
  const inner = leftCap().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const w = PLATFORM_CAP_WIDTH;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${PLATFORM_TILE_HEIGHT}" viewBox="0 0 ${w} ${PLATFORM_TILE_HEIGHT}"><g transform="translate(${w} 0) scale(-1 1)">${inner}</g></svg>`;
}

export const platformMidASvg = () => midTile('a');
export const platformMidBSvg = () => midTile('b');
export const platformLeftSvg = leftCap;
export const platformRightSvg = rightCap;
