import Phaser from 'phaser';
import { playSound } from '@/utils/sound';
import { ArtKeys } from '../art';
import { BLOCK_SIZE, GLOW_SIZE, MechanicKeys } from '../art/mechanics';
import { Depth } from '../world/depths';

/**
 * A glowing gift block. Bonk it from below and it bounces, smiles, and
 * releases a bright dot. The dot arcs through the air and lands under the
 * letter ب, completing it.
 */

const FLIGHT_MS = 1500;

export default class MysteryBlock {
  readonly zone: Phaser.GameObjects.Zone;
  private readonly scene: Phaser.Scene;
  private readonly image: Phaser.GameObjects.Image;
  private readonly resolution: number;
  private used = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    resolution: number,
    private readonly getDotTarget: () => { x: number; y: number },
    private readonly onDotDelivered: () => void,
  ) {
    this.scene = scene;
    this.resolution = resolution;
    this.image = scene.add.image(x, y, MechanicKeys.block).setScale(1 / resolution).setDepth(Depth.platforms + 1);
    this.zone = scene.add.zone(x, y, BLOCK_SIZE.width - 6, BLOCK_SIZE.height - 6);
    scene.physics.add.existing(this.zone, true);

    // An idle "notice me" shimmer.
    scene.tweens.add({ targets: this.image, angle: { from: -3, to: 3 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  get isUsed(): boolean {
    return this.used;
  }

  /** Called by the level's collider; only a hit from underneath counts. */
  handleCollision(playerBody: Phaser.Physics.Arcade.Body): void {
    if (this.used) return;
    if (!playerBody.touching.up) return;
    this.bonk();
  }

  bonk(): void {
    if (this.used) return;
    this.used = true;
    playSound('bump');
    this.scene.tweens.killTweensOf(this.image);
    this.image.setAngle(0);
    const baseY = this.image.y;
    this.scene.tweens.add({
      targets: this.image,
      y: baseY - 18,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut',
      onYoyo: () => this.image.setTexture(MechanicKeys.blockUsed),
      onComplete: () => this.image.setY(baseY),
    });
    this.releaseDot();
  }

  private releaseDot(): void {
    const { scene } = this;
    const start = new Phaser.Math.Vector2(this.image.x, this.image.y - BLOCK_SIZE.height * 0.6);
    const targetPoint = this.getDotTarget();
    const end = new Phaser.Math.Vector2(targetPoint.x, targetPoint.y);
    const control = new Phaser.Math.Vector2((start.x + end.x) / 2, Math.min(start.y, end.y) - 260);
    const curve = new Phaser.Curves.QuadraticBezier(start, control, end);
    const point = new Phaser.Math.Vector2();

    const glow = scene.add.image(start.x, start.y, MechanicKeys.glow).setScale(0.9 / this.resolution).setDepth(Depth.sparkles);
    const trail = scene.add
      .particles(0, 0, ArtKeys.sparkle, {
        follow: glow,
        lifespan: 600,
        speed: { min: 10, max: 40 },
        scale: { start: 0.5 / this.resolution, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xfff6a8, 0xffd23f, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        frequency: 30,
      })
      .setDepth(Depth.sparkles - 1);

    const progress = { t: 0 };
    scene.tweens.add({
      targets: progress,
      t: 1,
      duration: FLIGHT_MS,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        curve.getPoint(progress.t, point);
        glow.setPosition(point.x, point.y);
        glow.setScale(((0.9 + Math.sin(progress.t * 40) * 0.08) * GLOW_SIZE.width) / GLOW_SIZE.width / this.resolution);
      },
      onComplete: () => {
        trail.stop();
        scene.time.delayedCall(700, () => trail.destroy());
        glow.destroy();
        this.onDotDelivered();
      },
    });
  }
}
