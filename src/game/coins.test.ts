import { describe, expect, it } from 'vitest';
import { placeCoins } from './coins';
import { getLevelDefinition } from './levels';
import { LEVEL_COUNT } from '@/stores/useGameStore';

describe('placeCoins', () => {
  it('gives every level coins inside the world, away from stars', () => {
    for (let id = 1; id <= LEVEL_COUNT; id++) {
      const level = getLevelDefinition(id)!;
      const coins = placeCoins(level);
      expect(coins.length).toBeGreaterThanOrEqual(10);
      const stars = level.mechanics?.stars ?? level.template?.stars ?? [];
      for (const c of coins) {
        expect(c.x).toBeGreaterThan(0);
        expect(c.x).toBeLessThan(level.width);
        expect(c.y).toBeGreaterThan(0);
        expect(c.y).toBeLessThan(level.cloudSeaY);
        for (const s of stars) expect(Math.hypot(s.x - c.x, s.y - c.y)).toBeGreaterThan(80);
      }
    }
  });

  it('is deterministic', () => {
    const level = getLevelDefinition(5)!;
    expect(placeCoins(level)).toEqual(placeCoins(level));
  });
});

describe('thieves arenas', () => {
  it('exist for all 28 letters, with safe gaps and steps', async () => {
    const { getGuardLevel } = await import('./levels');
    const { platformWidth } = { platformWidth: (m: number) => 96 * 2 + 128 * m };
    for (let id = 1; id <= 28; id++) {
      const level = getGuardLevel(id)!;
      expect(level.kind).toBe('guard');
      expect(level.guard!.thieves).toBeGreaterThanOrEqual(5);
      const main = [...level.platforms].filter((p) => !p.sparse || p.middles > 0).sort((a, b) => a.x - b.x);
      for (let i = 1; i < main.length; i++) {
        const gap = main[i].x - (main[i - 1].x + platformWidth(main[i - 1].middles));
        expect(gap).toBeLessThanOrEqual(160);
        expect(Math.abs(main[i].y - main[i - 1].y)).toBeLessThanOrEqual(120);
      }
      // Carried letters loop within reach of a jump from the centre island.
      const { roam, letter } = level.guard!;
      expect(letter.groundY - (roam.y - roam.bob)).toBeLessThan(260);
      expect(placeCoins(level)).toEqual([]);
    }
    expect(getGuardLevel(29)).toBeUndefined();
  });
});
