import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { currentLevelData } from '../bridge';
import { SceneKeys } from '../constants';
import { ART_RESOLUTION_KEY, chooseArtResolution, getAssetManifest, queueAssets } from '../assets';
import { computeCameraZoom } from '../scaling';

/**
 * Loads every asset in the manifest, reports progress to the React loading
 * screen through the EventBus, then starts the level that the store says
 * the child is playing.
 */
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => EventBus.emit('preload-progress', value));
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.error(`[Preload] Failed to load asset "${file.key}" from ${String(file.url)}`);
    });
    // Pick the texture resolution once, from the zoom this screen will use.
    const { width, height } = this.scale.gameSize;
    const resolution = chooseArtResolution(computeCameraZoom(width, height));
    this.registry.set(ART_RESOLUTION_KEY, resolution);
    queueAssets(this.load, getAssetManifest(), resolution);
  }

  create(): void {
    EventBus.emit('preload-progress', 1);
    const data = currentLevelData();
    // The store always has a session when the game is mounted. If it has
    // vanished (the child went home mid-load), there is nothing to start.
    if (data) this.scene.start(SceneKeys.Level, data);
  }
}
