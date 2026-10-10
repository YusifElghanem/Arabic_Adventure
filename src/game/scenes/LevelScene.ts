import Phaser from 'phaser';
import { useGameStore } from '@/stores/useGameStore';
import { EventBus } from '../EventBus';
import { ART_RESOLUTION_KEY } from '../assets';
import { SKY_COLOR, SceneKeys, type LevelSceneData } from '../constants';
import { getLevelDefinition, type LevelDefinition } from '../levels';
import FloatingLetterA from '../mechanics/FloatingLetterA';
import GoalGate from '../mechanics/GoalGate';
import LetterB from '../mechanics/LetterB';
import MysteryBlock from '../mechanics/MysteryBlock';
import Star from '../mechanics/Star';
import Player from '../player/Player';
import { computeCameraZoom } from '../scaling';
import Ambient from '../world/Ambient';
import { decoratePlatforms } from '../world/Decorations';
import ParallaxBackground from '../world/ParallaxBackground';
import Platform from '../world/Platform';

/**
 * Hosts a playable level: the parallax sky world, candy platforms and
 * scenery, the player, the learning mechanics, and a smooth follow camera
 * that looks ahead in the direction of travel.
 */

/** Keep the child in the lower part of the screen, with sky above. */
const CAMERA_FOLLOW_OFFSET_Y = 120;
const LOOK_AHEAD = 0.45;

export default class LevelScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private runId = 0;
  private background!: ParallaxBackground;
  private ambient!: Ambient;
  private platforms: Platform[] = [];
  /** Exposed for debugging and automated play-tests. */
  player!: Player;
  letterB!: LetterB;
  mysteryBlock!: MysteryBlock;
  private lookAhead = 0;

  constructor() {
    super(SceneKeys.Level);
  }

  init(data: LevelSceneData): void {
    const level = getLevelDefinition(data.levelId);
    if (!level) throw new Error(`Unknown level ${data.levelId}`);
    this.level = level;
    this.runId = data.runId;
    this.platforms = [];
    this.lookAhead = 0;
  }

  create(): void {
    const { width, height, goals, mechanics } = this.level;
    const resolution = (this.registry.get(ART_RESOLUTION_KEY) as number | undefined) ?? 1;
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    // Register goals first, so mechanics that read the session see this run's goals.
    if (useGameStore.getState().session?.runId === this.runId) {
      useGameStore.getState().registerLevelGoals(goals);
    }

    this.cameras.main.setBackgroundColor(SKY_COLOR);
    // No floor: falling into the cloud sea triggers the friendly respawn.
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
    const homes = this.platforms.filter((_, i) => i % 2 === 1).map((p) => ({ x: p.spec.x + p.width / 2, y: p.spec.y - 230 }));
    this.ambient = new Ambient(this, resolution, homes, reducedMotion, this.level.decorSeed);

    // Mechanics.
    this.letterB = new LetterB(this, mechanics.letterB.x, mechanics.letterB.groundY, resolution);
    this.mysteryBlock = new MysteryBlock(
      this,
      mechanics.mysteryBlock.x,
      mechanics.mysteryBlock.y,
      resolution,
      () => this.letterB.dotPosition,
      () => useGameStore.getState().collectLetterDot(),
    );
    const letterA = new FloatingLetterA(this, mechanics.letterA.x, mechanics.letterA.groundY, mechanics.letterA.lionX, resolution);
    const stars = mechanics.stars.map((s) => new Star(this, s.x, s.y, resolution));
    const goal = new GoalGate(this, mechanics.goal.x, mechanics.goal.groundY, resolution);

    // The player, and everything it touches.
    this.player = new Player(this, { spawn: this.level.spawn, killY: this.level.cloudSeaY + 150, resolution });
    const playerBody = this.player.body;
    this.physics.add.collider(this.player.zone, this.platforms.map((p) => p.body));
    this.physics.add.collider(this.player.zone, this.mysteryBlock.zone, () => this.mysteryBlock.handleCollision(playerBody));
    this.physics.add.collider(this.player.zone, this.letterB.zone, () => this.letterB.handleCollision(playerBody, (v) => this.player.launch(v)));
    this.physics.add.overlap(this.player.zone, letterA.sensor, () => letterA.greet());
    for (const star of stars) this.physics.add.overlap(this.player.zone, star.zone, () => star.collect());
    this.physics.add.overlap(this.player.zone, goal.sensor, () => goal.enter());

    const camera = this.cameras.main;
    camera.startFollow(this.player.puppet.container, false, 0.1, 0.15, 0, CAMERA_FOLLOW_OFFSET_Y);
    camera.setDeadzone(60, 150);
    camera.centerOn(this.level.spawn.x, this.level.spawn.y - CAMERA_FOLLOW_OFFSET_Y);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
      this.letterB.destroy();
    });

    // Emit after the first frame renders, so React hides the loader only once there's a picture.
    this.events.once(Phaser.Scenes.Events.POST_UPDATE, () => EventBus.emit('level-ready', this.level.id));
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta);

    // Look ahead in the direction of travel (smoothed), so the child sees what's coming.
    const dt = Math.min(delta, 50) / 1000;
    const target = Phaser.Math.Clamp(-this.player.velocity.x * LOOK_AHEAD, -160, 160);
    this.lookAhead += (target - this.lookAhead) * (1 - Math.exp(-2.5 * dt));
    this.cameras.main.setFollowOffset(this.lookAhead, CAMERA_FOLLOW_OFFSET_Y);

    this.background.update(delta);
    this.ambient.update(delta);
  }

  /**
   * Keep DESIGN_HEIGHT world pixels filling the screen at any size or
   * orientation. On tall screens the view can be taller than the world, so
   * the camera bounds grow upwards: the extra height becomes sky.
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
