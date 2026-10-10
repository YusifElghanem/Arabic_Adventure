import { PALETTE } from './palette';
import { curvePath, n, svgDocument, type Point } from './svg';

/**
 * Art for the learning mechanics: the Mystery Block, the letter ب (a
 * bouncy bowl) and its dot, the giant smiling أ, the lion (أسد), stars and
 * the rainbow goal arch. Letters are drawn without diacritics, as taught
 * in kindergarten.
 */

/* ------------------------------ Mystery block ----------------------------- */

export const BLOCK_SIZE = { width: 92, height: 92 } as const;

function mysteryBlockSvg(used: boolean): string {
  const { width: w } = BLOCK_SIZE;
  const c = w / 2;
  const top = used ? '#fff3d6' : '#ffe066';
  const bottom = used ? '#f5d9a8' : '#ffad2e';
  const rays = used
    ? ''
    : Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r1 = 17;
        const r2 = i % 2 ? 27 : 31;
        return `<line x1="${n(c + Math.cos(a) * r1)}" y1="${n(c + Math.sin(a) * r1)}" x2="${n(c + Math.cos(a) * r2)}" y2="${n(c + Math.sin(a) * r2)}" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`;
      }).join('');
  const centre = used
    ? // A used block smiles: it shared its dot.
      `<circle cx="${c - 13}" cy="${c - 4}" r="4.5" fill="${PALETTE.ink}"/><circle cx="${c + 13}" cy="${c - 4}" r="4.5" fill="${PALETTE.ink}"/>` +
      `<path d="M${c - 12},${c + 9} Q${c},${c + 21} ${c + 12},${c + 9}" fill="none" stroke="${PALETTE.ink}" stroke-width="4" stroke-linecap="round"/>`
    : `<circle cx="${c}" cy="${c}" r="12" fill="#fff"/>`;
  const rivets = [
    [12, 12],
    [w - 12, 12],
    [12, w - 12],
    [w - 12, w - 12],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#fff" opacity="0.7"/>`)
    .join('');
  return svgDocument(
    w,
    w,
    `<rect x="2" y="2" width="${w - 4}" height="${w - 4}" rx="18" fill="url(#g)" stroke="${used ? '#e8c48a' : '#ff9a1f'}" stroke-width="4"/>` +
      `<rect x="9" y="7" width="${w - 18}" height="16" rx="8" fill="#fff" opacity="0.35"/>` +
      rivets +
      rays +
      centre,
    `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`,
  );
}

/* ------------------------------- Letter ب -------------------------------- */

export const BAA_SIZE = { width: 270, height: 124 } as const;
/** Centre line of the ب bowl (texture coordinates), drawn as written: right to left. */
const BAA_LINE: Point[] = [
  [244, 26],
  [240, 62],
  [216, 89],
  [135, 96],
  [60, 92],
  [34, 82],
  [22, 62],
];
export const BAA_STROKE = 36;
/** Texture y of the inside of the bowl (what the child lands on). */
export const BAA_FLOOR_Y = 96 - BAA_STROKE / 2 + 4;
/** Texture y of the bowl's underside. */
export const BAA_BOTTOM_Y = 96 + BAA_STROKE / 2;
/** Horizontal extent of the bounce surface (texture x). */
export const BAA_FLOOR_X = [40, 230] as const;

function baaSvg(): string {
  const { width: w, height: h } = BAA_SIZE;
  const line = curvePath(BAA_LINE);
  return svgDocument(
    w,
    h,
    `<path d="${line}" fill="none" stroke="#2a8fd6" stroke-width="${BAA_STROKE + 6}" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 3)"/>` +
      `<path d="${line}" fill="none" stroke="url(#baa)" stroke-width="${BAA_STROKE}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${curvePath(BAA_LINE.slice(1, 6).map(([x, y]) => [x, y - 9] as Point))}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.55"/>`,
    `<linearGradient id="baa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fdcff"/><stop offset="1" stop-color="${PALETTE.candyBlue}"/></linearGradient>`,
  );
}

export const DOT_SIZE = { width: 56, height: 56 } as const;

