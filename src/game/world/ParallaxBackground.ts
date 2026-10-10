import Phaser from 'phaser';
import { ArtKeys, type ArtKey } from '../art';
import { CLOUD_SEA_SIZE } from '../art/clouds';
import { HILL_TILE, STRIP_BOTTOM_PADDING } from '../art/hills';
import { PALETTE } from '../art/palette';
import { SUN_FACE_SIZE } from '../art/sun';
import { createRandom, range } from '../art/svg';
import { Depth } from './depths';
import { fixedView, layerLeft, wrap, type FixedView } from './view';

/**
 * The layered, parallax sky world behind (and just in front of) the level:
 *
 *   sky gradient ── fixed to the screen
 *   smiling sun ─── almost fixed; rays turn slowly, the face blinks
 *   far clouds ──── factor 0.08, drifting
 *   far hills ───── factor 0.18
 *   mid hills ───── factor 0.35
 *   near hills ──── factor 0.55
 *   near clouds ─── factor 0.7, drifting
 *   cloud sea ───── factor 1 at the bottom of the world, in front of everything
 *
 * Every layer is a screen-sized object positioned by hand each frame from
 * the camera. Hills and the cloud sea are TileSprites whose texture offset
 * scrolls, so they repeat forever at the cost of one quad each.
 */

interface StripLayer {
  sprite: Phaser.GameObjects.TileSprite;
  /** Solid fill below the strip, so tall screens never see past the hills. */
  fill: Phaser.GameObjects.Rectangle;
  factor: number;
  /** World y of the strip's top at factor 1. */
  worldTop: number;
  height: number;
}

interface DriftingCloud {
  image: Phaser.GameObjects.Image;
  /** Layer-space x (before parallax and wrapping). */
  x: number;
  y: number;
  speed: number;
  factor: number;
  bobPhase: number;
}

export interface ParallaxOptions {
  /** World y of the main walking level (hill horizons are placed relative to it). */
  groundY: number;
  /** World y where the cloud sea begins. */
  cloudSeaY: number;
  reducedMotion: boolean;
  seed?: number;
}

const toColor = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

export default class ParallaxBackground {
  private readonly scene: Phaser.Scene;
  private readonly resolution: number;
  private readonly options: ParallaxOptions;
  private sky!: Phaser.GameObjects.Image;
  private sunRays!: Phaser.GameObjects.Image;
  private sunFace!: Phaser.GameObjects.Image;
  private strips: StripLayer[] = [];
  private clouds: DriftingCloud[] = [];
  private nextBlinkAt = 0;
  private blinkUntil = 0;
  private elapsed = 0;

  constructor(scene: Phaser.Scene, resolution: number, options: ParallaxOptions) {
    this.scene = scene;
    this.resolution = resolution;
    this.options = options;
    this.create();
  }

  private create(): void {
    const { scene } = this;
    const { groundY, cloudSeaY } = this.options;

    this.sky = scene.add.image(0, 0, ArtKeys.sky).setOrigin(0, 0).setScrollFactor(0).setDepth(Depth.sky);

    this.sunRays = scene.add.image(0, 0, ArtKeys.sunRays).setScrollFactor(0).setDepth(Depth.sun).setScale(1 / this.resolution);
    this.sunFace = scene.add.image(0, 0, ArtKeys.sunFace).setScrollFactor(0).setDepth(Depth.sun).setScale(1 / this.resolution);
    this.nextBlinkAt = 2500;

    // Horizons sit progressively lower for nearer layers, so they overlap in depth.
    this.addStrip(ArtKeys.hillsFar, 0.18, groundY - 560, Depth.hillsFar, '#ef9cc6');
    this.addStrip(ArtKeys.hillsMid, 0.35, groundY - 420, Depth.hillsMid, PALETTE.midHillDeep);
    this.addStrip(ArtKeys.hillsNear, 0.55, groundY - 290, Depth.hillsNear, PALETTE.nearHillDeep);

    this.addClouds(0.08, Depth.farClouds, groundY - 900, groundY - 520, 7, 0.55, 0.75, [6, 14], 11);
    this.addClouds(0.7, Depth.nearClouds, groundY - 760, groundY - 380, 4, 0.85, 1.05, [14, 26], 23);

    this.addStrip(ArtKeys.cloudSea, 1, cloudSeaY, Depth.cloudSea, PALETTE.cloudShadeWarm, CLOUD_SEA_SIZE.height);

    this.update(0);
  }

  private addStrip(key: ArtKey, factor: number, worldTop: number, depth: number, fillHex: string, height: number = HILL_TILE.height) {
    const r = this.resolution;
    const sprite = this.scene.add
      .tileSprite(0, 0, 16, height * r, key)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setScale(1 / r)
      .setDepth(depth);
    const fill = this.scene.add.rectangle(0, 0, 16, 16, toColor(fillHex)).setOrigin(0, 0).setScrollFactor(0).setDepth(depth);
    this.strips.push({ sprite, fill, factor, worldTop, height });
  }

