import Phaser from 'phaser';
import { ArtKeys } from '../art';
import { DISPLAY_FONT } from '../constants';
import type { LetterSpec } from '../letters';
import { Depth } from '../world/depths';

const FONT_SIZE = 300;

/**
 * Thieves mode: the big, complete letter the child protects. Each letter a
 * thief carries off makes it paler and smaller; each one brought back makes
 * it bright again.
 */
export default class GuardedLetter {
  private readonly scene: Phaser.Scene;
  private readonly text: Phaser.GameObjects.Text;
  private readonly resolution: number;
  private readonly color: number;
  private stolen = 0;

  constructor(scene: Phaser.Scene, spec: LetterSpec, x: number, groundY: number, resolution: number) {
    this.scene = scene;
    this.resolution = resolution;
    this.color = Phaser.Display.Color.HexStringToColor(spec.color).color;
    this.text = scene.add
      .text(x, groundY - 20, spec.letter, {
        fontFamily: DISPLAY_FONT,
        fontStyle: '800',
        fontSize: `${FONT_SIZE}px`,
        color: spec.color,
        stroke: '#ffffff',
        strokeThickness: 14,
        shadow: { offsetX: 0, offsetY: 8, color: 'rgba(0,0,0,0.18)', blur: 0, stroke: true, fill: true },
        padding: { x: 24, y: 24 },
        resolution: Math.max(1, resolution),
        rtl: true,
      })
      .setOrigin(0.5, 1)
      .setDepth(Depth.decorBack + 1);
    scene.tweens.add({ targets: this.text, angle: { from: -2, to: 2 }, duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Where a thief grabs the letter. */
  get grabPoint(): { x: number; y: number } {
    return { x: this.text.x, y: this.text.y - FONT_SIZE * 0.55 };
  }

  steal(): void {
    this.stolen++;
    this.refresh();
    this.scene.tweens.add({ targets: this.text, x: this.text.x + 8, duration: 60, yoyo: true, repeat: 3 });
  }

  restore(): void {
    this.stolen = Math.max(0, this.stolen - 1);
    this.refresh();
    this.sparkle(10);
  }

  /** Every thief is a friend now: a big happy pop. */
  celebrate(): void {
    this.stolen = 0;
    this.refresh();
    this.text.setScale(0.8);
    this.scene.tweens.add({ targets: this.text, scale: 1.1, duration: 700, ease: 'Elastic.easeOut', easeParams: [1.1, 0.45] });
    this.sparkle(40);
  }

  private refresh(): void {
    const t = Math.min(this.stolen, 4);
    this.scene.tweens.add({ targets: this.text, alpha: 1 - t * 0.16, scale: 1 - t * 0.06, duration: 300, ease: 'Sine.easeOut' });
  }

  private sparkle(count: number): void {
    const { x, y } = this.grabPoint;
    const burst = this.scene.add
      .particles(x, y, ArtKeys.sparkle, {
        lifespan: 900,
        speed: { min: 80, max: 220 },
        scale: { start: 0.7 / this.resolution, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffffff, 0xfff6a8, this.color],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(Depth.sparkles);
    burst.explode(count);
    this.scene.time.delayedCall(1000, () => burst.destroy());
  }
}
