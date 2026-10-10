import Phaser from 'phaser';
import type { Outfit } from '@/stores/useGameStore';
import { BUBBLE_SIZE, CharacterKeys, FACE_SIZE, buildRig, type PartName, type RigPart } from '../art/character';
import { Depth } from '../world/depths';

/**
 * The visible character: cut-out parts in a Container, animated every frame
 * from a few motion readings. Idle breathing and blinking, a running cycle
 * (arms and legs swing), arms up when jumping, and a squash on landing.
 *
 * The character always faces the viewer, so the child sees their own face.
 * Direction shows as a lean and a slight turn of the head, never by
 * mirroring, which would show the photo backwards.
 */

export interface PuppetMotion {
  /** Horizontal speed as a share of max speed (0..1). */
  speed: number;
  /** Vertical velocity (px/s, positive = falling). */
  vy: number;
  grounded: boolean;
  /** -1 left, 1 right, 0 idle. */
  facing: number;
  respawning: boolean;
}

/** Texture key the child's photo is loaded under. */
export const PHOTO_FACE_KEY = 'player-face-photo';

export default class PlayerPuppet {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly resolution: number;
  private parts = new Map<PartName, Phaser.GameObjects.Image>();
  private rig: RigPart[] = [];
  private bubble!: Phaser.GameObjects.Image;
  private photo = false;
  private phase = 0;
  private squash = 0;
  private air = 0;
  private lean = 0;
  private turn = 0;
  private wasGrounded = true;
  private elapsed = 0;
  private nextBlinkAt = 2;
  private blinkUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, outfit: Outfit, resolution: number) {
    this.scene = scene;
    this.resolution = resolution;
    this.container = scene.add.container(x, y).setDepth(Depth.player);
    this.setOutfit(outfit);
  }

  /** Rebuilds the parts for an outfit (keeps the current face). */
  setOutfit(outfit: Outfit): void {
    this.container.removeAll(true);
    this.parts.clear();
    this.rig = buildRig(outfit);
    for (const part of this.rig) {
      const image = this.scene.add
        .image(part.x, part.y, part.key ?? CharacterKeys.faceDefault)
        .setOrigin(part.originX, part.originY)
        .setFlipX(part.flipX ?? false);
      this.parts.set(part.name, image);
      this.container.add(image);
    }
    this.bubble = this.scene.add.image(0, -70, CharacterKeys.bubble).setScale(1 / this.resolution).setAlpha(0).setVisible(false);
    this.container.add(this.bubble);
    this.applyFace();
    this.applyBaseScales();
  }

  /** Switch between the child's photo (if loaded) and the drawn face. */
  setPhotoFace(enabled: boolean): void {
    this.photo = enabled && this.scene.textures.exists(PHOTO_FACE_KEY);
    this.applyFace();
  }

  private applyFace(): void {
    const face = this.parts.get('face');
    if (!face) return;
    if (this.photo) {
      // The crop is a square image with the face oval filling its height.
      face.setTexture(PHOTO_FACE_KEY).setDisplaySize(FACE_SIZE.height, FACE_SIZE.height);
    } else {
      face.setTexture(CharacterKeys.faceDefault).setScale(1 / this.resolution);
    }
  }

  private applyBaseScales(): void {
    for (const [name, image] of this.parts) {
      if (name === 'face') continue;
      image.setScale(1 / this.resolution);
    }
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  update(deltaMs: number, m: PuppetMotion): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    this.elapsed += dt;
    const damp = (from: number, to: number, rate: number) => from + (to - from) * (1 - Math.exp(-rate * dt));

    // Landing squash, scaled by how hard we landed.
    if (m.grounded && !this.wasGrounded && !m.respawning) this.squash = Math.min(1, 0.35 + Math.abs(m.vy) / 1600);
    this.wasGrounded = m.grounded;
    this.squash = damp(this.squash, 0, 10);
    this.air = damp(this.air, m.grounded || m.respawning ? 0 : 1, 14);
    if (m.grounded) this.phase += dt * (7 + 11 * m.speed);

    const swing = Math.sin(this.phase) * m.speed * (1 - this.air);
    const bob = Math.abs(Math.sin(this.phase)) * 4 * m.speed * (1 - this.air);
    const breathe = Math.sin(this.elapsed * 2.6) * 0.018 * (1 - m.speed);
    const stretch = this.air * Phaser.Math.Clamp(-m.vy / 9000, -0.06, 0.09);

    this.lean = damp(this.lean, m.facing * m.speed * 0.09, 10);
    this.turn = damp(this.turn, m.facing * 3.5, 8);
    this.container.setRotation(this.lean);
    this.container.setScale(1 + this.squash * 0.14 - stretch * 0.5, 1 - this.squash * 0.18 + breathe + stretch);

    const get = (name: PartName) => this.parts.get(name);
    const base = (name: PartName) => this.rig.find((p) => p.name === name)!;
    const place = (name: PartName, dx: number, dy: number, rotation = 0) => {
      const image = get(name);
      if (!image) return;
      const part = base(name);
      image.setPosition(part.x + dx, part.y + dy).setRotation(rotation);
    };

    // Legs swing from the hip; tuck up in the air.
    place('legFront', 0, 0, swing * 0.65 - this.air * 0.35);
    place('legBack', 0, 0, -swing * 0.65 + this.air * 0.45);
    // Arms swing opposite to the legs; shoot up for a jump ("yay!").
    const raise = this.air * 2.3 + (m.respawning ? 2.3 : 0);
    place('armFront', 0, -bob, -swing * 0.8 - raise);
    place('armBack', 0, -bob, swing * 0.8 + raise);
    place('body', 0, -bob);
    place('backpack', -this.turn * 0.5, -bob);
    const headTilt = Math.sin(this.phase) * 0.05 * m.speed + this.turn * 0.008;
    for (const name of ['head', 'face', 'hair', 'headwear'] as const) {
      // The face shifts a touch further than the head: it reads as turning.
      const shift = name === 'face' ? this.turn * 1.2 : this.turn;
      place(name, shift, -bob * 1.3, headTilt);
    }

    // Blink the drawn face now and then.
    if (!this.photo) {
      if (this.elapsed >= this.nextBlinkAt) {
        this.blinkUntil = this.elapsed + 0.14;
        this.nextBlinkAt = this.elapsed + 2.5 + Math.random() * 2.5;
      }
      const key = this.elapsed < this.blinkUntil ? CharacterKeys.faceBlink : CharacterKeys.faceDefault;
      const face = get('face');
      if (face && face.texture.key !== key) face.setTexture(key);
    }

    // Respawn bubble.
    const targetAlpha = m.respawning ? 1 : 0;
    this.bubble.setAlpha(damp(this.bubble.alpha, targetAlpha, 9));
    this.bubble.setVisible(this.bubble.alpha > 0.01);
    const wobble = 1 + Math.sin(this.elapsed * 6) * 0.03;
    this.bubble.setScale((wobble * (BUBBLE_SIZE.width - 20)) / BUBBLE_SIZE.width / this.resolution, ((2 - wobble) * (BUBBLE_SIZE.width - 20)) / BUBBLE_SIZE.width / this.resolution);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
