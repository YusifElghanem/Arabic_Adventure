import type { Outfit } from '@/stores/useGameStore';
import { PALETTE } from './palette';
import { svgDocument } from './svg';

/**
 * The player character as cut-out puppet parts. Each part is its own SVG
 * texture with a pivot (origin), and the rig below says where each part
 * attaches relative to the feet. The game animates the parts by rotating
 * and moving them about their pivots, the way cut-out animation works.
 *
 * The child faces the viewer: the face is the centre of the design, and
 * either the child's photo or a drawn cartoon face sits inside the hood or
 * under the hat.
 *
 * This module has no engine imports, so the React title screen can draw the
 * same character with plain <img> layers.
 */

const SKIN = '#f6c9a5';
const SKIN_SHADE = '#eba983';

const ONESIE = { base: '#b79cff', light: '#e9e0ff', deep: '#8f73ec', paw: '#ffb3cf' };
const EXPLORER = {
  shirt: '#e8c784',
  shirtDeep: '#c9a25c',
  shorts: '#9a6a3c',
  boot: '#7a4a2b',
  sole: '#4e2d18',
  scarf: '#ff6b6b',
  hat: '#dcaa48',
  hatDeep: '#b9862f',
  band: '#8a4b2f',
  hair: '#4a2e1f',
  pack: '#4fc95c',
  packDeep: '#36a446',
};

/* --------------------------------- Shared --------------------------------- */

export const HEAD_SIZE = { width: 78, height: 78 } as const;

function headSvg(): string {
  const { width: w } = HEAD_SIZE;
  const c = w / 2;
  return svgDocument(
    w,
    w,
    `<circle cx="${c}" cy="${c}" r="${c - 2}" fill="url(#skin)"/>` +
      // Little ears peek out at the sides.
      `<ellipse cx="4" cy="${c + 4}" rx="5" ry="8" fill="${SKIN_SHADE}"/><ellipse cx="${w - 4}" cy="${c + 4}" rx="5" ry="8" fill="${SKIN_SHADE}"/>`,
    `<radialGradient id="skin" cx="0.45" cy="0.4" r="0.65"><stop offset="0.6" stop-color="${SKIN}"/><stop offset="1" stop-color="${SKIN_SHADE}"/></radialGradient>`,
  );
}

/** Size of the face area: photos and the drawn face are fitted to this box. */
export const FACE_SIZE = { width: 58, height: 64 } as const;

function defaultFaceSvg(blink: boolean): string {
  const { width: w, height: h } = FACE_SIZE;
  const cx = w / 2;
  const ey = h * 0.44;
  const eyes = blink
    ? [-12, 12]
        .map((dx) => `<path d="M${cx + dx - 6},${ey} Q${cx + dx},${ey + 5} ${cx + dx + 6},${ey}" fill="none" stroke="${PALETTE.ink}" stroke-width="3" stroke-linecap="round"/>`)
        .join('')
    : [-12, 12]
        .map(
          (dx) =>
            `<ellipse cx="${cx + dx}" cy="${ey}" rx="5.2" ry="6.6" fill="${PALETTE.ink}"/>` +
            `<circle cx="${cx + dx + 2}" cy="${ey - 2.6}" r="2.1" fill="#fff"/><circle cx="${cx + dx - 1.6}" cy="${ey + 2.4}" r="1" fill="#fff"/>`,
        )
        .join('');
  return svgDocument(
    w,
    h,
    eyes +
      `<ellipse cx="${cx - 20}" cy="${ey + 11}" rx="7" ry="4.5" fill="${PALETTE.cheek}" opacity="0.75"/>` +
      `<ellipse cx="${cx + 20}" cy="${ey + 11}" rx="7" ry="4.5" fill="${PALETTE.cheek}" opacity="0.75"/>` +
      `<path d="M${cx - 9},${ey + 12} Q${cx},${ey + 22} ${cx + 9},${ey + 12} Z" fill="${PALETTE.ink}"/>` +
      `<path d="M${cx - 4.5},${ey + 16.5} Q${cx},${ey + 20} ${cx + 4.5},${ey + 16.5} Q${cx},${ey + 18} ${cx - 4.5},${ey + 16.5} Z" fill="${PALETTE.candyPink}"/>`,
  );
}

