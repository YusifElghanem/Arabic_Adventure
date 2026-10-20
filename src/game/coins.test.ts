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

describe('challenge arenas', () => {
  it('give every letter its own map and cast, with fair gaps', async () => {
    const { getChallengeLevel, thiefCount } = await import('./levels');
    const w = (m: number) => 96 * 2 + 128 * m;
    const layouts = new Set<string>();
    for (let id = 1; id <= 28; id++) {
      const level = getChallengeLevel(id)!;
      const guard = level.guard!;
      layouts.add(JSON.stringify(level.platforms));
      expect(guard.cast!.length).toBe(guard.thieves);
      expect(thiefCount(guard)).toBeGreaterThanOrEqual(7);
      expect(guard.cast!.includes('king')).toBe((id - 1) % 4 === 3 || id === 28);
      // Islands left to right: ordinary gaps ≤ 200; a wider gap always has a moving platform in it.
      const islands = level.platforms.filter((p) => !p.move && p.middles > 0).sort((a, b) => a.x - b.x);
      const movers = level.platforms.filter((p) => p.move);
      for (let i = 1; i < islands.length; i++) {
        const left = islands[i - 1].x + w(islands[i - 1].middles);
        const gap = islands[i].x - left;
        if (gap > 200) expect(movers.some((m) => m.x > left && m.x < islands[i].x)).toBe(true);
        else expect(gap).toBeGreaterThanOrEqual(130);
        expect(Math.abs(islands[i].y - islands[i - 1].y)).toBeLessThanOrEqual(150);
      }
      expect(level.goals.totalStars).toBe(guard.stars.length);
    }
    expect(layouts.size).toBe(28);
  });
});
