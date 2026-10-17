import Phaser from 'phaser';
import { useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import { sayLetterAndWord } from '@/utils/voice';
import { ArtKeys } from '../art';
import { ALEF_SIZE, LION_SIZE, MechanicKeys } from '../art/mechanics';
import { Depth } from '../world/depths';

/**
 * A giant, smiling letter أ floating over the island, with its word-friend
 * the lion (أسد). When the child walks up, the letter does a happy flip and
 * hop, the lion roars (cutely), and the device says "ألف… أسد" where an
 * Arabic voice is available.
 */
export default class FloatingLetterA {
  readonly sensor: Phaser.GameObjects.Zone;
  private readonly scene: Phaser.Scene;
  private readonly alef: Phaser.GameObjects.Image;
  private readonly lion: Phaser.GameObjects.Image;
  private readonly resolution: number;
  private lastGreet = -Infinity;
  private discovered = false;

  constructor(scene: Phaser.Scene, x: number, groundY: number, lionX: number, resolution: number) {
    this.scene = scene;
    this.resolution = resolution;
    const s = 1 / resolution;
    const alefScale = 0.78;

    this.alef = scene.add
      .image(x, groundY - 46 - (ALEF_SIZE.height * alefScale) / 2, MechanicKeys.alef)
      .setScale(s * alefScale)
      .setDepth(Depth.decorBack + 1);
    scene.tweens.add({ targets: this.alef, y: this.alef.y - 18, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: this.alef, angle: { from: -3, to: 3 }, duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.lion = scene.add
      .image(lionX, groundY + 4, MechanicKeys.lion)
      .setOrigin(0.5, 1)
      .setScale(s * 0.85)
      .setDepth(Depth.decorBack + 2);
    // Gentle breathing.
    scene.tweens.add({ targets: this.lion, scaleY: s * 0.87, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const left = Math.min(x, lionX) - 140;
    const right = Math.max(x, lionX) + LION_SIZE.width * 0.4;
    this.sensor = scene.add.zone(left, groundY - 360, right - left, 360).setOrigin(0, 0);
    scene.physics.add.existing(this.sensor, true);
  }

  /** Called while the child overlaps the letter's area. */
  greet(): void {
    const now = this.scene.time.now;
    // At most every few seconds, so walking back and forth isn't noisy.
    if (now - this.lastGreet < 3500) return;
    this.lastGreet = now;

    if (!this.discovered) {
      this.discovered = true;
      useGameStore.getState().discoverLetter('أ');
      this.scene.add
        .particles(this.alef.x, this.alef.y, ArtKeys.sparkle, {
          lifespan: 1600,
          speed: { min: 20, max: 70 },
          scale: { start: 0.55 / this.resolution, end: 0 },
          alpha: { start: 1, end: 0 },
          tint: [0xffc2c2, 0xffffff, 0xfff6a8],
          blendMode: Phaser.BlendModes.ADD,
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-80, -200, 160, 400), quantity: 1 },
          frequency: 140,
        })
        .setDepth(Depth.sparkles);
    }
    playSound('roar');
    this.scene.time.delayedCall(450, () => sayLetterAndWord(0));

    // The letter flips round (a 2D "spin") and hops.
    const s = this.alef.scaleY;
    this.scene.tweens.add({ targets: this.alef, scaleX: { from: s, to: -s }, duration: 260, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => this.alef.setScale(s) });

    // The lion roars: open mouth and a proud puff-up.
    this.lion.setTexture(MechanicKeys.lionRoar);
    const ls = 0.85 / this.resolution;
    this.scene.tweens.add({ targets: this.lion, scaleX: ls * 1.12, duration: 160, yoyo: true, repeat: 2, ease: 'Quad.easeOut' });
    this.scene.time.delayedCall(900, () => this.lion.setTexture(MechanicKeys.lion));
  }
}