/* --------------------------------- Onesie --------------------------------- */

export const HOOD_SIZE = { width: 108, height: 108 } as const;

function onesieHoodSvg(): string {
  const { width: w } = HOOD_SIZE;
  const c = w / 2;
  const holeY = c + 5;
  const ear = (x: number) =>
    `<circle cx="${x}" cy="20" r="16" fill="${ONESIE.base}"/><circle cx="${x}" cy="21" r="8.5" fill="${ONESIE.paw}"/>`;
  return svgDocument(
    w,
    w,
    ear(20) +
      ear(w - 20) +
      // Hood: a disc with an oval opening for the face (even-odd fill).
      `<path fill-rule="evenodd" fill="url(#hood)" d="M${c},4 a${c - 4},${c - 4} 0 1,0 0.01,0 Z M${c},${holeY - 35} a31,35 0 1,1 -0.01,0 Z"/>` +
      `<ellipse cx="${c}" cy="${holeY}" rx="33" ry="37" fill="none" stroke="${ONESIE.light}" stroke-width="6"/>` +
      `<ellipse cx="${c - 22}" cy="18" rx="12" ry="6" fill="#fff" opacity="0.35" transform="rotate(-30 ${c - 22} 18)"/>`,
    `<linearGradient id="hood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ONESIE.base}"/><stop offset="1" stop-color="${ONESIE.deep}"/></linearGradient>`,
  );
}

export const BODY_SIZE = { width: 62, height: 54 } as const;

function onesieBodySvg(): string {
  const { width: w, height: h } = BODY_SIZE;
  const c = w / 2;
  return svgDocument(
    w,
    h,
    `<path d="M${c - 16},2 Q${c},6 ${c + 16},2 Q${w - 4},10 ${w - 3},${h - 14} Q${w - 4},${h - 2} ${c},${h - 1} Q4,${h - 2} 3,${h - 14} Q4,10 ${c - 16},2 Z" fill="url(#body)"/>` +
      `<ellipse cx="${c}" cy="${h * 0.58}" rx="17" ry="15" fill="${ONESIE.light}"/>` +
      `<circle cx="${c}" cy="${h * 0.42}" r="2.6" fill="${ONESIE.deep}"/><circle cx="${c}" cy="${h * 0.62}" r="2.6" fill="${ONESIE.deep}"/>`,
    `<linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ONESIE.base}"/><stop offset="1" stop-color="${ONESIE.deep}"/></linearGradient>`,
  );
}

export const LIMB_SIZE = { arm: { width: 20, height: 38 }, leg: { width: 24, height: 36 } } as const;

function onesieArmSvg(): string {
  const { width: w, height: h } = LIMB_SIZE.arm;
  return svgDocument(w, h, `<rect x="3" y="0" width="${w - 6}" height="${h - 12}" rx="${(w - 6) / 2}" fill="${ONESIE.base}"/><circle cx="${w / 2}" cy="${h - 8}" r="7.5" fill="${SKIN}"/>`);
}

function onesieLegSvg(): string {
  const { width: w, height: h } = LIMB_SIZE.leg;
  return svgDocument(
    w,
    h,
    `<rect x="4" y="0" width="${w - 8}" height="${h - 8}" rx="${(w - 8) / 2}" fill="${ONESIE.base}"/>` +
      `<ellipse cx="${w / 2}" cy="${h - 7}" rx="${w / 2 - 1}" ry="6.5" fill="${ONESIE.deep}"/>` +
      `<ellipse cx="${w / 2}" cy="${h - 6}" rx="5" ry="3" fill="${ONESIE.paw}"/>`,
  );
}

/* -------------------------------- Explorer -------------------------------- */

export const HAT_SIZE = { width: 118, height: 62 } as const;

