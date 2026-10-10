import Phaser from 'phaser';
import { useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import { ArtKeys } from '../art';
import { MechanicKeys, STAR_SIZE } from '../art/mechanics';
import { Depth } from '../world/depths';

/** A chubby smiling star. Touch it to collect it with a sparkly burst. */
export default class Star {
  readonly zone: Phaser.GameObjects.Zone;
  private readonly scene: Phaser.Scene;
  private readonly image: Phaser.GameObjects.Image;
  private readonly resolution: number;
  private collected = false;

  constructor(scene: Phaser.Scene, x: number, y: number, resolution: number) {
    this.scene = scene;
    this.resolution = resolution;
    const s = 1 / resolution;
    this.image = scene.add.image(x, y, MechanicKeys.star).setScale(s).setDepth(Depth.butterflies);
    scene.tweens.add({ targets: this.image, y: y - 12, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: (x % 7) * 90 });
    scene.tweens.add({ targets: this.image, angle: { from: -10, to: 10 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.zone = scene.add.zone(x, y, STAR_SIZE.width * 0.85, STAR_SIZE.height * 0.85);
    scene.physics.add.existing(this.zone, true);
  }

  get isCollected(): boolean {
    return this.collected;
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;
    (this.zone.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    useGameStore.getState().collectStar();
    playSound('collect');

    const burst = this.scene.add
      .particles(this.image.x, this.image.y, ArtKeys.sparkle, {
        lifespan: 700,
        speed: { min: 120, max: 260 },
        scale: { start: 0.7 / this.resolution, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffd23f, 0xfff6a8, 0xff6fae, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(Depth.sparkles);
    burst.explode(22);
    this.scene.time.delayedCall(900, () => burst.destroy());

    this.scene.tweens.killTweensOf(this.image);
    const s = 1 / this.resolution;
    this.scene.tweens.add({
      targets: this.image,
      y: this.image.y - 90,
      scale: s * 1.6,
      angle: 360,
      alpha: 0,
      duration: 650,
      ease: 'Back.easeIn',
      onComplete: () => this.image.destroy(),
    });
  }
}
