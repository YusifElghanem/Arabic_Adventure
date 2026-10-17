import { createRandom } from './art/svg';
import { requiredDots, type LetterSpec } from './letters';
import type { LevelDefinition, PlatformSpec } from './levels';

/**
 * Builds a complete, always-completable level from a letter (engine-free,
 * deterministic, unit-tested). Six floating platforms with varied heights
 * and widths; one Mystery Block per dot the letter needs on platforms 1–3;
 * the big letter and its word picture on platform 4; the rainbow on
 * platform 5; three stars along the way.
 *
 * Safety limits keep it toddler-friendly: gaps 110–160 px (a jump covers
 * ~290), step-ups ≤ 110 px (jump apex ~182), drops ≤ 200 px.
 */

export const GEN = {
  platformCount: 6,
  groundMax: 1100,
  groundMin: 780,
  gapMin: 110,
  gapMax: 160,
  stepUpMax: 110,
  stepDownMax: 200,
  middlesMin: 2,
  middlesMax: 5,
  /** Block centre above the surface: bottom edge ≈ 211 px up, like Level 1. */
  blockAbove: 254,
  starAbove: 64,
  cloudSeaY: 1290,
  height: 1440,
} as const;

const PLATFORM_EDGE = 96;
const PLATFORM_MID = 128;
const widthOf = (middles: number) => PLATFORM_EDGE * 2 + PLATFORM_MID * middles;

export function generateTemplateLevel(spec: LetterSpec, levelId: number): LevelDefinition {
  const random = createRandom(levelId * 7919 + 13);
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const blocks = requiredDots(spec);

  const platforms: PlatformSpec[] = [];
  let x = 0;
  let y: number = GEN.groundMax;
  for (let i = 0; i < GEN.platformCount; i++) {
    if (i > 0) {
      x += int(GEN.gapMin, GEN.gapMax);
      const next = y + int(-GEN.stepUpMax, GEN.stepDownMax);
      y = Math.min(GEN.groundMax, Math.max(GEN.groundMin, next));
    }
    // The start, the letter platform and the goal platform are roomy.
    const middles = i === 0 || i >= 4 ? Math.max(4, int(GEN.middlesMin, GEN.middlesMax)) : int(GEN.middlesMin, GEN.middlesMax);
    const sparse = (i >= 1 && i <= blocks) || i === 4;
    platforms.push({ x, y, middles, ...(sparse ? { sparse: true } : {}) });
    x += widthOf(middles);
  }

  const centre = (p: PlatformSpec) => p.x + widthOf(p.middles) / 2;
  const right = (p: PlatformSpec) => p.x + widthOf(p.middles);

  const blockList = Array.from({ length: blocks }, (_, i) => {
    const p = platforms[1 + i];
    return { x: centre(p), y: p.y - GEN.blockAbove };
  });

  const stars = [1, 3, 5].map((i) => {
    const p = platforms[i];
    const w = widthOf(p.middles);
    let sx = p.x + 0.3 * w;
    // Keep stars clear of blocks so a jump for one doesn't steal the other.
    if (blockList.some((b) => Math.abs(b.x - sx) < 120)) sx = p.x + 0.7 * w;
    return { x: Math.round(sx), y: p.y - GEN.starAbove };
  });

  const letterPlatform = platforms[4];
  const goalPlatform = platforms[5];
  const letterX = centre(letterPlatform) - 60;

  return {
    id: levelId,
    kind: 'template',
    world: spec.world,
    width: right(goalPlatform) + 224,
    height: GEN.height,
    spawn: { x: 180, y: GEN.groundMax },
    groundY: GEN.groundMax,
    cloudSeaY: GEN.cloudSeaY,
    platforms,
    template: {
      stars,
      blocks: blockList,
      letter: { x: letterX, groundY: letterPlatform.y },
      friend: { x: letterX + 230, groundY: letterPlatform.y },
      goal: { x: right(goalPlatform) - 200, groundY: goalPlatform.y },
    },
    letter: spec,
    goals: { totalStars: 3, letterDotsRequired: blocks },
    decorSeed: levelId,
  };
}