function explorerHatSvg(): string {
  const { width: w, height: h } = HAT_SIZE;
  const c = w / 2;
  return svgDocument(
    w,
    h,
    `<ellipse cx="${c}" cy="${h - 12}" rx="${c - 2}" ry="10" fill="${EXPLORER.hatDeep}"/>` +
      `<path d="M${c - 33},${h - 12} Q${c - 33},6 ${c},6 Q${c + 33},6 ${c + 33},${h - 12} Z" fill="url(#hat)"/>` +
      `<path d="M${c - 33},${h - 20} Q${c},${h - 26} ${c + 33},${h - 20} L${c + 33},${h - 12} Q${c},${h - 18} ${c - 33},${h - 12} Z" fill="${EXPLORER.band}"/>` +
      `<ellipse cx="${c - 12}" cy="16" rx="9" ry="5" fill="#fff" opacity="0.35" transform="rotate(-20 ${c - 12} 16)"/>`,
    `<linearGradient id="hat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EXPLORER.hat}"/><stop offset="1" stop-color="${EXPLORER.hatDeep}"/></linearGradient>`,
  );
}

export const HAIR_SIZE = { width: 84, height: 44 } as const;

function explorerHairSvg(): string {
  const { width: w, height: h } = HAIR_SIZE;
  // A soft cap of hair with three bangs, framing the top of the face.
  return svgDocument(
    w,
    h,
    `<path d="M3,${h - 2} Q2,4 ${w / 2},3 Q${w - 2},4 ${w - 3},${h - 2} Q${w - 12},${h - 14} ${w - 20},${h - 10} Q${w - 28},${h - 22} ${w / 2 + 4},${h - 14} Q${w / 2 - 6},${h - 24} ${w / 2 - 14},${h - 13} Q20,${h - 20} 12,${h - 8} Z" fill="${EXPLORER.hair}"/>`,
  );
}

function explorerBodySvg(): string {
  const { width: w, height: h } = BODY_SIZE;
  const c = w / 2;
  return svgDocument(
    w,
    h,
    `<path d="M${c - 16},2 Q${c},6 ${c + 16},2 Q${w - 4},10 ${w - 3},${h - 10} L3,${h - 10} Q4,10 ${c - 16},2 Z" fill="url(#shirt)"/>` +
      // Shorts waist and belt.
      `<path d="M3,${h - 12} L${w - 3},${h - 12} Q${w - 4},${h - 1} ${c},${h - 1} Q4,${h - 1} 3,${h - 12} Z" fill="${EXPLORER.shorts}"/>` +
      `<rect x="3" y="${h - 14}" width="${w - 6}" height="5" fill="${EXPLORER.band}"/>` +
      `<rect x="${c - 4}" y="${h - 15}" width="8" height="7" rx="1.5" fill="${PALETTE.candyYellow}"/>` +
      // Pockets and buttons.
      `<rect x="11" y="18" width="12" height="10" rx="2" fill="${EXPLORER.shirtDeep}"/><rect x="${w - 23}" y="18" width="12" height="10" rx="2" fill="${EXPLORER.shirtDeep}"/>` +
      `<circle cx="${c}" cy="20" r="1.8" fill="${EXPLORER.band}"/><circle cx="${c}" cy="30" r="1.8" fill="${EXPLORER.band}"/>` +
      // Backpack straps and a red scarf.
      `<path d="M10,6 Q14,20 12,${h - 14}" fill="none" stroke="${EXPLORER.pack}" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M${w - 10},6 Q${w - 14},20 ${w - 12},${h - 14}" fill="none" stroke="${EXPLORER.pack}" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M${c - 17},2 Q${c},10 ${c + 17},2 L${c + 6},8 L${c},20 L${c - 6},8 Z" fill="${EXPLORER.scarf}"/>`,
    `<linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EXPLORER.shirt}"/><stop offset="1" stop-color="${EXPLORER.shirtDeep}"/></linearGradient>`,
  );
}

export const BACKPACK_SIZE = { width: 74, height: 46 } as const;

function explorerBackpackSvg(): string {
  const { width: w, height: h } = BACKPACK_SIZE;
  // Seen from the front, the backpack only peeks out on both sides of the body.
  return svgDocument(w, h, `<rect x="1" y="2" width="${w - 2}" height="${h - 4}" rx="12" fill="${EXPLORER.packDeep}"/><rect x="4" y="6" width="${w - 8}" height="${h - 14}" rx="10" fill="${EXPLORER.pack}"/>`);
}

