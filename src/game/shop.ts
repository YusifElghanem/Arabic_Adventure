import { DEFAULT_ONESIE_LOOK, type EarStyle, type OnesieColors, type OnesieLook } from './art/character';

/**
 * The coin shop catalogue (engine-free, read by React and Phaser).
 * - Costumes: animal onesies (ear style + their own colours).
 * - Skins: colour sets that recolour any onesie costume.
 * - Tools: gentle helpers. The bubble wand traps letter thieves in a bubble;
 *   the magnet pulls nearby coins in.
 * Item ids are "<kind>:<name>"; the free starters are owned from the start.
 */

export type ShopKind = 'costume' | 'skin' | 'tool';
export type ToolId = 'bubble' | 'magnet';

export interface ShopItem {
  id: string;
  kind: ShopKind;
  name: string;
  price: number;
  /** A Fluent Emoji (public/emoji) shown on the shop tile for tools. */
  emoji?: string;
}

interface CostumeSpec {
  ears: EarStyle;
  colors: OnesieColors;
  price: number;
}

export const COSTUMES: Record<string, CostumeSpec> = {
  bear: { ears: 'bear', colors: DEFAULT_ONESIE_LOOK.colors, price: 0 },
  bunny: { ears: 'bunny', colors: { base: '#ffd1e6', light: '#fff4fa', deep: '#ff9cc8', paw: '#ff7fb6' }, price: 30 },
  cat: { ears: 'cat', colors: { base: '#ffb35c', light: '#fff0dc', deep: '#f28a2e', paw: '#ffc9a8' }, price: 40 },
  dino: { ears: 'dino', colors: { base: '#7fdc6a', light: '#e5ffd6', deep: '#4fb84a', paw: '#ffd23f' }, price: 60 },
  panda: { ears: 'panda', colors: { base: '#f4f4f8', light: '#ffffff', deep: '#3b3b48', paw: '#ff9ab8' }, price: 80 },
};

export const SKINS: Record<string, { colors: OnesieColors | null; price: number }> = {
  /** The costume's own colours. */
  natural: { colors: null, price: 0 },
  pink: { colors: { base: '#ff8cc6', light: '#ffe3f1', deep: '#f0569f', paw: '#fff0a8' }, price: 25 },
  mint: { colors: { base: '#6fe3c0', light: '#e2fff5', deep: '#35c29a', paw: '#ffb3cf' }, price: 25 },
  sky: { colors: { base: '#6cc8ff', light: '#e3f5ff', deep: '#3a9ef0', paw: '#ffd23f' }, price: 25 },
  gold: { colors: { base: '#ffd23f', light: '#fff6c2', deep: '#f2a900', paw: '#ff8a3d' }, price: 70 },
  night: { colors: { base: '#5b5fd6', light: '#d7d9ff', deep: '#3a3cab', paw: '#ffd23f' }, price: 90 },
};

export const TOOLS: Record<ToolId, { price: number; emoji: string }> = {
  bubble: { price: 50, emoji: 'bubbles' },
  magnet: { price: 80, emoji: 'magnet' },
};

export const SHOP_ITEMS: readonly ShopItem[] = [
  ...Object.entries(COSTUMES).map(([name, c]) => ({ id: `costume:${name}`, kind: 'costume' as const, name, price: c.price })),
  ...Object.entries(SKINS).map(([name, c]) => ({ id: `skin:${name}`, kind: 'skin' as const, name, price: c.price })),
  ...Object.entries(TOOLS).map(([name, c]) => ({ id: `tool:${name}`, kind: 'tool' as const, name, price: c.price, emoji: c.emoji })),
];

export const STARTER_ITEMS = ['costume:bear', 'skin:natural'];

export const shopItem = (id: string): ShopItem | undefined => SHOP_ITEMS.find((i) => i.id === id);

/** The onesie look for a costume + skin choice (unknown ids fall back to the defaults). */
export function onesieLook(costume: string, skin: string): OnesieLook {
  const c = COSTUMES[costume] ?? COSTUMES.bear;
  return { ears: c.ears, colors: SKINS[skin]?.colors ?? c.colors };
}
