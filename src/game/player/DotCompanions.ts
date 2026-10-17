import Phaser from 'phaser';
import { playSound } from '@/utils/sound';
import { MechanicKeys } from '../art/mechanics';
import { Depth } from '../world/depths';

/**
 * The dots the child is carrying. Each Mystery Block's dot flies to the
 * child and then orbits their head, so the child can see what they're
 * bringing to the letter. At the letter, the dots fly into its empty slots.
 */

interface Companion {
  image: Phaser.GameObjects.Image;
  phase: number;
}

const ORBIT_RADIUS = 46;
const ORBIT_SPEED = 2.2;
/** Height of the orbit centre above the feet. */
const HEAD_HEIGHT = 150;

export default class DotCompanions {
  private readonly scene: Phaser.Scene;
  private readonly resolution: number;
  private companions: Companion[] = [];
  private elapsed = 0;
  private releasing = false;

  constructor(scene: Phaser.Scene, resolution: number) {
    this.scene = scene;
    this.resolution = resolution;
  }

  get count(): number {
    return this.releasing ? 0 : this.companions.length;
  }

  /** A new dot joins, appearing at `from` (where the block's dot landed). */
  add(from: { x: number; y: number }): void {
    const image = this.scene.add
      .image(from.x, from.y, MechanicKeys.glow)
      .setScale(0.5 / this.resolution)
      .setDepth(Depth.sparkles);
    this.companions.push({ image, phase: 0 });
    this.companions.forEach((c, i) => (c.phase = (i / this.companions.length) * Math.PI * 2));
    playSound('pop');
  }

  update(deltaMs: number, feet: { x: number; y: number }): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    this.elapsed += dt;
    if (this.releasing) return;
    const follow = 1 - Math.exp(-10 * dt);
    for (const c of this.companions) {
      const a = this.elapsed * ORBIT_SPEED + c.phase;
      const tx = feet.x + Math.cos(a) * ORBIT_RADIUS;
      const ty = feet.y - HEAD_HEIGHT + Math.sin(a) * ORBIT_RADIUS * 0.45 + Math.sin(this.elapsed * 5 + c.phase) * 4;
      c.image.setPosition(c.image.x + (tx - c.image.x) * follow, c.image.y + (ty - c.image.y) * follow);
    }
  }

  /**
   * Sends the carried dots, one after another, to `targets` (in order).
   * `onEach(i)` fires as dot i lands.
   */
  releaseTo(targets: readonly { x: number; y: number }[], onEach: (index: number) => void): void {
    if (this.releasing || !this.companions.length || !targets.length) return;
    this.releasing = true;
    const flying = this.companions.splice(0, targets.length);
    let landed = 0;
    flying.forEach((c, i) => {
      const start = new Phaser.Math.Vector2(c.image.x, c.image.y);
      const end = new Phaser.Math.Vector2(targets[i].x, targets[i].y);
      const control = new Phaser.Math.Vector2((start.x + end.x) / 2, Math.min(start.y, end.y) - 140);
      const curve = new Phaser.Curves.QuadraticBezier(start, control, end);
      const point = new Phaser.Math.Vector2();
      const progress = { t: 0 };
      this.scene.tweens.add({
        targets: progress,
        t: 1,
        duration: 650,
        delay: i * 200,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          curve.getPoint(progress.t, point);
          c.image.setPosition(point.x, point.y);
        },
        onComplete: () => {
          c.image.destroy();
          onEach(i);
          landed++;
          if (landed === flying.length) this.releasing = false;
        },
      });
    });
  }
}
