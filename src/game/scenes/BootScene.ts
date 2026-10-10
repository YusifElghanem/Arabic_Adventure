import Phaser from 'phaser';
import { SceneKeys } from '../constants';

/**
 * First scene to run. It configures engine-wide behaviour, then hands over
 * to the preloader. It is kept tiny so the first frame appears immediately.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    // Long-presses on tablets must never open the browser's context menu mid-game.
    this.input.mouse?.disableContextMenu();
    this.scene.start(SceneKeys.Preload);
  }
}
