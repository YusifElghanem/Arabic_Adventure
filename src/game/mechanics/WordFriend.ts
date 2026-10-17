import Phaser from 'phaser';
import { selectIsLetterComplete, useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import { sayLetterAndWord, sayWord } from '@/utils/voice';
import { ArtKeys } from '../art';
import { letterIndex, type LetterSpec } from '../letters';
import { Depth } from '../world/depths';

/**
 * The letter's word friend: a picture (Fluent Emoji) that bounces happily
 * next to the letter. When the child comes close it jumps, spins and says
 * its word. Once the letter is complete it says the letter and the word.
 */

export const friendTextureKey = (spec: LetterSpec) => `emoji-${spec.emoji}`;
export const FRIEND_SIZE = 160;

export default class WordFriend {
  readonly sensor: Phaser.GameObjects.Zone;
  private readonly scene: Phaser.Scene;
  private readonly spec: LetterSpec;
  private readonly image: Phaser.GameObjects.Image;
  private readonly baseY: number;
  private lastGreet = -Infinity;
  private busy = false;

  constructor(scene: Phaser.Scene, spec: LetterSpec, x: number, groundY: number) {
    this.scene = scene;
    this.spec = spec;
    this.baseY = groundY + 2;
    this.image = scene.add
      .image(x, this.baseY, friendTextureKey(spec))
      .setOrigin(0.5, 1)
      .setDisplaySize(FRIEND_SIZE, FRIEND_SIZE)
      .setDepth(Depth.decorBack + 2);
    const sy = this.image.scaleY;
    scene.tweens.add({ targets: this.image, scaleY: sy * 0.94, scaleX: this.image.scaleX * 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.sensor = scene.add.zone(x - 120, groundY - 260, 240, 260).setOrigin(0, 0);
    scene.physics.add.existing(this.sensor, true);
  }

  /** Called while the child overlaps the friend. */
  greet(): void {
    const now = this.scene.time.now;
    if (this.busy || now - this.lastGreet < 3500) return;
    this.lastGreet = now;
    this.busy = true;
    playSound('boing');
    this.scene.tweens.add({
      targets: this.image,
      y: this.baseY - 70,
      duration: 300,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.image.setY(this.baseY);
        this.busy = false;
      },
    });
    const sx = Math.abs(this.image.scaleX);
    this.scene.tweens.add({ targets: this.image, scaleX: { from: sx, to: -sx }, duration: 150, yoyo: true, repeat: 1 });
    const burst = this.scene.add
      .particles(this.image.x, this.image.y - FRIEND_SIZE / 2, ArtKeys.sparkle, {
        lifespan: 700,
        speed: { min: 80, max: 180 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffd23f, 0xff6fae, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(Depth.sparkles);
    burst.explode(14);
    this.scene.time.delayedCall(900, () => burst.destroy());
    const complete = selectIsLetterComplete(useGameStore.getState());
    this.scene.time.delayedCall(250, () => (complete ? sayLetterAndWord : sayWord)(letterIndex(this.spec)));
  }
}
