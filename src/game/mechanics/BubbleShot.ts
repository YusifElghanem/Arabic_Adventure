import Phaser from 'phaser';
import { CharacterKeys } from '../art/character';
import { Depth } from '../world/depths';

const SPEED = 560;
const LIFETIME = 1.8;

/**
 * A bubble from the bubble wand. It glides towards the nearest thief (small
 * children can't aim), or floats up and pops if there is none.
 */
export default class BubbleShot {
  private readonly scene: Phaser.Scene;
  private readonly image: Phaser.GameObjects.Image;
  private readonly target: () => { x: number; y: number } | null;
  private vx: number;
  private vy = -90;
  private age = 0;
  private done = false;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: number, resolution: number, target: () => { x: number; y: number } | null) {
    this.scene = scene;
    this.target = target;
    this.vx = dir * 380;
    this.image = scene.add.image(x, y, CharacterKeys.bubble).setScale(0.42 / resolution).setAlpha(0.9).setDepth(Depth.sparkles);
    scene.tweens.add({ targets: this.image, scaleX: this.image.scaleX * 1.08, duration: 180, yoyo: true, repeat: -1 });
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
    const t = this.target();
    if (t) {
      const dx = t.x - this.image.x;
      const dy = t.y - this.image.y;
      const d = Math.hypot(dx, dy) || 1;
      const k = 1 - Math.exp(-5 * dt);
      this.vx += ((dx / d) * SPEED - this.vx) * k;
      this.vy += ((dy / d) * SPEED - this.vy) * k;
    }
    this.image.x += this.vx * dt;
    this.image.y += this.vy * dt;
    if (this.age > LIFETIME) this.pop();
  }

  pop(): void {
    if (this.done) return;
    this.done = true;
    this.scene.tweens.killTweensOf(this.image);
    this.scene.tweens.add({ targets: this.image, scale: this.image.scale * 1.6, alpha: 0, duration: 180, onComplete: () => this.image.destroy() });
  }
}