function letterDotSvg(): string {
  const c = DOT_SIZE.width / 2;
  return svgDocument(
    DOT_SIZE.width,
    DOT_SIZE.height,
    `<circle cx="${c}" cy="${c}" r="${c - 4}" fill="url(#d)" stroke="#f59e0b" stroke-width="3"/>` +
      `<ellipse cx="${c - 7}" cy="${c - 9}" rx="8" ry="5" fill="#fff" opacity="0.8" transform="rotate(-30 ${c - 7} ${c - 9})"/>`,
    `<radialGradient id="d" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#fff7b0"/><stop offset="1" stop-color="${PALETTE.candyYellow}"/></radialGradient>`,
  );
}

function ghostDotSvg(): string {
  const c = DOT_SIZE.width / 2;
  return svgDocument(
    DOT_SIZE.width,
    DOT_SIZE.height,
    `<circle cx="${c}" cy="${c}" r="${c - 6}" fill="#ffffff" fill-opacity="0.35" stroke="#ffffff" stroke-width="4" stroke-dasharray="8 7" stroke-linecap="round"/>`,
  );
}

export const GLOW_SIZE = { width: 96, height: 96 } as const;

function glowDotSvg(): string {
  const c = GLOW_SIZE.width / 2;
  return svgDocument(
    GLOW_SIZE.width,
    GLOW_SIZE.height,
    `<circle cx="${c}" cy="${c}" r="${c}" fill="url(#glow)"/><circle cx="${c}" cy="${c}" r="20" fill="url(#core)"/>`,
    `<radialGradient id="glow"><stop offset="0.2" stop-color="#fff6a8" stop-opacity="0.95"/><stop offset="1" stop-color="#ffd23f" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="core" cx="0.4" cy="0.35"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${PALETTE.candyYellow}"/></radialGradient>`,
  );
}

/* ------------------------------- Letter أ -------------------------------- */

export const ALEF_SIZE = { width: 150, height: 420 } as const;

function alefSvg(): string {
  const { width: w, height: h } = ALEF_SIZE;
  const stem: Point[] = [
    [70, h - 34],
    [74, 230],
    [80, 116],
  ];
  // Hamza (ء): a small hook with a tail, above the alef.
  const hamza: Point[] = [
    [100, 30],
    [84, 23],
    [72, 34],
    [84, 45],
    [106, 46],
    [64, 64],
  ];
  const fy = 210;
  const cx = 74;
  const face =
    [-17, 17]
      .map(
        (dx) =>
          `<ellipse cx="${cx + dx}" cy="${fy}" rx="10" ry="12.5" fill="#fff"/><ellipse cx="${cx + dx + 1}" cy="${fy + 1}" rx="6" ry="8" fill="${PALETTE.ink}"/>` +
          `<circle cx="${cx + dx + 3}" cy="${fy - 3}" r="2.5" fill="#fff"/>`,
      )
      .join('') +
    `<ellipse cx="${cx - 26}" cy="${fy + 24}" rx="8" ry="5" fill="${PALETTE.candyPinkLight}"/><ellipse cx="${cx + 26}" cy="${fy + 24}" rx="8" ry="5" fill="${PALETTE.candyPinkLight}"/>` +
    `<path d="M${cx - 13},${fy + 22} Q${cx},${fy + 38} ${cx + 13},${fy + 22} Z" fill="#7f1d1d"/>`;
  const stroke = (pts: Point[], width: number, colour: string, extra = '') =>
    `<path d="${curvePath(pts)}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
  return svgDocument(
    w,
    h,
    stroke(stem, 74, '#e04848', ' transform="translate(0 4)"') +
      stroke(stem, 68, 'url(#alef)') +
      stroke([[64, h - 60], [66, 230], [70, 140]], 12, '#fff', ' opacity="0.45"') +
      stroke(hamza, 18, '#e04848', ' transform="translate(0 2)"') +
      stroke(hamza, 14, 'url(#alef)') +
      face,
    `<linearGradient id="alef" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8c8c"/><stop offset="1" stop-color="#ff5c5c"/></linearGradient>`,
  );
}

/* ---------------------------------- Lion ---------------------------------- */

export const LION_SIZE = { width: 230, height: 214 } as const;

