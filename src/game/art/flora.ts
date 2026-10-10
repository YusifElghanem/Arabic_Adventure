import { PALETTE } from './palette';
import { n, svgDocument } from './svg';

/**
 * Small decorations that sit on platforms. Each is drawn standing on the
 * bottom-centre of its texture, so the game can sway it about its base
 * (origin 0.5, 1).
 */

export const FLOWER_SIZE = { width: 44, height: 84 } as const;

export function flowerSvg(petal: string): string {
  const { width: w, height: h } = FLOWER_SIZE;
  const cx = w / 2;
  const cy = 24;
  const petals = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return `<ellipse cx="${n(cx + Math.cos(a) * 11)}" cy="${n(cy + Math.sin(a) * 11)}" rx="8.5" ry="8.5" fill="${petal}"/>`;
  }).join('');
  return svgDocument(
    w,
    h,
    `<path d="M${cx},${h} C${cx - 2},${h - 20} ${cx + 4},${cy + 26} ${cx},${cy + 6}" fill="none" stroke="${PALETTE.leaf}" stroke-width="4" stroke-linecap="round"/>` +
      `<ellipse cx="${cx - 9}" cy="${h - 22}" rx="10" ry="5" fill="${PALETTE.leafLight}" transform="rotate(-30 ${cx - 9} ${h - 22})"/>` +
      `<ellipse cx="${cx + 9}" cy="${h - 32}" rx="10" ry="5" fill="${PALETTE.leaf}" transform="rotate(30 ${cx + 9} ${h - 32})"/>` +
      petals +
      `<circle cx="${cx}" cy="${cy}" r="9" fill="${PALETTE.candyYellow}"/>` +
      `<circle cx="${cx - 3.2}" cy="${cy - 1.5}" r="1.6" fill="${PALETTE.ink}"/><circle cx="${cx + 3.2}" cy="${cy - 1.5}" r="1.6" fill="${PALETTE.ink}"/>` +
      `<path d="M${cx - 3.5},${cy + 2.5} Q${cx},${cy + 6} ${cx + 3.5},${cy + 2.5}" fill="none" stroke="${PALETTE.ink}" stroke-width="1.4" stroke-linecap="round"/>`,
  );
}

export const LOLLIPOP_TREE_SIZE = { width: 96, height: 176 } as const;

export function lollipopTreeSvg(candy: string): string {
  const { width: w, height: h } = LOLLIPOP_TREE_SIZE;
  const cx = w / 2;
  const cy = 46;
  const r = 42;
  const stripes = [0, 1, 2, 3, 4]
    // Diagonal candy-cane stripes as plain parallelograms (no transform-origin, for Safari).
    .map((i) => {
      const y0 = cy + 30 + i * 22;
      return `<path d="M${cx - 5},${y0 + 5} L${cx + 5},${y0} L${cx + 5},${y0 + 8} L${cx - 5},${y0 + 13} Z" fill="${PALETTE.candyPink}"/>`;
    })
    .join('');
  // Swirl: a spiral stroke from the centre outwards.
  let spiral = `M${cx},${cy}`;
  for (let t = 0.2; t <= Math.PI * 5; t += 0.3) {
    const rr = (t / (Math.PI * 5)) * (r - 6);
    spiral += ` L${n(cx + Math.cos(t) * rr)},${n(cy + Math.sin(t) * rr)}`;
  }
  return svgDocument(
    w,
    h,
    `<rect x="${cx - 5}" y="${cy + 20}" width="10" height="${h - cy - 20}" rx="5" fill="#fff"/>` +
      `<g clip-path="url(#stick)">${stripes}</g>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${candy}"/>` +
      `<path d="${spiral}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>` +
      `<ellipse cx="${cx - 15}" cy="${cy - 18}" rx="12" ry="7" fill="#fff" opacity="0.65" transform="rotate(-30 ${cx - 15} ${cy - 18})"/>`,
    `<clipPath id="stick"><rect x="${cx - 5}" y="${cy + 20}" width="10" height="${h - cy - 20}" rx="5"/></clipPath>`,
  );
}

export const GUMDROP_SIZE = { width: 84, height: 60 } as const;

