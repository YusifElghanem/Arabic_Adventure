import Phaser from 'phaser';
import { playSound } from '@/utils/sound';
import { ArtKeys } from '../art';
import { THIEF_SIZE, ThiefKeys } from '../art/thief';
import { DISPLAY_FONT } from '../constants';
import type { GuardMechanics, ThiefKind } from '../levels';
import type { LetterSpec } from '../letters';
import { Depth } from '../world/depths';
import type GuardedLetter from './GuardedLetter';

type State = 'enter' | 'roam' | 'caught';

const ENTER_SPEED = 170;
/** Loop speed (rad/s): about 150 px/s across the arena, slower than the child runs. */
const ROAM_RATE = 0.24;
/** Generous: touching anywhere near counts. */
const CATCH_RADIUS = 85;
/** After a helmet or crown hit, the thief can't be touched again for a moment. */
const HIT_GRACE = 0.8;

/** How each kind looks and behaves (see ThiefKind in levels.ts). */
const KIND: Record<ThiefKind, { hits: number; scale: number; tint: number; speed: number }> = {
  looper: { hits: 1, scale: 1, tint: 0xffffff, speed: 1 },
  dasher: { hits: 1, scale: 0.9, tint: 0xffc7a8, speed: 1.15 },
  armored: { hits: 2, scale: 1.05, tint: 0xffffff, speed: 0.95 },
  blinker: { hits: 1, scale: 0.95, tint: 0xa8e8ff, speed: 1 },
  splitter: { hits: 1, scale: 1.1, tint: 0xc4ffb4, speed: 0.9 },
  king: { hits: 3, scale: 1.55, tint: 0xffe08a, speed: 0.85 },
};

export interface ThiefOptions {
  kind?: ThiefKind;
  /** Arena speed multiplier (challenge mode). */
  speed?: number;
  /** Seconds between candy throws while carrying a letter (0 = never). */
  throwEvery?: number;
  /** Little thieves from a splitter are smaller and quicker. */
  small?: boolean;
  /** Called when the thief tosses a candy from (x, y). */
  onThrow?: (x: number, y: number) => void;
  /** Called when a splitter is caught: spawn its two little ones here. */
  onSplit?: (x: number, y: number) => void;
}

/**
 * A letter thief. It flies in from the edge to the big letter, grabs a copy
 * of it with a giggle, then loops over the arena carrying it. Touch it (or
 * hit it with a bubble) and it giggles, gives the letter back, takes off its
 * mask and flies away as a friend. A thief never leaves with the letter.
 *
 * Challenge kinds add tricks: dashers dart away from the child, armored and
 * king thieves need extra touches, blinkers pop to a new spot, splitters
 * burst into two little thieves, and carriers may toss candy at the child.
 */
export default class Thief {
  private readonly scene: Phaser.Scene;
  private readonly letter: GuardedLetter;
  private readonly roam: GuardMechanics['roam'];
  private readonly image: Phaser.GameObjects.Image;
  private readonly carried: Phaser.GameObjects.Text;
  private readonly onBefriend: () => void;
  private readonly phase: number;
  private readonly kind: ThiefKind;
  private readonly opts: ThiefOptions;
  private readonly baseScale: number;
  private readonly resolution: number;
  private readonly speed: number;
  private hat: Phaser.GameObjects.Image | null = null;
  private hits: number;
  private state: State = 'enter';
  private t = 0;
  private x: number;
  private y: number;
  private graceUntil = 0;
  private dashUntil = 0;
  private dashReadyAt = 0;
  private dashVx = 0;
  private dashVy = 0;
  private nextBlinkAt = 2.4;
  private nextThrowAt = 0;

