import Phaser from 'phaser';
import { useGameStore } from '@/stores/useGameStore';
import { EventBus } from '../EventBus';
import { SKY_COLOR, SceneKeys, type LevelSceneData } from '../constants';
import { getLevelDefinition, type LevelDefinition } from '../levels';
import { computeCameraZoom } from '../scaling';

/**
 * Hosts a playable level. This phase sets up the shared frame every level
 * needs: physics world and camera bounds, screen-size-aware camera zoom,
 * the level's goals in the store, and the "ready" signal to React. Later
 * phases add the parallax world, the player and the mechanics on top.
 */
export default class LevelScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private runId = 0;

  constructor() {
    super(SceneKeys.Level);
  }

  init(data: LevelSceneData): void {
    const level = getLevelDefinition(data.levelId);
    if (!level) throw new Error(`Unknown level ${data.levelId}`);
    this.level = level;
    this.runId = data.runId;
  }

  create(): void {
    const { width, height, goals } = this.level;

    this.cameras.main.setBackgroundColor(SKY_COLOR);
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
    this.applyZoom();

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

  /** Keep DESIGN_HEIGHT world pixels filling the screen at any size or orientation. */
  private applyZoom(): void {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setZoom(computeCameraZoom(width, height));
  }
}
