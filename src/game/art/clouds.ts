import { PALETTE } from './palette';
import { STRIP_BOTTOM_PADDING } from './hills';
import { n, periodicCurvePath, sampleCurve, svgDocument } from './svg';

/**
 * Puffy cartoon clouds: overlapping circles with a soft lavender underside
 * (the same puffs drawn first, shifted down), plus a glossy highlight.
 * One variant has a happy face. The cloud sea is a seamless, scalloped
 * strip that tiles along the bottom of the world.
 */

type Puff = readonly [cx: number, cy: number, r: number];

interface CloudShape {
  puffs: readonly Puff[];
  face?: boolean;
}

interface CloudSpec extends CloudShape {
  width: number;
  height: number;
}

/** How far the lavender underside is drawn below each puff. */
const SHADE_OFFSET = 9;
const MARGIN = 3;

/**
 * Fits the texture to its puffs (including the shaded underside), so no puff
 * is ever clipped by the texture edge.
 */
export function fitCloud(shape: CloudShape): CloudSpec {
  const minX = Math.min(...shape.puffs.map(([x, , r]) => x - r));
  const maxX = Math.max(...shape.puffs.map(([x, , r]) => x + r));
  const minY = Math.min(...shape.puffs.map(([, y, r]) => y - r));
  const maxY = Math.max(...shape.puffs.map(([, y, r]) => y + r + SHADE_OFFSET));
  const dx = MARGIN - minX;
  const dy = MARGIN - minY;
  return {
    ...shape,
    puffs: shape.puffs.map(([x, y, r]) => [x + dx, y + dy, r] as const),
    width: Math.ceil(maxX - minX + MARGIN * 2),
    height: Math.ceil(maxY - minY + MARGIN * 2),
  };
}

export const CLOUDS: Record<'cloudSmall' | 'cloudMedium' | 'cloudLarge' | 'cloudHappy', CloudSpec> = {
  cloudSmall: fitCloud({ puffs: [[60, 70, 34], [105, 52, 44], [155, 68, 36], [110, 80, 30]] }),
  cloudMedium: fitCloud({ puffs: [[70, 96, 44], [130, 66, 60], [200, 74, 52], [258, 100, 38], [160, 108, 40]] }),
  cloudLarge: fitCloud({ puffs: [[80, 128, 50], [150, 90, 70], [232, 72, 82], [318, 100, 64], [380, 134, 42], [220, 140, 48]] }),
  cloudHappy: fitCloud({ puffs: [[76, 110, 48], [140, 74, 64], [212, 70, 70], [276, 108, 46], [176, 124, 44]], face: true }),
};

export function cloudSvg(spec: CloudSpec): string {
  const shade = spec.puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y + SHADE_OFFSET}" r="${r}"/>`).join('');
  const body = spec.puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  const [hx, hy, hr] = spec.puffs.reduce((a, b) => (b[2] > a[2] ? b : a));
  let face = '';
  if (spec.face) {
    const cx = spec.width / 2;
    const cy = spec.height * 0.62;
    face =
      `<circle cx="${cx - 24}" cy="${cy - 6}" r="7" fill="${PALETTE.ink}"/><circle cx="${cx + 24}" cy="${cy - 6}" r="7" fill="${PALETTE.ink}"/>` +
      `<circle cx="${cx - 22}" cy="${cy - 9}" r="2.5" fill="#fff"/><circle cx="${cx + 26}" cy="${cy - 9}" r="2.5" fill="#fff"/>` +
      `<ellipse cx="${cx - 42}" cy="${cy + 8}" rx="11" ry="7" fill="${PALETTE.cheek}" opacity="0.7"/>` +
      `<ellipse cx="${cx + 42}" cy="${cy + 8}" rx="11" ry="7" fill="${PALETTE.cheek}" opacity="0.7"/>` +
      `<path d="M${cx - 14},${cy + 6} Q${cx},${cy + 20} ${cx + 14},${cy + 6}" fill="none" stroke="${PALETTE.ink}" stroke-width="5" stroke-linecap="round"/>`;
  }
  return svgDocument(
    spec.width,
    spec.height,
    `<g fill="${PALETTE.cloudShade}">${shade}</g><g fill="${PALETTE.cloud}">${body}</g>` +
      `<ellipse cx="${n(hx - hr * 0.3)}" cy="${n(hy - hr * 0.45)}" rx="${n(hr * 0.42)}" ry="${n(hr * 0.2)}" fill="#fff" opacity="0.9"/>` +
      face,
  );
}

/* -------------------------------- Cloud sea ------------------------------- */

export const CLOUD_SEA_SIZE = { width: 1024, height: 256 } as const;

/** Scalloped top edge: |sin| bumps with an integer count, so it repeats seamlessly. */
export const cloudSeaEdge = (x: number, bumps: number, base: number, amplitude: number, phase = 0): number =>
  base - amplitude * Math.abs(Math.sin((Math.PI * bumps * x) / CLOUD_SEA_SIZE.width + phase));

export function cloudSeaSvg(): string {
  const { width: w } = CLOUD_SEA_SIZE;
  const h = CLOUD_SEA_SIZE.height - STRIP_BOTTOM_PADDING;
  const back = sampleCurve(w, 192, (x) => cloudSeaEdge(x, 7, 92, 46, Math.PI / 2));
  const front = sampleCurve(w, 192, (x) => cloudSeaEdge(x, 9, 128, 40));
  const close = `L${w},${h} L0,${h} Z`;
  const defs =
    `<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PALETTE.cloud}"/>` +
    `<stop offset="1" stop-color="${PALETTE.cloudShadeWarm}"/></linearGradient>`;
  return svgDocument(
    w,
    CLOUD_SEA_SIZE.height,
    `<path d="${periodicCurvePath(back, w)} ${close}" fill="${PALETTE.cloudShade}"/>` +
      `<path d="${periodicCurvePath(front, w)} ${close}" fill="url(#sea)"/>`,
    defs,
  );
}
