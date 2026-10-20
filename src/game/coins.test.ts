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
