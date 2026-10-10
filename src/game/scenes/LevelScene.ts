import Phaser from 'phaser';
import { useGameStore } from '@/stores/useGameStore';
import { horizontalAxis, useInputStore } from '@/stores/useInputStore';
import { EventBus } from '../EventBus';
import { ART_RESOLUTION_KEY } from '../assets';
import { SKY_COLOR, SceneKeys, type LevelSceneData } from '../constants';
import { getLevelDefinition, type LevelDefinition } from '../levels';
import { computeCameraZoom } from '../scaling';
import Ambient from '../world/Ambient';
import { decoratePlatforms } from '../world/Decorations';
import ParallaxBackground from '../world/ParallaxBackground';
import Platform from '../world/Platform';

/**
 * Hosts a playable level: the parallax sky world, the candy platforms with
 * their swaying scenery, ambient sparkles and butterflies, and a smooth
 * follow camera.
 *
 * Until the player arrives (Phase 3), the camera follows a "focus" point
 * that the arrow keys and touch buttons pan along the level, gliding up
 * and down to each platform's height, so the parallax can be explored.
 */

const FOCUS_SPEED = 520;
/** Keep the ground in the lower part of the screen, with sky above. */
const CAMERA_FOLLOW_OFFSET_Y = 110;

export default class LevelScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private runId = 0;
  private background!: ParallaxBackground;
  private ambient!: Ambient;
  private platforms: Platform[] = [];
  private focus!: Phaser.GameObjects.Zone;

  constructor() {
    super(SceneKeys.Level);
  }

  init(data: LevelSceneData): void {
    const level = getLevelDefinition(data.levelId);
    if (!level) throw new Error(`Unknown level ${data.levelId}`);
    this.level = level;
    this.runId = data.runId;
    this.platforms = [];
  }

  create(): void {
    const { width, height, goals } = this.level;
    const resolution = (this.registry.get(ART_RESOLUTION_KEY) as number | undefined) ?? 1;
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    this.cameras.main.setBackgroundColor(SKY_COLOR);
    // Let the world extend below the level, so falling into the cloud sea stays in view.
    this.physics.world.setBounds(0, 0, width, height, true, true, true, false);
    this.cameras.main.setRoundPixels(false);
    this.applyZoom();

    this.background = new ParallaxBackground(this, resolution, {
      groundY: this.level.groundY,
      cloudSeaY: this.level.cloudSeaY,
      reducedMotion,
      seed: this.level.decorSeed,
    });

    this.platforms = this.level.platforms.map((spec) => new Platform(this, spec, resolution));
    decoratePlatforms(this, this.platforms, this.level.decorSeed, resolution, reducedMotion);

    // Butterflies loop above every other platform.
    const homes = this.platforms
      .filter((_, i) => i % 2 === 1)
      .map((p) => ({ x: p.spec.x + p.width / 2, y: p.spec.y - 220 }));
    this.ambient = new Ambient(this, resolution, homes, reducedMotion, this.level.decorSeed);

    this.focus = this.add.zone(this.level.spawn.x, this.level.spawn.y, 1, 1);
    this.cameras.main.startFollow(this.focus, false, 0.08, 0.08, 0, CAMERA_FOLLOW_OFFSET_Y);
    this.cameras.main.centerOn(this.focus.x, this.focus.y - CAMERA_FOLLOW_OFFSET_Y);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
    });

    // Ignore a stale restart: only register goals for the run the store is on.
    if (useGameStore.getState().session?.runId === this.runId) {
      useGameStore.getState().registerLevelGoals(goals);
    }

    // Emit after the first frame renders, so React hides the loader only once there's a picture.
    this.events.once(Phaser.Scenes.Events.POST_UPDATE, () => EventBus.emit('level-ready', this.level.id));
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.moveFocus(dt);
    this.background.update(delta);
    this.ambient.update(delta);
  }

  /** Preview camera: pan with the input, gliding to the height of the platform below. */
  private moveFocus(dt: number): void {
    const axis = horizontalAxis(useInputStore.getState());
    const x = Phaser.Math.Clamp(this.focus.x + axis * FOCUS_SPEED * dt, 0, this.level.width);
    const below = this.platforms.find((p) => x >= p.spec.x && x <= p.spec.x + p.width);
    const targetY = below ? below.spec.y : this.focus.y;
    const y = Phaser.Math.Linear(this.focus.y, targetY, Math.min(1, dt * 3));
    this.focus.setPosition(x, y);
  }

  /**
   * Keep DESIGN_HEIGHT world pixels filling the screen at any size or
   * orientation. On tall screens the view can be taller than the world, so
   * the camera bounds grow upwards: the extra height becomes sky, not empty
   * space below the level.
   */
  private applyZoom(): void {
    const { width, height } = this.scale.gameSize;
    const zoom = computeCameraZoom(width, height);
    const camera = this.cameras.main;
    camera.setZoom(zoom);
    const viewHeight = height / zoom;
    const top = Math.min(0, this.level.height - viewHeight);
    camera.setBounds(0, top, this.level.width, this.level.height - top);
  }
}
