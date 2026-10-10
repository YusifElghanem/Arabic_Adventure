import { describe, expect, it } from 'vitest';
import { AVAILABLE_LEVEL_IDS } from './levelCatalog';
import { LEVELS } from './levels';

describe('level catalog', () => {
  it('matches the registered level components', () => {
    expect([...AVAILABLE_LEVEL_IDS].sort()).toEqual(Object.keys(LEVELS).map(Number).sort());
  });
});