function explorerArmSvg(): string {
  const { width: w, height: h } = LIMB_SIZE.arm;
  return svgDocument(
    w,
    h,
    `<rect x="4.5" y="8" width="${w - 9}" height="${h - 18}" rx="${(w - 9) / 2}" fill="${SKIN}"/>` +
      `<rect x="2" y="0" width="${w - 4}" height="13" rx="6" fill="${EXPLORER.shirt}"/>` +
      `<circle cx="${w / 2}" cy="${h - 8}" r="7" fill="${SKIN}"/>`,
  );
}

function explorerLegSvg(): string {
  const { width: w, height: h } = LIMB_SIZE.leg;
  return svgDocument(
    w,
    h,
    `<rect x="6" y="4" width="${w - 12}" height="${h - 12}" rx="${(w - 12) / 2}" fill="${SKIN}"/>` +
      `<rect x="3" y="0" width="${w - 6}" height="12" rx="5" fill="${EXPLORER.shorts}"/>` +
      `<path d="M2,${h - 4} Q2,${h - 15} ${w / 2},${h - 15} Q${w - 1},${h - 15} ${w - 1},${h - 5} L${w - 1},${h - 2} L2,${h - 2} Z" fill="${EXPLORER.boot}"/>` +
      `<rect x="1" y="${h - 4}" width="${w - 1}" height="4" rx="2" fill="${EXPLORER.sole}"/>`,
  );
}

/* ---------------------------------- FX ---------------------------------- */

export const BUBBLE_SIZE = { width: 180, height: 180 } as const;

function bubbleSvg(): string {
  const { width: w } = BUBBLE_SIZE;
  const c = w / 2;
  return svgDocument(
    w,
    w,
    `<circle cx="${c}" cy="${c}" r="${c - 3}" fill="url(#b)" stroke="#ffffff" stroke-opacity="0.8" stroke-width="3"/>` +
      `<ellipse cx="${c - 34}" cy="${c - 44}" rx="22" ry="12" fill="#fff" opacity="0.75" transform="rotate(-35 ${c - 34} ${c - 44})"/>` +
      `<circle cx="${c + 46}" cy="${c + 40}" r="7" fill="#fff" opacity="0.6"/>`,
    `<radialGradient id="b" cx="0.5" cy="0.5" r="0.5"><stop offset="0.6" stop-color="${PALETTE.candyBlue}" stop-opacity="0.08"/>` +
      `<stop offset="0.92" stop-color="${PALETTE.candyPurple}" stop-opacity="0.35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.6"/></radialGradient>`,
  );
}

/* ---------------------------------- Rig ---------------------------------- */

export type PartName = 'backpack' | 'legBack' | 'armBack' | 'legFront' | 'body' | 'armFront' | 'head' | 'face' | 'hair' | 'headwear';

export interface RigPart {
  name: PartName;
  /** Texture key, or null for the face (chosen at runtime: photo or drawn face). */
  key: string | null;
  width: number;
  height: number;
  /** Pivot inside the texture (0..1). */
  originX: number;
  originY: number;
  /** Attachment point relative to the feet (y is negative upwards). */
  x: number;
  y: number;
  /** Mirror the texture (the "back" limbs reuse the front art). */
  flipX?: boolean;
}

export const CharacterKeys = {
  head: 'char-head',
  faceDefault: 'char-face',
  faceBlink: 'char-face-blink',
  bubble: 'char-bubble',
  onesieHood: 'onesie-hood',
  onesieBody: 'onesie-body',
  onesieArm: 'onesie-arm',
  onesieLeg: 'onesie-leg',
  explorerHat: 'explorer-hat',
  explorerHair: 'explorer-hair',
  explorerBody: 'explorer-body',
  explorerBackpack: 'explorer-backpack',
  explorerArm: 'explorer-arm',
  explorerLeg: 'explorer-leg',
} as const;

/** Joint positions shared by both outfits. */
export const JOINTS = {
  hipY: -30,
  hipX: 10,
  shoulderY: -66,
  shoulderX: 25,
  bodyY: -50,
  headY: -108,
  faceY: -104,
} as const;

/** Physics/visual height of the character from the feet to the top of the head. */
export const CHARACTER_HEIGHT = 146;

