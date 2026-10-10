import Phaser from 'phaser';
import { ArtKeys, type ArtKey } from '../art';
import { createRandom, range } from '../art/svg';
import { Depth } from './depths';
import type Platform from './Platform';

/**
 * Scatters candy scenery along the platforms: lollipop trees and gumdrops
 * at the back, flowers and grass tufts along the edges. Each sways about
 * its base on its own gentle rhythm. Placement is seeded, so a level always
 * looks the same.
 */

interface DecorKind {
  keys: readonly ArtKey[];
  /** Max sway angle in degrees. */
  sway: number;
  scale: [number, number];
  depth: number;
  /** Tall pieces are skipped on `sparse` platforms (mechanics need the space). */
  tall?: boolean;
}

const KINDS = {
  tree: { keys: [ArtKeys.lollipopPink, ArtKeys.lollipopBlue], sway: 1.6, scale: [0.8, 1.05], depth: Depth.decorBack, tall: true },
  gumdrop: { keys: [ArtKeys.gumdropPurple, ArtKeys.gumdropOrange], sway: 0, scale: [0.8, 1.1], depth: Depth.decorBack },
  mushroom: { keys: [ArtKeys.mushroom], sway: 0, scale: [0.7, 0.95], depth: Depth.decorBack },
  flower: {
    keys: [ArtKeys.flowerPink, ArtKeys.flowerPurple, ArtKeys.flowerBlue, ArtKeys.flowerWhite],
    sway: 7,
    scale: [0.8, 1.1],
    depth: Depth.decorBack,
  },
  tuft: { keys: [ArtKeys.grassTuft], sway: 5, scale: [0.8, 1.2], depth: Depth.decorFront },
} satisfies Record<string, DecorKind>;

export function decoratePlatforms(
  scene: Phaser.Scene,
  platforms: readonly Platform[],
  seed: number,
  resolution: number,
  reducedMotion: boolean,
): Phaser.GameObjects.Image[] {
  const random = createRandom(seed * 1013);
  const placed: Phaser.GameObjects.Image[] = [];
  const motion = reducedMotion ? 0.35 : 1;

  const put = (kind: DecorKind, x: number, y: number) => {
    const key = kind.keys[Math.floor(random() * kind.keys.length)];
    const scale = range(random, kind.scale[0], kind.scale[1]);
    const image = scene.add
      .image(x, y + 2, key)
      .setOrigin(0.5, 1)
      .setScale(scale / resolution)
      .setDepth(kind.depth)
      .setFlipX(random() > 0.5);
    placed.push(image);

    // Draw every random number up front, whatever the motion setting, so the
    // layout is identical with and without reduced motion.
    const swayAmount = range(random, 0.6, 1);
    const duration = range(random, 1300, 2400);
    const delay = range(random, 0, 1500);

    if (kind.sway > 0) {
      const amplitude = kind.sway * swayAmount * motion;
      image.setAngle(-amplitude);
      scene.tweens.add({
        targets: image,
        angle: amplitude,
        duration,
        delay,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    } else if (!reducedMotion) {
      // Gumdrops and mushrooms breathe instead: a soft squash.
      scene.tweens.add({
        targets: image,
        scaleY: (scale * 0.94) / resolution,
        scaleX: (scale * 1.04) / resolution,
        duration: duration + 300,
        delay,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    }
  };

  for (const platform of platforms) {
    const { left, right } = platform.walkable;
    const y = platform.spec.y;
    const width = right - left;

    // One or two tall pieces near the platform ends, kept clear of the middle.
    if (!platform.spec.sparse) {
      put(KINDS.tree, left + range(random, 20, 70), y);
      if (width > 600) put(KINDS.tree, right - range(random, 20, 70), y);
    }
    const smallBack = Math.max(1, Math.floor(width / 380));
    for (let i = 0; i < smallBack; i++) {
      put(random() > 0.5 ? KINDS.gumdrop : KINDS.mushroom, range(random, left + 40, right - 40), y);
    }
    // Flowers in little clusters.
    const clusters = Math.max(1, Math.floor(width / 260));
    for (let c = 0; c < clusters; c++) {
      const cx = left + ((c + 0.5) / clusters) * width + range(random, -50, 50);
      const count = 2 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) put(KINDS.flower, Phaser.Math.Clamp(cx + range(random, -40, 40), left, right), y);
    }
    // Grass tufts at the front edge, including near the rims.
    const tufts = Math.max(2, Math.floor(width / 200));
    for (let i = 0; i < tufts; i++) put(KINDS.tuft, left + (i / (tufts - 1)) * width + range(random, -12, 12), y);
  }
  return placed;
}
