import Phaser from 'phaser';
import { selectIsLetterComplete, useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import { sayWellDone } from '@/utils/voice';
import { ArtKeys } from '../art';
import { MechanicKeys, RAINBOW_SIZE } from '../art/mechanics';
import { Depth } from '../world/depths';

/**
 * A rainbow arch at the end of the level. It shines once the level's letter
 * is complete, and walking through it finishes the level. If the letter
 * still needs its dot, the arch wobbles and shows a ghost dot as a hint: a
 * gentle nudge, never a "no".
 */
export default class GoalGate {
  readonly sensor: Phaser.GameObjects.Zone;
  private readonly scene: Phaser.Scene;
  private readonly arch: Phaser.GameObjects.Image;
  private readonly hint: Phaser.GameObjects.Image;
  private readonly resolution: number;
  private ready: boolean;
  private done = false;
  private lastHint = -Infinity;
  private sparkles?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, x: number, groundY: number, resolution: number) {
    this.scene = scene;
    this.resolution = resolution;
    const s = 1 / resolution;
    this.arch = scene.add.image(x, groundY + 6, MechanicKeys.rainbow).setOrigin(0.5, 1).setScale(s).setDepth(Depth.decorBack + 1);
    this.hint = scene.add
      .image(x, groundY - RAINBOW_SIZE.height - 20, MechanicKeys.dotGhost)
      .setScale(s * 1.2)
      .setDepth(Depth.sparkles)
      .setAlpha(0);
    this.sensor = scene.add.zone(x - 40, groundY - 200, 80, 200).setOrigin(0, 0);
    scene.physics.add.existing(this.sensor, true);

    this.ready = selectIsLetterComplete(useGameStore.getState());
    this.applyReady(false);
    const unsubscribe = useGameStore.subscribe((state) => {
      const ready = selectIsLetterComplete(state);
      if (ready !== this.ready) {
        this.ready = ready;
        this.applyReady(true);
      }
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  private applyReady(animate: boolean): void {
    const alpha = this.ready ? 1 : 0.55;
    if (animate) this.scene.tweens.add({ targets: this.arch, alpha, duration: 600 });
    else this.arch.setAlpha(alpha);
    if (this.ready && !this.sparkles) {
      this.sparkles = this.scene.add
        .particles(this.arch.x, this.arch.y - RAINBOW_SIZE.height / 2, ArtKeys.sparkle, {
          lifespan: 1800,
          speed: { min: 10, max: 40 },
          scale: { start: 0.55 / this.resolution, end: 0 },
          alpha: { start: 1, end: 0 },
          tint: [0xff6b6b, 0xffd23f, 0x5fe08a, 0x5ec8ff, 0xb07cff],
          blendMode: Phaser.BlendModes.ADD,
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-RAINBOW_SIZE.width / 2, -RAINBOW_SIZE.height / 2, RAINBOW_SIZE.width, RAINBOW_SIZE.height), quantity: 1 },
          frequency: 110,
        })
        .setDepth(Depth.sparkles);
    }
  }

  /** Called while the child overlaps the arch. */
  enter(): void {
    if (this.done || !useGameStore.getState().session) return;
    if (selectIsLetterComplete(useGameStore.getState())) {
      this.done = true;
      playSound('win');
      this.scene.time.delayedCall(300, () => sayWellDone());
      const confetti = this.scene.add
        .particles(this.arch.x, this.arch.y - RAINBOW_SIZE.height, ArtKeys.sparkle, {
          lifespan: 1400,
          speed: { min: 200, max: 420 },
          angle: { min: 200, max: 340 },
          gravityY: 500,
          scale: { start: 0.8 / this.resolution, end: 0.2 / this.resolution },
          tint: [0xff6b6b, 0xffd23f, 0x5fe08a, 0x5ec8ff, 0xb07cff, 0xff6fae],
          emitting: false,
        })
        .setDepth(Depth.sparkles);
      confetti.explode(60);
      // Let the confetti fly for a moment before the celebration screen.
      this.scene.time.delayedCall(450, () => useGameStore.getState().completeLevel());
      return;
    }
    const now = this.scene.time.now;
    if (now - this.lastHint < 1500) return;
    this.lastHint = now;
    playSound('tap');
    this.scene.tweens.add({ targets: this.arch, angle: { from: -4, to: 4 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => this.arch.setAngle(0) });
    this.scene.tweens.add({ targets: this.hint, alpha: { from: 0, to: 1 }, y: this.hint.y - 16, duration: 400, yoyo: true, hold: 900, ease: 'Sine.easeOut' });
  }
}
