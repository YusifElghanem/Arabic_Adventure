import Phaser from 'phaser';
import { useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import { COIN_SIZE, MechanicKeys } from '../art/mechanics';
import { Depth } from '../world/depths';

/**
 * A spinning gold coin. Touching it adds one coin to the child's purse
 * (kept forever, spent in the shop). Optionally pulled in by the magnet tool.
 */
export default class Coin {
  readonly zone: Phaser.GameObjects.Zone;
  private readonly scene: Phaser.Scene;
  private readonly image: Phaser.GameObjects.Image;
  private collected = false;

  constructor(scene: Phaser.Scene, x: number, y: number, resolution: number) {
    this.scene = scene;
    const s = 1 / resolution;
    this.image = scene.add.image(x, y, MechanicKeys.coin).setScale(s).setDepth(Depth.butterflies);
    // A flat "spin": squash the width back and forth.
    scene.tweens.add({ targets: this.image, scaleX: { from: s, to: s * 0.2 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: (x % 5) * 110 });
    this.zone = scene.add.zone(x, y, COIN_SIZE.width, COIN_SIZE.height);
    scene.physics.add.existing(this.zone, true);
  }

  get isCollected(): boolean {
    return this.collected;
  }

  get position(): { x: number; y: number } {
    return { x: this.image.x, y: this.image.y };
  }

  /** Magnet: glide towards a point (the child). Collected on arrival by the overlap. */
  pullTowards(x: number, y: number, dt: number): void {
    if (this.collected) return;
    const k = 1 - Math.exp(-6 * dt);
    this.image.x += (x - this.image.x) * k;
    this.image.y += (y - this.image.y) * k;
    const body = this.zone.body as Phaser.Physics.Arcade.StaticBody;
    this.zone.setPosition(this.image.x, this.image.y);
    body.updateFromGameObject();
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;
    (this.zone.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    useGameStore.getState().collectCoin();
    playSound('coin');
    this.scene.tweens.killTweensOf(this.image);
    this.scene.tweens.add({
      targets: this.image,
      y: this.image.y - 60,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => this.image.destroy(),
    });
  }
}