export function buildRig(outfit: Outfit): RigPart[] {
  const onesie = outfit === 'onesie';
  const arm = onesie ? CharacterKeys.onesieArm : CharacterKeys.explorerArm;
  const leg = onesie ? CharacterKeys.onesieLeg : CharacterKeys.explorerLeg;
  const limb = (name: PartName, key: string, size: { width: number; height: number }, x: number, y: number, flipX = false): RigPart => ({
    name,
    key,
    ...size,
    originX: 0.5,
    originY: 0.14,
    x,
    y,
    flipX,
  });

  const parts: RigPart[] = [];
  if (!onesie) {
    parts.push({ name: 'backpack', key: CharacterKeys.explorerBackpack, ...BACKPACK_SIZE, originX: 0.5, originY: 0.5, x: 0, y: JOINTS.bodyY - 4 });
  }
  parts.push(
    limb('legBack', leg, LIMB_SIZE.leg, -JOINTS.hipX, JOINTS.hipY, true),
    limb('armBack', arm, LIMB_SIZE.arm, -JOINTS.shoulderX, JOINTS.shoulderY, true),
    limb('legFront', leg, LIMB_SIZE.leg, JOINTS.hipX, JOINTS.hipY),
    { name: 'body', key: onesie ? CharacterKeys.onesieBody : CharacterKeys.explorerBody, ...BODY_SIZE, originX: 0.5, originY: 0.5, x: 0, y: JOINTS.bodyY },
    limb('armFront', arm, LIMB_SIZE.arm, JOINTS.shoulderX, JOINTS.shoulderY),
    { name: 'head', key: CharacterKeys.head, ...HEAD_SIZE, originX: 0.5, originY: 0.5, x: 0, y: JOINTS.headY },
    { name: 'face', key: null, ...FACE_SIZE, originX: 0.5, originY: 0.5, x: 0, y: JOINTS.faceY },
  );
  if (onesie) {
    parts.push({ name: 'headwear', key: CharacterKeys.onesieHood, ...HOOD_SIZE, originX: 0.5, originY: 0.5, x: 0, y: JOINTS.headY - 3 });
  } else {
    parts.push(
      { name: 'hair', key: CharacterKeys.explorerHair, ...HAIR_SIZE, originX: 0.5, originY: 0.5, x: 0, y: JOINTS.headY - 24 },
      { name: 'headwear', key: CharacterKeys.explorerHat, ...HAT_SIZE, originX: 0.5, originY: 0.82, x: 0, y: JOINTS.headY - 22 },
    );
  }
  return parts;
}

/** All character textures, for the asset manifest. */
export const CHARACTER_ART: readonly { key: string; width: number; height: number; svg: () => string }[] = [
  { key: CharacterKeys.head, ...HEAD_SIZE, svg: headSvg },
  { key: CharacterKeys.faceDefault, ...FACE_SIZE, svg: () => defaultFaceSvg(false) },
  { key: CharacterKeys.faceBlink, ...FACE_SIZE, svg: () => defaultFaceSvg(true) },
  { key: CharacterKeys.bubble, ...BUBBLE_SIZE, svg: bubbleSvg },
  { key: CharacterKeys.onesieHood, ...HOOD_SIZE, svg: onesieHoodSvg },
  { key: CharacterKeys.onesieBody, ...BODY_SIZE, svg: onesieBodySvg },
  { key: CharacterKeys.onesieArm, ...LIMB_SIZE.arm, svg: onesieArmSvg },
  { key: CharacterKeys.onesieLeg, ...LIMB_SIZE.leg, svg: onesieLegSvg },
  { key: CharacterKeys.explorerHat, ...HAT_SIZE, svg: explorerHatSvg },
  { key: CharacterKeys.explorerHair, ...HAIR_SIZE, svg: explorerHairSvg },
  { key: CharacterKeys.explorerBody, ...BODY_SIZE, svg: explorerBodySvg },
  { key: CharacterKeys.explorerBackpack, ...BACKPACK_SIZE, svg: explorerBackpackSvg },
  { key: CharacterKeys.explorerArm, ...LIMB_SIZE.arm, svg: explorerArmSvg },
  { key: CharacterKeys.explorerLeg, ...LIMB_SIZE.leg, svg: explorerLegSvg },
];
