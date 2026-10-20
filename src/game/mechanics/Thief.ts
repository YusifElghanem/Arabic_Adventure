import Phaser from 'phaser';
import { playSound } from '@/utils/sound';
import { THIEF_SIZE, ThiefKeys } from '../art/thief';
import { DISPLAY_FONT } from '../constants';
import type { GuardMechanics } from '../levels';
import type { LetterSpec } from '../letters';
import { Depth } from '../world/depths';
import type GuardedLetter from './GuardedLetter';

type State = 'enter' | 'roam' | 'caught';

const ENTER_SPEED = 170;
/** Loop speed (rad/s): about 150 px/s across the arena, slower than the child runs. */
const ROAM_RATE = 0.24;
/** Generous: touching anywhere near counts. */
const CATCH_RADIUS = 85;

/**
 * A letter thief. It flies in from the edge to the big letter, grabs a copy
 * of it with a giggle, then loops low over the arena carrying it. Touch it
 * (or hit it with a bubble) and it giggles, gives the letter back, takes off
 * its mask and flies away as a friend. There is no way to lose: a thief
 * never leaves with the letter.
 */
export default class Thief {
  private readonly scene: Phaser.Scene;
  private readonly letter: GuardedLetter;
  private readonly roam: GuardMechanics['roam'];
  private readonly image: Phaser.GameObjects.Image;
  private readonly carried: Phaser.GameObjects.Text;
  private readonly onBefriend: () => void;
  private readonly phase: number;
  private state: State = 'enter';
  private t = 0;
  private x: number;
  private y: number;

  constructor(
    scene: Phaser.Scene,
    spec: LetterSpec,
    entry: { x: number; y: number },
    letter: GuardedLetter,
    roam: GuardMechanics['roam'],
    resolution: number,
    phase: number,
    onBefriend: () => void,
  ) {
    this.scene = scene;
    this.letter = letter;
    this.roam = roam;
    this.phase = phase;
    this.onBefriend = onBefriend;
    this.x = entry.x;
    this.y = entry.y;
    this.image = scene.add.image(entry.x, entry.y, ThiefKeys.sneaky).setScale(1 / resolution).setDepth(Depth.butterflies + 1);
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

  update(dt: number, player: { x: number; y: number }): void {
    if (this.state === 'caught') return;
    this.t += dt;
    const prevX = this.x;
    if (this.state === 'enter') {
      const target = this.letter.grabPoint;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 24) {
        this.grab();
      } else {
        const step = Math.min(dist, ENTER_SPEED * dt);
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step + Math.sin(this.t * 6) * 0.8;
      }
    } else {
      const { cx, halfWidth, y, bob } = this.roam;
      const a = ROAM_RATE * this.t + this.phase;
      const tx = cx + halfWidth * Math.sin(a);
      const ty = y + bob * Math.sin(2 * a);
      const k = 1 - Math.exp(-2.5 * dt);
      this.x += (tx - this.x) * k;
      this.y += (ty - this.y) * k;
    }
    this.image.setPosition(this.x, this.y + Math.sin(this.t * 7) * 4);
    if (Math.abs(this.x - prevX) > 0.3) this.image.setFlipX(this.x < prevX);
    this.carried.setPosition(this.x, this.y + 52);
    if (Math.hypot(player.x - this.x, player.y - this.y) < CATCH_RADIUS) this.catch();
  }

  /** For bubbles: returns true (and befriends the thief) when (x, y) is close enough. */
  tryCatch(x: number, y: number, radius: number): boolean {
    if (this.state === 'caught' || Math.hypot(x - this.x, y - this.y) > radius + THIEF_SIZE.width * 0.35) return false;
    this.catch();
    return true;
  }

  private grab(): void {
    this.state = 'roam';
    // Start the loop where the thief is, so it doesn't jump.
    this.t = Math.asin(Phaser.Math.Clamp((this.x - this.roam.cx) / this.roam.halfWidth, -1, 1)) / ROAM_RATE - this.phase / ROAM_RATE;
    this.letter.steal();
    this.carried.setVisible(true).setScale(0.3);
    this.scene.tweens.add({ targets: this.carried, scale: 1, duration: 300, ease: 'Back.easeOut' });
    playSound('giggle');
  }

  private catch(): void {
    const wasCarrying = this.state === 'roam';
    this.state = 'caught';
    playSound('giggle');
    this.image.setTexture(ThiefKeys.friend);
    this.scene.tweens.add({ targets: this.image, scale: this.image.scale * 1.25, duration: 160, yoyo: true });
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
