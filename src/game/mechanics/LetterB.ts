import Phaser from 'phaser';
import { selectIsLetterComplete, useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import { randomCheer, say } from '@/utils/voice';
import { ArtKeys } from '../art';
import { BAA_BOTTOM_Y, BAA_FLOOR_X, BAA_FLOOR_Y, BAA_SIZE, DOT_SIZE, MechanicKeys } from '../art/mechanics';
import { Depth } from '../world/depths';

/**
 * The letter ب as a bouncy candy bowl. Landing in it launches the child high
 * into the sky with a squash-and-stretch "boing". Its dot starts as a
 * dashed ghost below the bowl. When the Mystery Block's dot arrives, it
 * pops in, the letter wiggles happily, and its name is spoken.
 */

/** Gap between the ground and the bowl's underside, where the dot sits. */
const LIFT = 62;
/** Upward launch speed: apex ≈ 1400² / (2·2000) ≈ 490 px. */
export const LETTER_B_LAUNCH_SPEED = 1400;

export default class LetterB {
  readonly zone: Phaser.GameObjects.Zone;
  private readonly scene: Phaser.Scene;
  private readonly bowl: Phaser.GameObjects.Image;
  private readonly ghost: Phaser.GameObjects.Image;
  private readonly dot: Phaser.GameObjects.Image;
  private readonly resolution: number;
  private lastLaunch = -Infinity;
  private complete: boolean;
  private sparkles?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, x: number, groundY: number, resolution: number) {
    this.scene = scene;
    this.resolution = resolution;
    const scale = 1 / resolution;
    const top = groundY - LIFT - BAA_BOTTOM_Y;

    // The bowl's pivot is its underside, so squashes look springy.
    this.bowl = scene.add
      .image(x, top + BAA_BOTTOM_Y, MechanicKeys.baa)
      .setOrigin(0.5, BAA_BOTTOM_Y / BAA_SIZE.height)
      .setScale(scale)
      .setDepth(Depth.player + 1);

    const floorLeft = x - BAA_SIZE.width / 2 + BAA_FLOOR_X[0];
    const floorWidth = BAA_FLOOR_X[1] - BAA_FLOOR_X[0];
    this.zone = scene.add.zone(floorLeft, top + BAA_FLOOR_Y, floorWidth, BAA_BOTTOM_Y - BAA_FLOOR_Y).setOrigin(0, 0);
    scene.physics.add.existing(this.zone, true);

    const dotY = groundY - LIFT / 2 - 2;
    this.ghost = scene.add.image(x, dotY, MechanicKeys.dotGhost).setScale(scale).setDepth(Depth.platforms + 1);
    this.dot = scene.add.image(x, dotY, MechanicKeys.dot).setScale(scale).setDepth(Depth.platforms + 2).setVisible(false);
    scene.tweens.add({ targets: this.ghost, scale: { from: scale * 0.9, to: scale * 1.08 }, alpha: { from: 0.6, to: 1 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.complete = selectIsLetterComplete(useGameStore.getState());
    if (this.complete) this.showDot(false);
    const unsubscribe = useGameStore.subscribe((state) => {
      const now = selectIsLetterComplete(state);
      if (now && !this.complete) {
        this.complete = true;
        this.showDot(true);
      }
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  /** Where the Mystery Block should send the dot. */
  get dotPosition(): { x: number; y: number } {
    return { x: this.dot.x, y: this.dot.y };
  }

  /** Called by the level's collider: bounce the child when they land in the bowl. */
  handleCollision(playerBody: Phaser.Physics.Arcade.Body, launch: (speed: number) => void): void {
    if (!playerBody.touching.down) return;
    const now = this.scene.time.now;
    // A body can stay in contact for a frame or two; launch once per landing.
    if (now - this.lastLaunch < 250) return;
    this.lastLaunch = now;
    launch(LETTER_B_LAUNCH_SPEED);
    playSound('boing');
    this.squash();
  }

  private squash(): void {
    const s = 1 / this.resolution;
    this.scene.tweens.killTweensOf(this.bowl);
    this.bowl.setScale(s * 1.18, s * 0.72);
    this.scene.tweens.add({ targets: this.bowl, scaleX: s, scaleY: s, duration: 520, ease: 'Elastic.easeOut', easeParams: [1.2, 0.35] });
  }

  private showDot(celebrate: boolean): void {
    const s = 1 / this.resolution;
    this.scene.tweens.killTweensOf(this.ghost);
    this.ghost.setVisible(false);
    this.dot.setVisible(true);
    if (!celebrate) return;

    useGameStore.getState().discoverLetter('ب');
    playSound('pop');
    this.scene.time.delayedCall(350, () => say([randomCheer(), 'letter-1'], 'باء'));
    this.dot.setScale(s * 0.2);
    this.scene.tweens.add({ targets: this.dot, scale: s, duration: 500, ease: 'Back.easeOut' });
    // A happy wiggle.
    this.scene.tweens.add({ targets: this.bowl, angle: { from: -6, to: 6 }, duration: 120, yoyo: true, repeat: 3, ease: 'Sine.easeInOut', onComplete: () => this.bowl.setAngle(0) });
    this.sparkles = this.scene.add
      .particles(this.dot.x, this.bowl.y - 40, ArtKeys.sparkle, {
        lifespan: 1400,
        speed: { min: 30, max: 90 },
        scale: { start: 0.6 / this.resolution, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xfff6a8, 0x8fdcff, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-BAA_SIZE.width / 2, -40, BAA_SIZE.width, 80), quantity: 1 },
        frequency: 120,
      })
      .setDepth(Depth.sparkles);
    void DOT_SIZE;
  }

  destroy(): void {
    this.sparkles?.destroy();
  }
}
