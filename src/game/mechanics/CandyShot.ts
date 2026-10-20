import Phaser from 'phaser';
import { ThiefKeys } from '../art/thief';
import { Depth } from '../world/depths';

const LIFETIME = 4;

/**
 * Challenge mode: a wrapped candy a thief tosses towards where the child was.
 * It flies in a straight, slow line (easy to see coming and jump over), and
 * bubbles pop it.
 */
export default class CandyShot {
  private readonly scene: Phaser.Scene;
  private readonly image: Phaser.GameObjects.Image;
  private readonly vx: number;
  private readonly vy: number;
  private age = 0;
  private done = false;

  constructor(scene: Phaser.Scene, from: { x: number; y: number }, to: { x: number; y: number }, speed: number, resolution: number) {
    this.scene = scene;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    this.vx = (dx / d) * speed;
    this.vy = (dy / d) * speed;
    this.image = scene.add.image(from.x, from.y, ThiefKeys.candy).setScale(0.3 / resolution).setDepth(Depth.sparkles);
    scene.tweens.add({ targets: this.image, scale: 1 / resolution, duration: 220, ease: 'Back.easeOut' });
  }

  get alive(): boolean {
    return !this.done;
  }

  get position(): { x: number; y: number } {
    return { x: this.image.x, y: this.image.y };
  }

  update(dt: number): void {
    if (this.done) return;
    this.age += dt;
    this.image.x += this.vx * dt;
    this.image.y += this.vy * dt;
    this.image.angle += 360 * dt;
    if (this.age > LIFETIME) this.pop();
  }

  pop(): void {
    if (this.done) return;
    this.done = true;
    this.scene.tweens.killTweensOf(this.image);
    this.scene.tweens.add({ targets: this.image, scale: this.image.scale * 1.5, alpha: 0, duration: 160, onComplete: () => this.image.destroy() });
  }
}
