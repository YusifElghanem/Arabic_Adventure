import { PALETTE } from './palette';
import { n, svgDocument } from './svg';

/**
 * The smiling sun, in two textures: rays (with a soft glow) that rotate
 * slowly behind the face, and the face itself, with an eyes-closed variant
 * for blinking.
 */

export const SUN_RAYS_SIZE = { width: 360, height: 360 } as const;
export const SUN_FACE_SIZE = { width: 200, height: 200 } as const;

export function sunRaysSvg(): string {
  const { width: w } = SUN_RAYS_SIZE;
  const c = w / 2;
  const rays: string[] = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const long = i % 2 === 0;
    const inner = 92;
    const outer = long ? 168 : 142;
    const half = long ? 0.16 : 0.13;
    const p = (r: number, da: number) => `${n(c + Math.cos(a + da) * r)},${n(c + Math.sin(a + da) * r)}`;
    // A rounded, slightly bulging ray: base corners, a soft curved tip.
    rays.push(
      `<path d="M${p(inner, -half)} Q${p((inner + outer) / 2, -half * 0.75)} ${p(outer - 10, -0.025)} ` +
        `Q${p(outer + 4, 0)} ${p(outer - 10, 0.025)} Q${p((inner + outer) / 2, half * 0.75)} ${p(inner, half)} Z" ` +
        `fill="url(#ray)"/>`,
    );
  }
  const defs =
    `<radialGradient id="glow"><stop offset="0.35" stop-color="${PALETTE.sunGlow}" stop-opacity="0.95"/>` +
    `<stop offset="1" stop-color="${PALETTE.sunGlow}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="ray" cx="${c}" cy="${c}" r="${c}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0.45" stop-color="${PALETTE.sunRay}"/><stop offset="1" stop-color="${PALETTE.sunRayTip}"/></radialGradient>`;
  return svgDocument(w, w, `<circle cx="${c}" cy="${c}" r="${c}" fill="url(#glow)"/>${rays.join('')}`, defs);
}

export function sunFaceSvg(blink = false): string {
  const { width: w } = SUN_FACE_SIZE;
  const c = w / 2;
  const eyes = blink
    ? [-30, 30]
        .map((dx) => `<path d="M${c + dx - 13},${c - 10} Q${c + dx},${c + 2} ${c + dx + 13},${c - 10}" fill="none" stroke="${PALETTE.ink}" stroke-width="7" stroke-linecap="round"/>`)
        .join('')
    : [-30, 30]
        .map(
          (dx) =>
            `<ellipse cx="${c + dx}" cy="${c - 10}" rx="10" ry="13" fill="${PALETTE.ink}"/>` +
            `<circle cx="${c + dx + 4}" cy="${c - 15}" r="4" fill="#fff"/>`,
        )
        .join('');
  const defs =
    `<radialGradient id="face" cx="0.42" cy="0.38" r="0.7"><stop offset="0" stop-color="${PALETTE.sunCore}"/>` +
    `<stop offset="1" stop-color="${PALETTE.sunEdge}"/></radialGradient>`;
  const body =
    `<circle cx="${c}" cy="${c}" r="${c - 6}" fill="url(#face)"/>` +
    // A glossy highlight, as on a candy.
    `<ellipse cx="${c - 32}" cy="${c - 46}" rx="30" ry="17" fill="#fff" opacity="0.45" transform="rotate(-25 ${c - 32} ${c - 46})"/>` +
    eyes +
    `<ellipse cx="${c - 52}" cy="${c + 16}" rx="16" ry="10" fill="${PALETTE.cheek}" opacity="0.8"/>` +
    `<ellipse cx="${c + 52}" cy="${c + 16}" rx="16" ry="10" fill="${PALETTE.cheek}" opacity="0.8"/>` +
    `<path d="M${c - 30},${c + 18} Q${c},${c + 52} ${c + 30},${c + 18}" fill="${PALETTE.ink}"/>` +
    `<path d="M${c - 14},${c + 33} Q${c},${c + 44} ${c + 14},${c + 33} Q${c},${c + 38} ${c - 14},${c + 33}Z" fill="${PALETTE.candyPink}"/>`;
  return svgDocument(w, w, body, defs);
}
