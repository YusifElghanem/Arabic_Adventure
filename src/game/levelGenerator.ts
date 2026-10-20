import { createRandom } from './art/svg';
import { requiredDots, type LetterSpec } from './letters';
import type { LevelDefinition, PlatformSpec, ThiefKind } from './levels';

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

/**
 * Thieves mode arena: a wide central island with the big letter, two side
 * islands a little higher, and two small floating steps above the centre.
 * Thieves fly in from both edges; carrying a letter they loop over the
 * centre low enough to catch (walking or with a jump). More thieves in later
 * worlds. Every gap is 140 px and every step-up 100–120 px.
 */
export function generateGuardLevel(spec: LetterSpec, id: number): LevelDefinition {
  const ground = 1000;
  const centre: PlatformSpec = { x: 700, y: ground, middles: 6, sparse: true };
  const left: PlatformSpec = { x: 240, y: ground - 100, middles: 1 };
  const right: PlatformSpec = { x: centre.x + widthOf(6) + 140, y: ground - 100, middles: 1 };
  const stepA: PlatformSpec = { x: 860, y: ground - 120, middles: 0, sparse: true };
  const stepB: PlatformSpec = { x: 1308, y: ground - 120, middles: 0, sparse: true };
  const width = right.x + widthOf(1) + 240;
  const cx = centre.x + widthOf(6) / 2;
  return {
    id,
    kind: 'guard',
    world: spec.world,
    width,
    height: GEN.height,
    spawn: { x: centre.x + 120, y: ground },
    groundY: ground,
    cloudSeaY: GEN.cloudSeaY,
    platforms: [left, centre, stepA, stepB, right],
    guard: {
      stars: [
        { x: left.x + widthOf(1) / 2, y: left.y - GEN.starAbove },
        { x: right.x + widthOf(1) / 2, y: right.y - GEN.starAbove },
        { x: cx, y: ground - 330 },
      ],
      letter: { x: cx, groundY: ground },
      thieves: 5 + Math.floor((spec.world - 1) / 2),
      maxAtOnce: spec.world >= 5 ? 3 : 2,
      entries: [
        { x: -80, y: ground - 260 },
        { x: width + 80, y: ground - 260 },
      ],
      // Thieves carrying a letter fly 90..250 px above the centre island.
      roam: { cx, halfWidth: 620, y: ground - 170, bob: 80 },
    },
    letter: spec,
    goals: { totalStars: 3, letterDotsRequired: 0 },
    decorSeed: 500 + id,
  };
}

/** Which thieves come in each world of challenge mode (shuffled per letter). */
const CHALLENGE_CAST: Record<number, Partial<Record<ThiefKind, number>>> = {
  1: { looper: 4, dasher: 3 },
  2: { looper: 3, dasher: 3, armored: 2 },
  3: { looper: 2, dasher: 3, armored: 2, blinker: 2 },
  4: { dasher: 3, armored: 2, blinker: 2, splitter: 1 },
  5: { looper: 2, dasher: 3, armored: 2, blinker: 2, splitter: 2 },
  6: { dasher: 3, armored: 3, blinker: 3, splitter: 2 },
  7: { dasher: 4, armored: 3, blinker: 3, splitter: 2 },
};

/**
 * Challenge mode: every letter gets its own arena from its seed: 4–5 islands
 * at different heights (gaps 130–200), small floating steps, and from world 2
 * one wide gap bridged by a moving platform (or crossed with the double
 * jump); from world 4 one floating step becomes a lift. The letter
 * stands on the widest middle island. Thieves get faster and throw candy more
 * often in later worlds, and the last letter of each world brings the king.
 */
export function generateChallengeLevel(spec: LetterSpec, id: number): LevelDefinition {
  const random = createRandom(id * 4241 + 77);
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const world = spec.world;
  const count = int(4, 5);
  const letterAt = Math.floor(count / 2);
  const wideGapAt = world >= 2 ? int(0, count - 2) : -1;
  const islands: PlatformSpec[] = [];
  const movers: PlatformSpec[] = [];
  const steps: PlatformSpec[] = [];
  let x = 200;
  let y = int(900, 1050);
  for (let i = 0; i < count; i++) {
    const middles = i === letterAt ? int(4, 5) : int(1, 3);
    islands.push({ x, y, middles, sparse: i === letterAt });
    const w = widthOf(middles);
    if (i === count - 1) break;
    if (i === wideGapAt) {
      // A gap too wide for one jump, bridged by a platform swinging across it.
      const gap = int(320, 360);
      movers.push({ x: x + w + gap / 2 - widthOf(0) / 2, y: y - int(0, 40), middles: 0, sparse: true, move: { dx: gap / 2 - 70, dy: 0, period: 4.2 - world * 0.15 } });
      x += w + gap;
    } else {
      const gap = int(130, 200);
      // Every other ordinary gap gets a small floating step above it.
      if (i % 2 === 0) steps.push({ x: x + w + gap / 2 - widthOf(0) / 2, y: y - int(150, 200), middles: 0, sparse: true });
      x += w + gap;
    }
    y = Math.max(780, Math.min(1080, y + int(-140, 140)));
  }
  const last = islands[islands.length - 1];
  const width = last.x + widthOf(last.middles) + 240;
  const letterIsland = islands[letterAt];
  const letterX = letterIsland.x + widthOf(letterIsland.middles) / 2;
  if (world >= 4 && steps.length > 0) {
    // The first floating step becomes a lift bobbing up and down.
    const step = steps.shift()!;
    movers.push({ ...step, y: step.y + 20, move: { dx: 0, dy: 70, period: 3.6 } });
  }
  const grounds = islands.map((p) => p.y);
  const avg = grounds.reduce((a, b) => a + b, 0) / grounds.length;
  const top = Math.min(...grounds);

  const pool: ThiefKind[] = [];
  for (const [kind, n] of Object.entries(CHALLENGE_CAST[world])) for (let k = 0; k < (n ?? 0); k++) pool.push(kind as ThiefKind);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const index = id - 1;
  if (index % 4 === 3 || index === 27) pool.push('king');

  return {
    id,
    kind: 'guard',
    world,
    width,
    height: GEN.height,
    spawn: { x: islands[0].x + 120, y: islands[0].y },
    groundY: Math.round(avg),
    cloudSeaY: GEN.cloudSeaY,
    platforms: [...islands, ...steps, ...movers],
    guard: {
      stars: [
        { x: islands[0].x + widthOf(islands[0].middles) / 2, y: islands[0].y - GEN.starAbove },
        ...[...steps, ...movers.filter((m) => m.move?.dy)].slice(0, 1).map((s) => ({ x: s.x + widthOf(0) / 2, y: s.y - GEN.starAbove })),
        { x: last.x + widthOf(last.middles) / 2, y: last.y - GEN.starAbove },
      ],
      letter: { x: letterX, groundY: letterIsland.y },
      thieves: pool.length,
      maxAtOnce: world >= 4 ? 4 : 3,
      entries: [
        { x: -80, y: top - 260 },
        { x: width + 80, y: top - 260 },
      ],
      roam: { cx: width / 2, halfWidth: width / 2 - 320, y: Math.round(avg - 200), bob: 110 },
      cast: pool,
      speed: 1.25 + world * 0.08,
      throwEvery: Math.max(2, 3.4 - world * 0.2),
    },
    letter: spec,
    goals: { totalStars: 2 + Math.min(1, steps.length + movers.filter((m) => m.move?.dy).length), letterDotsRequired: 0 },
    decorSeed: 900 + id,
  };
}