  private addClouds(
    factor: number,
    depth: number,
    minY: number,
    maxY: number,
    count: number,
    minScale: number,
    maxScale: number,
    speed: [number, number],
    seed: number,
  ) {
    const random = createRandom((this.options.seed ?? 1) * 97 + seed);
    const keys = [ArtKeys.cloudSmall, ArtKeys.cloudMedium, ArtKeys.cloudLarge, ArtKeys.cloudHappy];
    for (let i = 0; i < count; i++) {
      // Only near layers get the happy cloud, where its face is big enough to see.
      const key = factor > 0.5 && i === 1 ? ArtKeys.cloudHappy : keys[Math.floor(random() * 3)];
      const scale = range(random, minScale, maxScale);
      const image = this.scene.add
        .image(0, 0, key)
        .setScrollFactor(0)
        .setDepth(depth)
        .setScale(scale / this.resolution)
        .setAlpha(factor < 0.5 ? 0.85 : 1);
      this.clouds.push({
        image,
        x: (i / count) * 2600 + range(random, -120, 120),
        y: range(random, minY, maxY),
        speed: this.options.reducedMotion ? 0 : range(random, speed[0], speed[1]),
        factor,
        bobPhase: random() * Math.PI * 2,
      });
    }
  }

  /** Repositions every layer for the current camera. Call once per frame. */
  update(deltaMs: number): void {
    const camera = this.scene.cameras.main;
    const view = fixedView(camera);
    const dt = deltaMs / 1000;
    this.elapsed += deltaMs;

    this.sky.setPosition(view.left, view.top).setDisplaySize(view.width, view.height);
    this.updateSun(view, camera);

    for (const strip of this.strips) this.updateStrip(strip, view, camera);

    // Clouds wrap within a band wider than the screen, so they never pop in.
    const band = Math.max(2600, view.width + 900);
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt;
      const screenX = wrap(cloud.x - camera.scrollX * cloud.factor, band) - 450;
      const bob = this.options.reducedMotion ? 0 : Math.sin(this.elapsed / 2400 + cloud.bobPhase) * 6;
      cloud.image.setPosition(view.left + screenX, cloud.y - camera.scrollY * cloud.factor + bob);
    }
  }

  private updateStrip(strip: StripLayer, view: FixedView, camera: Phaser.Cameras.Scene2D.Camera): void {
    const r = this.resolution;
    const y = strip.worldTop - camera.scrollY * strip.factor;
    strip.sprite.setPosition(view.left, y);
    const width = Math.ceil(view.width * r) + 2;
    if (strip.sprite.width !== width) strip.sprite.setSize(width, strip.height * r);
    strip.sprite.tilePositionX = layerLeft(camera, view, strip.factor) * r;
    // Start the fill over the strip's transparent bottom rows (see STRIP_BOTTOM_PADDING).
    const fillTop = y + strip.height - STRIP_BOTTOM_PADDING - 1;
    const bottom = view.top + view.height;
    strip.fill.setPosition(view.left, fillTop).setSize(view.width + 2, Math.max(0, bottom - fillTop));
    strip.fill.setVisible(bottom > fillTop);
  }

  private updateSun(view: FixedView, camera: Phaser.Cameras.Scene2D.Camera): void {
    const size = SUN_FACE_SIZE.width;
    // Up and to the right, clear of the HUD buttons in the corner. Narrow
    // (portrait) screens have the HUD across the top, so the sun sits lower.
    const narrow = view.width < view.height;
    const x = narrow ? view.left + view.width * 0.66 : view.left + view.width - size * 1.35;
    // A hint of vertical parallax makes the sun feel far away.
    const y = view.top + size * (narrow ? 1.6 : 1.05) - camera.scrollY * 0.02 + 8;
    const t = this.elapsed;
    const motion = this.options.reducedMotion ? 0 : 1;
    this.sunRays.setPosition(x, y).setRotation((t / 1000) * 0.08 * motion);
    this.sunRays.setScale((1 + Math.sin(t / 900) * 0.03 * motion) / this.resolution);
    this.sunFace.setPosition(x, y + Math.sin(t / 1300) * 4 * motion);

    // Blink every few seconds.
    if (t >= this.nextBlinkAt) {
      this.blinkUntil = t + 160;
      this.nextBlinkAt = t + 2800 + Math.random() * 2600;
    }
    const key = t < this.blinkUntil ? ArtKeys.sunFaceBlink : ArtKeys.sunFace;
    if (this.sunFace.texture.key !== key) this.sunFace.setTexture(key);
  }
}
