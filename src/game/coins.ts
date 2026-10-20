import { PLATFORM_CAP_WIDTH, PLATFORM_MID_WIDTH } from './art/platforms';
import type { LevelDefinition, PlatformSpec } from './levels';

/**
 * Coin placement, generated from any level's platforms (engine-free):
 * a little arc of 3 coins over every gap (a reason to jump), and a row of 3
 * on open platforms. Coins never sit on top of a star.
 */

export interface CoinSpot {
  x: number;
  y: number;
}

const ROW_HEIGHT = 62;
const ROW_SPACING = 64;
const ARC = [88, 128, 88];
const STAR_CLEARANCE = 80;

const widthOf = (p: PlatformSpec) => PLATFORM_CAP_WIDTH * 2 + PLATFORM_MID_WIDTH * p.middles;

export function placeCoins(level: LevelDefinition): CoinSpot[] {
  const stars = level.mechanics?.stars ?? level.template?.stars ?? [];
  const spots: CoinSpot[] = [];
  const platforms = [...level.platforms].sort((a, b) => a.x - b.x);
  platforms.forEach((p, i) => {
    const w = widthOf(p);
    if (!p.sparse && i % 2 === 0 && i > 0) {
      const cx = p.x + w / 2;
      for (let k = -1; k <= 1; k++) spots.push({ x: cx + k * ROW_SPACING, y: p.y - ROW_HEIGHT });
    }
    const next = platforms[i + 1];
    if (!next) return;
    const gapStart = p.x + w;
    const gap = next.x - gapStart;
    if (gap < 60) return;
    const top = Math.min(p.y, next.y);
    ARC.forEach((h, k) => spots.push({ x: gapStart + (gap * (k + 1)) / 4, y: top - h }));
  });
  return spots.filter((c) => stars.every((s) => Math.hypot(s.x - c.x, s.y - c.y) > STAR_CLEARANCE));
}