function lionSvg(roar: boolean): string {
  const { width: w, height: h } = LION_SIZE;
  const cx = 112;
  const hy = 82;
  const mane = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    return `<circle cx="${n(cx + Math.cos(a) * 54)}" cy="${n(hy + Math.sin(a) * 52)}" r="24" fill="${i % 2 ? '#e8742a' : '#f08a35'}"/>`;
  }).join('');
  const mouth = roar
    ? `<ellipse cx="${cx}" cy="${hy + 30}" rx="15" ry="17" fill="#7f1d1d"/><ellipse cx="${cx}" cy="${hy + 39}" rx="9" ry="6" fill="${PALETTE.candyPink}"/>`
    : `<path d="M${cx - 12},${hy + 24} Q${cx - 6},${hy + 32} ${cx},${hy + 24} Q${cx + 6},${hy + 32} ${cx + 12},${hy + 24}" fill="none" stroke="${PALETTE.ink}" stroke-width="3.5" stroke-linecap="round"/>`;
  return svgDocument(
    w,
    h,
    // Tail curling up behind.
    `<path d="M${cx + 50},${h - 30} Q${w - 6},${h - 40} ${w - 22},${h - 100}" fill="none" stroke="#f2b13c" stroke-width="12" stroke-linecap="round"/>` +
      `<circle cx="${w - 22}" cy="${h - 104}" r="14" fill="#e8742a"/>` +
      // Sitting body and paws.
      `<ellipse cx="${cx}" cy="${h - 52}" rx="58" ry="50" fill="#f6c04d"/>` +
      `<ellipse cx="${cx}" cy="${h - 46}" rx="30" ry="34" fill="#fde7b0"/>` +
      `<ellipse cx="${cx - 30}" cy="${h - 12}" rx="20" ry="12" fill="#f6c04d"/><ellipse cx="${cx + 30}" cy="${h - 12}" rx="20" ry="12" fill="#f6c04d"/>` +
      [-36, -30, -24, 24, 30, 36].map((dx) => `<line x1="${cx + dx}" y1="${h - 14}" x2="${cx + dx}" y2="${h - 6}" stroke="#d49a2a" stroke-width="2" stroke-linecap="round"/>`).join('') +
      mane +
      // Ears, head, muzzle.
      `<circle cx="${cx - 34}" cy="${hy - 34}" r="14" fill="#f6c04d"/><circle cx="${cx + 34}" cy="${hy - 34}" r="14" fill="#f6c04d"/>` +
      `<circle cx="${cx - 34}" cy="${hy - 34}" r="7" fill="${PALETTE.candyPinkLight}"/><circle cx="${cx + 34}" cy="${hy - 34}" r="7" fill="${PALETTE.candyPinkLight}"/>` +
      `<circle cx="${cx}" cy="${hy}" r="44" fill="#f8c95a"/>` +
      `<ellipse cx="${cx}" cy="${hy + 18}" rx="26" ry="20" fill="#fff1cf"/>` +
      `<path d="M${cx - 9},${hy + 6} L${cx + 9},${hy + 6} L${cx},${hy + 16} Z" fill="${PALETTE.ink}"/>` +
      (roar
        ? `<path d="M${cx - 24},${hy - 10} Q${cx - 16},${hy - 2} ${cx - 8},${hy - 10}" fill="none" stroke="${PALETTE.ink}" stroke-width="4" stroke-linecap="round"/>` +
          `<path d="M${cx + 8},${hy - 10} Q${cx + 16},${hy - 2} ${cx + 24},${hy - 10}" fill="none" stroke="${PALETTE.ink}" stroke-width="4" stroke-linecap="round"/>`
        : `<ellipse cx="${cx - 16}" cy="${hy - 10}" rx="6" ry="7.5" fill="${PALETTE.ink}"/><ellipse cx="${cx + 16}" cy="${hy - 10}" rx="6" ry="7.5" fill="${PALETTE.ink}"/>` +
          `<circle cx="${cx - 14}" cy="${hy - 13}" r="2.2" fill="#fff"/><circle cx="${cx + 18}" cy="${hy - 13}" r="2.2" fill="#fff"/>`) +
      `<ellipse cx="${cx - 30}" cy="${hy + 10}" rx="7" ry="4.5" fill="${PALETTE.cheek}" opacity="0.7"/><ellipse cx="${cx + 30}" cy="${hy + 10}" rx="7" ry="4.5" fill="${PALETTE.cheek}" opacity="0.7"/>` +
      mouth,
  );
}

