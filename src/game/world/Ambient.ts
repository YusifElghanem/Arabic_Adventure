import Phaser from 'phaser';
import { ArtKeys } from '../art';
import { PALETTE } from '../art/palette';
import { createRandom, range } from '../art/svg';
import { Depth } from './depths';

/**
 * Magical ambience: twinkling sparkles drifting up through the view, and a
 * few butterflies fluttering loops above the platforms.
 */

const SPARKLE_TINTS = [PALETTE.candyPink, PALETTE.candyYellow, PALETTE.candyBlue, PALETTE.candyPurple, PALETTE.white].map(
  (hex) => Phaser.Display.Color.HexStringToColor(hex).color,
);

interface Butterfly {
  sprite: Phaser.GameObjects.Image;
  homeX: number;
  homeY: number;
  radiusX: number;
  radiusY: number;
  speed: number;
  phase: number;
  lastX: number;
}

export default class Ambient {
  private readonly scene: Phaser.Scene;
  private readonly sparkles?: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly butterflies: Butterfly[] = [];
  private elapsed = 0;

  constructor(scene: Phaser.Scene, resolution: number, homes: readonly { x: number; y: number }[], reducedMotion: boolean, seed = 1) {
    this.scene = scene;
    const random = createRandom(seed * 4093);

    if (!reducedMotion) {
      this.sparkles = scene.add
        .particles(0, 0, ArtKeys.sparkle, {
          lifespan: { min: 2600, max: 4200 },
          speedY: { min: -26, max: -10 },
          speedX: { min: -10, max: 10 },
          scale: { min: 0.25 / resolution, max: 0.6 / resolution },
          rotate: { min: 0, max: 360 },
          // Fade in, twinkle, fade out over each sparkle's life.
          alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(Math.PI * t) * 0.9 },
          tint: SPARKLE_TINTS,
          blendMode: Phaser.BlendModes.ADD,
          frequency: 220,
          quantity: 1,
          maxAliveParticles: 36,
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, 1, 1), quantity: 1 },
        })
        .setDepth(Depth.sparkles);
    }

    const keys = [ArtKeys.butterflyPink, ArtKeys.butterflyBlue];
    homes.forEach((home, i) => {
      const sprite = scene.add
        .image(home.x, home.y, keys[i % keys.length])
        .setScale(0.85 / resolution)
        .setDepth(Depth.butterflies);
      // Flap: squeeze the wings with a quick yoyo on scaleX.
      scene.tweens.add({
        targets: sprite,
        scaleX: 0.2 / resolution,
        duration: reducedMotion ? 420 : 150,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: range(random, 0, 200),
      });
      this.butterflies.push({
        sprite,
        homeX: home.x,
        homeY: home.y,
        radiusX: range(random, 90, 160),
        radiusY: range(random, 30, 60),
        speed: (reducedMotion ? 0.25 : 0.55) * range(random, 0.8, 1.2),
        phase: random() * Math.PI * 2,
        lastX: home.x,
      });
    });
  }

  update(deltaMs: number): void {
    this.elapsed += deltaMs;

    if (this.sparkles) {
      // Emit across the current view (world coordinates), so sparkles stay put as the camera moves.
      const view = this.scene.cameras.main.worldView;
      const zone = (this.sparkles.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle } | undefined)?.source;
      zone?.setTo(view.x - 100, view.y + view.height * 0.15, view.width + 200, view.height * 0.85);
    }

    const t = this.elapsed / 1000;
    for (const b of this.butterflies) {
      const a = t * b.speed + b.phase;
      // A lazy figure-eight with a little vertical bounce.
      const x = b.homeX + Math.sin(a) * b.radiusX;
      const y = b.homeY + Math.sin(a * 2) * b.radiusY + Math.sin(a * 7) * 6;
      b.sprite.setPosition(x, y);
      if (Math.abs(x - b.lastX) > 0.01) b.sprite.setFlipX(x < b.lastX);
      b.lastX = x;
    }
  }
}