  constructor(
    scene: Phaser.Scene,
    spec: LetterSpec,
    entry: { x: number; y: number },
    letter: GuardedLetter,
    roam: GuardMechanics['roam'],
    resolution: number,
    phase: number,
    onBefriend: () => void,
    opts: ThiefOptions = {},
  ) {
    this.scene = scene;
    this.letter = letter;
    this.roam = roam;
    this.phase = phase;
    this.onBefriend = onBefriend;
    this.opts = opts;
    this.kind = opts.kind ?? 'looper';
    this.resolution = resolution;
    const k = KIND[this.kind];
    this.hits = k.hits;
    this.speed = (opts.speed ?? 1) * k.speed * (opts.small ? 1.25 : 1);
    this.baseScale = (k.scale * (opts.small ? 0.65 : 1)) / resolution;
    this.nextThrowAt = (opts.throwEvery ?? 0) * (0.6 + Math.random() * 0.6);
    this.x = entry.x;
    this.y = entry.y;
    this.image = scene.add.image(entry.x, entry.y, ThiefKeys.sneaky).setScale(this.baseScale).setDepth(Depth.butterflies + 1).setTint(k.tint);
    if (this.kind === 'armored') this.hat = scene.add.image(entry.x, entry.y, ThiefKeys.helmet).setScale(this.baseScale).setDepth(Depth.butterflies + 2);
    if (this.kind === 'king') this.hat = scene.add.image(entry.x, entry.y, ThiefKeys.crown).setScale(this.baseScale).setDepth(Depth.butterflies + 2);
    this.carried = scene.add
      .text(entry.x, entry.y, spec.letter, {
        fontFamily: DISPLAY_FONT,
        fontStyle: '800',
        fontSize: '64px',
        color: spec.color,
        stroke: '#ffffff',
        strokeThickness: 8,
        padding: { x: 8, y: 8 },
        resolution: Math.max(1, resolution),
        rtl: true,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(Depth.butterflies + 2)
      .setVisible(false);
  }

  get active(): boolean {
    return this.state !== 'caught';
  }

  get position(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  private get size(): number {
    return this.baseScale * this.resolution;
  }

  update(dt: number, player: { x: number; y: number }): void {
    if (this.state === 'caught') return;
    this.t += dt;
    const prevX = this.x;
    const toPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    if (this.state === 'enter') {
      const target = this.letter.grabPoint;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 24) {
        this.grab();
      } else {
        const step = Math.min(dist, ENTER_SPEED * this.speed * dt);
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step + Math.sin(this.t * 6) * 0.8;
      }
    } else if (this.t < this.dashUntil) {
      this.x += this.dashVx * dt;
      this.y += this.dashVy * dt;
    } else {
      const { cx, halfWidth, y, bob } = this.roam;
      const a = ROAM_RATE * this.speed * this.t + this.phase;
      const tx = cx + halfWidth * Math.sin(a);
      const ty = y + bob * Math.sin(2 * a);
      const k = 1 - Math.exp(-2.5 * dt);
      this.x += (tx - this.x) * k;
      this.y += (ty - this.y) * k;
      this.tricks(dt, player, toPlayer);
    }
    const bobY = Math.sin(this.t * 7) * 4;
    this.image.setPosition(this.x, this.y + bobY);
    if (Math.abs(this.x - prevX) > 0.3) this.image.setFlipX(this.x < prevX);
    this.hat?.setPosition(this.x, this.y + bobY - THIEF_SIZE.height * this.size * (this.kind === 'king' ? 0.42 : 0.3)).setFlipX(this.image.flipX);
    this.carried.setPosition(this.x, this.y + 52 * this.size);
    if (toPlayer < CATCH_RADIUS * Math.max(1, this.size * 0.85)) this.touch();
  }

  private tricks(dt: number, player: { x: number; y: number }, toPlayer: number): void {
    if (this.kind === 'dasher' && toPlayer < 240 && this.t >= this.dashReadyAt) {
      // Dart away from the child (and a little upwards).
      const dx = this.x - player.x || 1;
      const dy = this.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      this.dashVx = (dx / d) * 460;
      this.dashVy = Math.min(0, (dy / d) * 460) - 60;
      this.dashUntil = this.t + 0.5;
      this.dashReadyAt = this.t + 2.2;
      playSound('whoosh');
    }
    if (this.kind === 'blinker' && this.t >= this.nextBlinkAt) {
      this.nextBlinkAt = this.t + 2.4;
      this.poof();
      // Skip ahead along the loop: the thief reappears somewhere else.
      this.t += (Math.PI * (0.5 + Math.random() * 0.5)) / (ROAM_RATE * this.speed);
      const a = ROAM_RATE * this.speed * this.t + this.phase;
      this.x = this.roam.cx + this.roam.halfWidth * Math.sin(a);
      this.y = this.roam.y + this.roam.bob * Math.sin(2 * a);
      this.poof();
    }
    const every = this.opts.throwEvery ?? 0;
    if (every > 0 && this.t >= this.nextThrowAt) {
      this.nextThrowAt = this.t + every * (this.kind === 'king' ? 0.55 : 1) * (0.8 + Math.random() * 0.4);
      if (Math.abs(player.x - this.x) < 900) this.opts.onThrow?.(this.x, this.y + 20);
    }
    void dt;
  }

  /** For bubbles: returns true when (x, y) is close enough to count as a touch. */
  tryCatch(x: number, y: number, radius: number): boolean {
    if (this.state === 'caught' || Math.hypot(x - this.x, y - this.y) > radius + THIEF_SIZE.width * 0.35 * this.size) return false;
    return this.touch();
  }

  /** A touch: knocks off a helmet/crown point, or befriends the thief. */
  private touch(): boolean {
    if (this.t < this.graceUntil) return false;
    if (this.hits > 1) {
      this.hits--;
      this.graceUntil = this.t + HIT_GRACE;
      playSound('bump');
      this.scene.tweens.add({ targets: this.image, scale: this.baseScale * 1.25, duration: 120, yoyo: true });
      this.image.setTintFill(0xffffff);
      this.scene.time.delayedCall(120, () => this.image.setTint(KIND[this.kind].tint));
      if (this.kind === 'armored' && this.hat) {
        // The helmet flies off, spinning.
        const hat = this.hat;
        this.hat = null;
        this.scene.tweens.add({ targets: hat, y: hat.y - 160, x: hat.x + 120, angle: 540, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => hat.destroy() });
      }
      // Bounce away a little so the child has to come back for it.
      this.dashVx = (Math.random() < 0.5 ? -1 : 1) * 380;
      this.dashVy = -200;
      this.dashUntil = this.t + 0.45;
      return true;
    }
    this.catch();
    return true;
  }

  private grab(): void {
    this.state = 'roam';
    // Start the loop where the thief is, so it doesn't jump.
    const rate = ROAM_RATE * this.speed;
    this.t = Math.asin(Phaser.Math.Clamp((this.x - this.roam.cx) / this.roam.halfWidth, -1, 1)) / rate - this.phase / rate;
    this.dashReadyAt = this.t + 1;
    this.nextBlinkAt = this.t + 2.4;
    this.nextThrowAt = this.t + (this.opts.throwEvery ?? 0) * 0.7;
    this.graceUntil = this.t;
    this.letter.steal();
    this.carried.setVisible(true).setScale(0.3);
    this.scene.tweens.add({ targets: this.carried, scale: this.opts.small ? 0.7 : 1, duration: 300, ease: 'Back.easeOut' });
    playSound('giggle');
  }

  private poof(): void {
    const burst = this.scene.add
      .particles(this.x, this.y, ArtKeys.sparkle, {
        lifespan: 450,
        speed: { min: 60, max: 160 },
        scale: { start: 0.5 / this.resolution, end: 0 },
        tint: [0xa8e8ff, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(Depth.sparkles);
    burst.explode(12);
    this.scene.time.delayedCall(500, () => burst.destroy());
  }

  private catch(): void {
    const wasCarrying = this.state === 'roam';
    this.state = 'caught';
    playSound('giggle');
    if (wasCarrying) {
      // The letter flies home.
      const home = this.letter.grabPoint;
      this.scene.tweens.add({
        targets: this.carried,
        x: home.x,
        y: home.y,
        scale: 1.6,
        alpha: 0,
        duration: 650,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          this.letter.restore();
          playSound('pop');
          this.carried.destroy();
        },
      });
    } else this.carried.destroy();
    if (this.hat) {
      const hat = this.hat;
      this.hat = null;
      this.scene.tweens.add({ targets: hat, y: hat.y - 120, alpha: 0, duration: 500, onComplete: () => hat.destroy() });
    }
    if (this.kind === 'splitter') {
      // Pop! Two little thieves burst out (they count as thieves of their own).
      this.poof();
      this.image.destroy();
      this.opts.onSplit?.(this.x, this.y);
      this.onBefriend();
      return;
    }
    this.image.setTexture(ThiefKeys.friend).clearTint();
    this.scene.tweens.add({ targets: this.image, scale: this.baseScale * 1.25, duration: 160, yoyo: true });
    // Wave goodbye and fly off happily.
    this.scene.tweens.add({ targets: this.image, angle: { from: -12, to: 12 }, duration: 160, yoyo: true, repeat: 3 });
    this.scene.tweens.add({
      targets: this.image,
      y: this.y - 420,
      alpha: 0,
      delay: 700,
      duration: 1100,
      ease: 'Sine.easeIn',
      onComplete: () => this.image.destroy(),
    });
    this.onBefriend();
  }
}