/* ---------------------------------- Star ---------------------------------- */

export const STAR_SIZE = { width: 84, height: 84 } as const;

function starSvg(): string {
  const { width: w } = STAR_SIZE;
  const c = w / 2;
  let d = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 38 : 19;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${n(c + Math.cos(a) * r)},${n(c + 3 + Math.sin(a) * r)} `;
  }
  return svgDocument(
    w,
    w,
    `<path d="${d}Z" fill="url(#s)" stroke="#f59e0b" stroke-width="5" stroke-linejoin="round"/>` +
      `<circle cx="${c - 8}" cy="${c + 2}" r="3.2" fill="${PALETTE.ink}"/><circle cx="${c + 8}" cy="${c + 2}" r="3.2" fill="${PALETTE.ink}"/>` +
      `<path d="M${c - 6},${c + 10} Q${c},${c + 15} ${c + 6},${c + 10}" fill="none" stroke="${PALETTE.ink}" stroke-width="2.5" stroke-linecap="round"/>` +
      `<ellipse cx="${c - 12}" cy="${c - 10}" rx="6" ry="3.5" fill="#fff" opacity="0.7" transform="rotate(-35 ${c - 12} ${c - 10})"/>`,
    `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff07a"/><stop offset="1" stop-color="#ffc21f"/></linearGradient>`,
  );
}

/* -------------------------------- Rainbow -------------------------------- */

export const RAINBOW_SIZE = { width: 360, height: 230 } as const;

function rainbowSvg(): string {
  const { width: w, height: h } = RAINBOW_SIZE;
  const cx = w / 2;
  const base = h - 30;
  const bands = ['#ff6b6b', '#ff9d4d', '#ffd23f', '#5fe08a', '#5ec8ff', '#b07cff'];
  const arcs = bands
    .map((colour, i) => {
      const r = 150 - i * 18;
      return `<path d="M${cx - r},${base} A${r},${r} 0 0 1 ${cx + r},${base}" fill="none" stroke="${colour}" stroke-width="19"/>`;
    })
    .join('');
  const cloud = (x: number) =>
    `<g fill="#ffffff"><circle cx="${x - 22}" cy="${base + 4}" r="20"/><circle cx="${x}" cy="${base - 6}" r="26"/><circle cx="${x + 24}" cy="${base + 4}" r="20"/><rect x="${x - 42}" y="${base}" width="84" height="24" rx="12"/></g>`;
  return svgDocument(w, h, arcs + cloud(cx - 141) + cloud(cx + 141));
}

/* -------------------------------- Manifest -------------------------------- */

export const MechanicKeys = {
  block: 'mystery-block',
  blockUsed: 'mystery-block-used',
  baa: 'letter-baa',
  dot: 'letter-dot',
  dotGhost: 'letter-dot-ghost',
  glow: 'glow-dot',
  alef: 'letter-alef',
  lion: 'lion',
  lionRoar: 'lion-roar',
  star: 'star',
  rainbow: 'rainbow',
} as const;

export const MECHANIC_ART: readonly { key: string; width: number; height: number; svg: () => string }[] = [
  { key: MechanicKeys.block, ...BLOCK_SIZE, svg: () => mysteryBlockSvg(false) },
  { key: MechanicKeys.blockUsed, ...BLOCK_SIZE, svg: () => mysteryBlockSvg(true) },
  { key: MechanicKeys.baa, ...BAA_SIZE, svg: baaSvg },
  { key: MechanicKeys.dot, ...DOT_SIZE, svg: letterDotSvg },
  { key: MechanicKeys.dotGhost, ...DOT_SIZE, svg: ghostDotSvg },
  { key: MechanicKeys.glow, ...GLOW_SIZE, svg: glowDotSvg },
  { key: MechanicKeys.alef, ...ALEF_SIZE, svg: alefSvg },
  { key: MechanicKeys.lion, ...LION_SIZE, svg: () => lionSvg(false) },
  { key: MechanicKeys.lionRoar, ...LION_SIZE, svg: () => lionSvg(true) },
  { key: MechanicKeys.star, ...STAR_SIZE, svg: starSvg },
  { key: MechanicKeys.rainbow, ...RAINBOW_SIZE, svg: rainbowSvg },
];
