import Phaser from 'phaser';
import { connectGameToStore, type LevelController } from './bridge';
import { SKY_COLOR, SceneKeys, type LevelSceneData } from './constants';
import { computeCanvasSize } from './scaling';
import BootScene from './scenes/BootScene';
import LevelScene from './scenes/LevelScene';
import PreloadScene from './scenes/PreloadScene';

/**
 * Creates the Phaser game inside `parent` and wires it to the store.
 *
 * Phaser 3 has no device-pixel-ratio setting. We size the canvas backing
 * store in device pixels and let FIT mode scale it down to the container in
 * CSS. The art stays sharp on retina screens and pointer input maps
 * correctly. A ResizeObserver keeps it matched to the container.
 */
export function createGame(parent: HTMLElement): { game: Phaser.Game; destroy: () => void } {
  const initial = computeCanvasSize(parent.clientWidth, parent.clientHeight, window.devicePixelRatio);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: SKY_COLOR,
    banner: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: initial.width,
      height: initial.height,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    fps: { target: 60, smoothStep: true },
    // Keyboard and touch input come from the React layer (useInputStore),
    // shared with the on-screen buttons. Phaser's keyboard stays off.
    input: { keyboard: false, mouse: true, touch: true, gamepad: false },
    // Sound is synthesised by utils/sound.ts; Phaser's audio system is unused.
    audio: { noAudio: true },
    scene: [BootScene, PreloadScene, LevelScene],
  });

  const resize = () => {
    const size = computeCanvasSize(parent.clientWidth, parent.clientHeight, window.devicePixelRatio);
    if (size.width !== game.scale.gameSize.width || size.height !== game.scale.gameSize.height) {
      // In FIT mode setGameSize (not resize) updates the aspect ratio that FIT scales to.
      game.scale.setGameSize(size.width, size.height);
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(parent);

  const controller: LevelController = {
    isLevelStarted: () => {
      const status = game.scene.getScene(SceneKeys.Level)?.sys.settings.status ?? Phaser.Scenes.PENDING;
      return status >= Phaser.Scenes.START && status < Phaser.Scenes.SHUTDOWN;
    },
    startLevel: (data: LevelSceneData) => {
      game.scene.stop(SceneKeys.Level);
      game.scene.start(SceneKeys.Level, data);
    },
    pauseLevel: () => game.scene.pause(SceneKeys.Level),
    resumeLevel: () => game.scene.resume(SceneKeys.Level),
  };
  const disconnect = connectGameToStore(controller);

  if (import.meta.env.DEV) {
    // Development-only handle for debugging and automated play-testing.
    (window as unknown as Record<string, unknown>).__phaser = game;
  }

  return {
    game,
    destroy: () => {
      disconnect();
      observer.disconnect();
      game.destroy(true);
    },
  };
}
