import Phaser from 'phaser';
import { ArtKeys } from '../art';
import { PLATFORM_CAP_WIDTH, PLATFORM_MID_WIDTH, PLATFORM_SOLID_DEPTH, PLATFORM_SURFACE_Y } from '../art/platforms';
import type { PlatformSpec } from '../levels';
import { Depth } from './depths';

/** Total width of a platform in world pixels. */
export const platformWidth = (middles: number): number => PLATFORM_CAP_WIDTH * 2 + PLATFORM_MID_WIDTH * middles;

/**
 * A candy floating platform: tile images for the art, plus one static
 * Arcade Physics body covering the solid part, with its top exactly at the
 * walking surface.
 *
 * With `spec.move` it swings back and forth: the body is then a dynamic,
 * immovable, gravity-free body steered by velocity (so Arcade carries a
 * child standing on it), and the tiles follow the body.
 */
export default class Platform {
  readonly spec: PlatformSpec;
  readonly width: number;
  readonly body: Phaser.GameObjects.Zone;
  readonly images: Phaser.GameObjects.Image[] = [];
  private readonly baseX: number;
  private readonly baseY: number;
  private elapsed = 0;

  constructor(scene: Phaser.Scene, spec: PlatformSpec, resolution: number) {
    this.spec = spec;
    this.width = platformWidth(spec.middles);
    const top = spec.y - PLATFORM_SURFACE_Y;
    const scale = 1 / resolution;

    let x = spec.x;
    const place = (key: string, width: number) => {
      this.images.push(scene.add.image(x, top, key).setOrigin(0, 0).setScale(scale).setDepth(Depth.platforms));
      x += width;
    };
    place(ArtKeys.platformLeft, PLATFORM_CAP_WIDTH);
    for (let i = 0; i < spec.middles; i++) {
      // Alternate the two middle tiles, offset by platform position for variety.
      const variant = (i + Math.floor(spec.x / PLATFORM_MID_WIDTH)) % 2 === 0;
      place(variant ? ArtKeys.platformMidA : ArtKeys.platformMidB, PLATFORM_MID_WIDTH);
    }
    place(ArtKeys.platformRight, PLATFORM_CAP_WIDTH);

    // The rounded caps start a few pixels in from the tile edge; inset the body to match.
    const inset = 10;
    this.body = scene.add.zone(spec.x + inset, spec.y, this.width - inset * 2, PLATFORM_SOLID_DEPTH).setOrigin(0, 0);
    this.baseX = spec.x + inset;
    this.baseY = spec.y;
    if (spec.move) {
      scene.physics.add.existing(this.body, false);
      const body = this.body.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false).setImmovable(true);
      this.elapsed = (spec.move.phase ?? 0) * spec.move.period;
    } else {
      scene.physics.add.existing(this.body, true);
    }
  }

  get moving(): boolean {
    return !!this.spec.move;
  }

  /** Moving platforms: steer the body towards its swing position; the tiles follow. */
  update(delta: number): void {
    const move = this.spec.move;
    if (!move) return;
    const dt = Math.min(delta, 50) / 1000;
    this.elapsed += dt;
    const a = Math.sin((this.elapsed / move.period) * Math.PI * 2);
    const tx = this.baseX + move.dx * a;
    const ty = this.baseY + move.dy * a;
    const body = this.body.body as Phaser.Physics.Arcade.Body;
    if (dt > 0) body.setVelocity((tx - body.x) / dt, (ty - body.y) / dt);
    const ox = body.x - this.baseX;
    const oy = body.y - this.baseY;
    let x = this.spec.x + ox;
    const top = this.spec.y - PLATFORM_SURFACE_Y + oy;
    this.images.forEach((img, i) => {
      img.setPosition(x, top);
      x += i === 0 || i === this.images.length - 1 ? PLATFORM_CAP_WIDTH : PLATFORM_MID_WIDTH;
    });
  }

  /** World x range that is safe to stand on or decorate (away from the rounded ends). */
  get walkable(): { left: number; right: number } {
    return { left: this.spec.x + 30, right: this.spec.x + this.width - 30 };
  }
}
