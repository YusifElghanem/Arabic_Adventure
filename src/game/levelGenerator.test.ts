import { describe, expect, it } from 'vitest';
import { ARABIC_LETTERS, LEVEL_COUNT } from '@/stores/useGameStore';
import { GEN, generateTemplateLevel } from './levelGenerator';
import { getLevelDefinition, isLevelAvailable } from './levels';
import { FIRST_TEMPLATE_LETTER, LETTERS, TOTAL_LEVELS, requiredDots } from './letters';

const width = (middles: number) => 192 + 128 * middles;
const templateIds = Array.from({ length: TOTAL_LEVELS - 1 }, (_, i) => i + FIRST_TEMPLATE_LETTER);

describe('letter table', () => {
  it('has all 28 letters in alphabet order', () => {
    expect(LETTERS.map((l) => l.letter)).toEqual([...ARABIC_LETTERS]);
  });

  it('has a picture file for every letter', () => {
    const files = Object.keys(import.meta.glob('../../public/emoji/*.svg')).map((f) => f.split('/').pop());
    for (const l of LETTERS) expect(files, l.emoji).toContain(`${l.emoji}.svg`);
  });

  it('uses valid worlds and dot counts', () => {
    for (const l of LETTERS) {
      expect(l.world).toBeGreaterThanOrEqual(1);
      expect(l.world).toBeLessThanOrEqual(7);
      expect(requiredDots(l)).toBe(Math.max(1, l.dots));
    }
  });

  it('keeps the store level count in sync', () => {
    expect(LEVEL_COUNT).toBe(TOTAL_LEVELS);
  });
});

describe('level catalog', () => {
  it('serves the classic level 1 and generated levels 2..27', () => {
    expect(getLevelDefinition(1)?.kind).toBe('classic');
    for (const id of templateIds) {
      const def = getLevelDefinition(id)!;
      expect(def.kind).toBe('template');
      expect(def.letter?.letter).toBe(LETTERS[id].letter);
    }
    expect(isLevelAvailable(0)).toBe(false);
    expect(isLevelAvailable(TOTAL_LEVELS + 1)).toBe(false);
    expect(getLevelDefinition(TOTAL_LEVELS + 1)).toBeUndefined();
  });
});

describe.each(templateIds.map((id) => [LETTERS[id].letter, id] as const))('generated level for %s', (_, id) => {
  const spec = LETTERS[id];
  const level = generateTemplateLevel(spec, id);
  const t = level.template!;
  const ps = level.platforms;

  it('is deterministic', () => {
    expect(generateTemplateLevel(spec, id)).toEqual(level);
  });

  it('keeps every gap and step toddler-safe', () => {
    for (let i = 1; i < ps.length; i++) {
      const gap = ps[i].x - (ps[i - 1].x + width(ps[i - 1].middles));
      expect(gap).toBeGreaterThanOrEqual(GEN.gapMin);
      expect(gap).toBeLessThanOrEqual(GEN.gapMax);
      expect(ps[i - 1].y - ps[i].y).toBeLessThanOrEqual(GEN.stepUpMax);
      expect(ps[i].y - ps[i - 1].y).toBeLessThanOrEqual(GEN.stepDownMax);
    }
    for (const p of ps) {
      expect(p.y).toBeGreaterThanOrEqual(GEN.groundMin);
      expect(p.y).toBeLessThanOrEqual(GEN.groundMax);
    }
  });

  it('has one reachable block per needed dot', () => {
    expect(t.blocks).toHaveLength(requiredDots(spec));
    expect(level.goals.letterDotsRequired).toBe(requiredDots(spec));
    t.blocks.forEach((b, i) => {
      const p = ps[1 + i];
      const bottomAbove = p.y - (b.y + 46);
      expect(bottomAbove).toBeGreaterThanOrEqual(180);
      expect(bottomAbove).toBeLessThanOrEqual(230);
      expect(b.x).toBeGreaterThan(p.x + 46);
      expect(b.x).toBeLessThan(p.x + width(p.middles) - 46);
    });
  });

  it('places the letter, friend, stars and goal on their platforms', () => {
    const on = (x: number, p: (typeof ps)[number]) => x > p.x && x < p.x + width(p.middles);
    expect(on(t.letter.x, ps[4]) && t.letter.groundY === ps[4].y).toBe(true);
    expect(on(t.friend.x, ps[4])).toBe(true);
    expect(on(t.goal.x, ps[5]) && t.goal.groundY === ps[5].y).toBe(true);
    expect(t.stars).toHaveLength(3);
    [1, 3, 5].forEach((pi, i) => expect(on(t.stars[i].x, ps[pi])).toBe(true));
    expect(level.width).toBeGreaterThan(t.goal.x + 200);
  });
});