export function gumdropBushSvg(colour: string): string {
  const { width: w, height: h } = GUMDROP_SIZE;
  const dots = [[24, 28], [40, 18], [56, 26], [32, 42], [62, 40], [48, 36]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff" opacity="0.85"/>`)
    .join('');
  return svgDocument(
    w,
    h,
    `<path d="M4,${h} Q2,6 ${w / 2},6 Q${w - 2},6 ${w - 4},${h} Z" fill="${colour}"/>` +
      `<ellipse cx="${w * 0.36}" cy="18" rx="12" ry="6" fill="#fff" opacity="0.5" transform="rotate(-20 ${w * 0.36} 18)"/>` +
      dots,
  );
}

export const GRASS_TUFT_SIZE = { width: 56, height: 28 } as const;

export function grassTuftSvg(): string {
  const { width: w, height: h } = GRASS_TUFT_SIZE;
  const blades = [[8, 10, -0.5], [18, 2, -0.2], [28, 0, 0], [38, 3, 0.25], [48, 11, 0.5]]
    .map(([x, top, lean], i) => {
      const tipX = x + lean * 12;
      return `<path d="M${x - 5},${h} Q${x - 2},${(h + top) / 2} ${n(tipX)},${top} Q${x + 2},${(h + top) / 2} ${x + 5},${h} Z" fill="${i % 2 ? PALETTE.leafLight : PALETTE.leaf}"/>`;
    })
    .join('');
  return svgDocument(w, h, blades);
}

export const MUSHROOM_SIZE = { width: 64, height: 64 } as const;

export function candyMushroomSvg(): string {
  const { width: w, height: h } = MUSHROOM_SIZE;
  return svgDocument(
    w,
    h,
    `<path d="M24,${h} L26,34 Q32,30 38,34 L40,${h} Z" fill="#fff4e6"/>` +
      `<path d="M4,36 Q4,6 32,6 Q60,6 60,36 Q46,42 32,40 Q18,42 4,36 Z" fill="${PALETTE.candyPink}"/>` +
      [[18, 22, 5], [34, 14, 6], [48, 26, 4.5], [30, 30, 3.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join(''),
  );
}

/* ---------------------------------- FX ----------------------------------- */

export const SPARKLE_SIZE = { width: 32, height: 32 } as const;

/** A soft four-point twinkle, drawn white so particles can tint it any candy colour. */
export function sparkleSvg(): string {
  const c = 16;
  return svgDocument(
    32,
    32,
    `<circle cx="${c}" cy="${c}" r="12" fill="url(#g)"/>` +
      `<path d="M${c},2 Q${c + 2.5},${c - 2.5} 30,${c} Q${c + 2.5},${c + 2.5} ${c},30 Q${c - 2.5},${c + 2.5} 2,${c} Q${c - 2.5},${c - 2.5} ${c},2 Z" fill="#fff"/>`,
    `<radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
  );
}

export const BUTTERFLY_SIZE = { width: 60, height: 48 } as const;

export function butterflySvg(wing: string, spot: string): string {
  const { width: w } = BUTTERFLY_SIZE;
  const c = w / 2;
  const half = (side: 1 | -1) =>
    `<g transform="translate(${c} 0) scale(${side} 1)">` +
    `<path d="M2,20 C8,2 26,0 28,10 C30,20 16,24 2,22 Z" fill="${wing}"/>` +
    `<path d="M2,24 C14,24 24,30 20,40 C16,47 6,42 2,28 Z" fill="${wing}" opacity="0.9"/>` +
    `<circle cx="17" cy="11" r="4.5" fill="${spot}"/><circle cx="12" cy="33" r="3.2" fill="${spot}"/>` +
    `</g>`;
  return svgDocument(
    w,
    48,
    half(1) +
      half(-1) +
      `<rect x="${c - 2.5}" y="12" width="5" height="26" rx="2.5" fill="${PALETTE.ink}"/>` +
      `<path d="M${c - 1},13 Q${c - 6},4 ${c - 10},5 M${c + 1},13 Q${c + 6},4 ${c + 10},5" fill="none" stroke="${PALETTE.ink}" stroke-width="1.6" stroke-linecap="round"/>`,
  );
}
