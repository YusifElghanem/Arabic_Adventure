import { PALETTE } from './palette';
import { svgDocument } from './svg';

/**
 * The letter thief: a round fluffy critter with tiny wings, a robber's
 * eye-mask and a cheeky grin. Once caught it giggles, the mask comes off and
 * it becomes a friend (blushing, big smile, a little heart).
 * Engine-free, so the React HUD can show the same faces.
 */

export const THIEF_SIZE = { width: 96, height: 88 } as const;

const FUR = '#9d8cf0';
const FUR_LIGHT = '#c9bfff';
const FUR_DEEP = '#7461d8';
const MASK = '#3b2f5c';

export function thiefSvg(friend: boolean): string {
  const { width: w, height: h } = THIEF_SIZE;
  const cx = w / 2;
  const cy = 50;
  // Fluffy outline: a ring of bumps around the body.
  let fluff = '';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    fluff += `<circle cx="${(cx + Math.cos(a) * 29).toFixed(1)}" cy="${(cy + Math.sin(a) * 27).toFixed(1)}" r="9" fill="${FUR}"/>`;
  }
  const wing = (dir: number) =>
    `<path d="M${cx + dir * 28},${cy - 8} q${dir * 26},-20 ${dir * 22},4 q${dir * -6},10 ${dir * -20},6 Z" fill="#ffffff" stroke="${FUR_LIGHT}" stroke-width="2" stroke-linejoin="round"/>`;
  const eyes = friend
    ? `<path d="M${cx - 17},${cy - 4} q6,-7 12,0" fill="none" stroke="${PALETTE.ink}" stroke-width="3.5" stroke-linecap="round"/>` +
      `<path d="M${cx + 5},${cy - 4} q6,-7 12,0" fill="none" stroke="${PALETTE.ink}" stroke-width="3.5" stroke-linecap="round"/>`
    : `<path d="M${cx - 30},${cy - 12} Q${cx},${cy - 20} ${cx + 30},${cy - 12} L${cx + 28},${cy + 2} Q${cx},${cy - 4} ${cx - 28},${cy + 2} Z" fill="${MASK}"/>` +
      `<path d="M${cx - 30},${cy - 8} l-10,-6 M${cx + 30},${cy - 8} l10,-6" stroke="${MASK}" stroke-width="4" stroke-linecap="round"/>` +
      `<ellipse cx="${cx - 11}" cy="${cy - 6}" rx="6.5" ry="7" fill="#fff"/><ellipse cx="${cx + 11}" cy="${cy - 6}" rx="6.5" ry="7" fill="#fff"/>` +
      `<circle cx="${cx - 9}" cy="${cy - 5}" r="3.5" fill="${PALETTE.ink}"/><circle cx="${cx + 13}" cy="${cy - 5}" r="3.5" fill="${PALETTE.ink}"/>` +
      `<circle cx="${cx - 8}" cy="${cy - 7}" r="1.2" fill="#fff"/><circle cx="${cx + 14}" cy="${cy - 7}" r="1.2" fill="#fff"/>`;
  const mouth = friend
    ? `<path d="M${cx - 10},${cy + 8} Q${cx},${cy + 20} ${cx + 10},${cy + 8} Z" fill="#ff6f91" stroke="${PALETTE.ink}" stroke-width="2.5" stroke-linejoin="round"/>`
    : // A sly sideways grin with one little tooth.
      `<path d="M${cx - 9},${cy + 10} Q${cx + 2},${cy + 17} ${cx + 12},${cy + 7}" fill="none" stroke="${PALETTE.ink}" stroke-width="3" stroke-linecap="round"/>` +
      `<rect x="${cx}" y="${cy + 11}" width="4.5" height="4.5" rx="1" fill="#fff"/>`;
  const extras = friend
    ? `<ellipse cx="${cx - 20}" cy="${cy + 6}" rx="6" ry="4" fill="${PALETTE.cheek}" opacity="0.85"/><ellipse cx="${cx + 20}" cy="${cy + 6}" rx="6" ry="4" fill="${PALETTE.cheek}" opacity="0.85"/>` +
      `<path d="M${cx + 30},${cy - 30} c-4,-6 -12,-2 -8,5 l8,7 l8,-7 c4,-7 -4,-11 -8,-5 Z" fill="#ff4d6d"/>`
    : '';
  return svgDocument(
    w,
    h,
    wing(-1) +
      wing(1) +
      fluff +
      `<ellipse cx="${cx}" cy="${cy}" rx="30" ry="28" fill="url(#fur)"/>` +
      `<ellipse cx="${cx}" cy="${cy + 14}" rx="15" ry="9" fill="${FUR_LIGHT}" opacity="0.8"/>` +
      // Two little antenna tufts.
      `<path d="M${cx - 6},${cy - 26} q-4,-12 -12,-12 M${cx + 6},${cy - 26} q4,-12 12,-12" fill="none" stroke="${FUR_DEEP}" stroke-width="3.5" stroke-linecap="round"/>` +
      `<circle cx="${cx - 18}" cy="${cy - 38}" r="4" fill="#ffd23f"/><circle cx="${cx + 18}" cy="${cy - 38}" r="4" fill="#ffd23f"/>` +
      eyes +
      mouth +
      extras +
      `<ellipse cx="${cx - 12}" cy="${cy + 29}" rx="7" ry="4" fill="${FUR_DEEP}"/><ellipse cx="${cx + 12}" cy="${cy + 29}" rx="7" ry="4" fill="${FUR_DEEP}"/>`,
    `<radialGradient id="fur" cx="0.42" cy="0.35" r="0.7"><stop offset="0" stop-color="${FUR_LIGHT}"/><stop offset="0.65" stop-color="${FUR}"/><stop offset="1" stop-color="${FUR_DEEP}"/></radialGradient>`,
  );
}

export const ThiefKeys = { sneaky: 'thief', friend: 'thief-friend' } as const;

export const THIEF_ART: readonly { key: string; width: number; height: number; svg: () => string }[] = [
  { key: ThiefKeys.sneaky, ...THIEF_SIZE, svg: () => thiefSvg(false) },
  { key: ThiefKeys.friend, ...THIEF_SIZE, svg: () => thiefSvg(true) },
];
