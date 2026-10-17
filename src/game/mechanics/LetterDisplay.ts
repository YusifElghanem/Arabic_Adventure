import Phaser from 'phaser';
import { selectIsLetterComplete, useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import { sayLetterAndWord } from '@/utils/voice';
import { ArtKeys } from '../art';
import { MechanicKeys } from '../art/mechanics';
import type { LetterSpec } from '../letters';
import { letterIndex, requiredDots } from '../letters';
import type DotCompanions from '../player/DotCompanions';
import { DISPLAY_FONT } from '../constants';
import { Depth } from '../world/depths';

/**
 * The big candy letter of a template level. It starts as its dotless
 * skeleton with dashed ghost dots where the dots belong. (A letter without
 * dots starts grey with a single sparkle slot.) When the child arrives
 * carrying dots, they fly into the slots. When all have arrived, the real
 * letter pops in, in full colour, and its name and word are spoken.
 */

const FONT_SIZE = 300;
/** A letter without dots starts grey and "wakes up" in colour. */
const GREY = '#b9c1ce';

export default class LetterDisplay {
  readonly sensor: Phaser.GameObjects.Zone;
  private readonly scene: Phaser.Scene;
  private readonly spec: LetterSpec;
  private readonly resolution: number;
  private readonly text: Phaser.GameObjects.Text;
  private readonly slots: { x: number; y: number }[] = [];
  private readonly ghosts: Phaser.GameObjects.Image[] = [];
  private readonly filled: Phaser.GameObjects.Image[] = [];
  private nextSlot = 0;
  private complete = false;

  constructor(scene: Phaser.Scene, spec: LetterSpec, x: number, groundY: number, resolution: number) {
    this.scene = scene;
    this.spec = spec;
    this.resolution = resolution;
    this.text = scene.add
      .text(x, groundY - 20, spec.dotless, {
        fontFamily: DISPLAY_FONT,
        fontStyle: '800',
        fontSize: `${FONT_SIZE}px`,
        color: spec.dots === 0 ? GREY : spec.color,
        stroke: '#ffffff',
        strokeThickness: 14,
        shadow: { offsetX: 0, offsetY: 8, color: 'rgba(0,0,0,0.18)', blur: 0, stroke: true, fill: true },
        padding: { x: 24, y: 24 },
        resolution: Math.max(1, resolution),
        rtl: true,
      })
      .setOrigin(0.5, 1)
      .setDepth(Depth.decorBack + 1);

    this.computeSlots();
    for (const slot of this.slots) {
      // Tinted with the letter's colour so the dashed ring reads against the bright sky.
      const ghost = scene.add
        .image(slot.x, slot.y, MechanicKeys.dotGhost)
        .setScale(0.85 / resolution)
        .setTint(Phaser.Display.Color.HexStringToColor(spec.color).color)
        .setDepth(Depth.decorBack + 2);
      scene.tweens.add({ targets: ghost, alpha: { from: 0.55, to: 1 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.ghosts.push(ghost);
    }

    // The whole letter gently floats (its dots float with it via a shared offset).
    scene.tweens.add({ targets: this.text, angle: { from: -2, to: 2 }, duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.sensor = scene.add.zone(x - 170, groundY - 400, 340, 400).setOrigin(0, 0);
    scene.physics.add.existing(this.sensor, true);

    this.complete = selectIsLetterComplete(useGameStore.getState());
    const unsubscribe = useGameStore.subscribe((state) => {
      if (!this.complete && selectIsLetterComplete(state)) this.celebrate();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  /** World positions of the empty slots still waiting for a dot. */
  get openSlots(): { x: number; y: number }[] {
    return this.slots.slice(this.nextSlot);
  }

  /**
   * Finds where the dots go from the glyph's actual ink, read from the text
   * canvas. Placement only has to be close: on completion the real letter
   * (with its own dots) replaces the skeleton.
   */
  private computeSlots(): void {
    const ink = this.inkBounds();
    const count = requiredDots(this.spec);
    const cx = ink.x + ink.width / 2;
    let y: number;
    if (this.spec.dots === 0) y = ink.y + ink.height / 2;
    else if (this.spec.dotPlace === 'below') y = ink.y + ink.height + 30;
    else if (this.spec.dotPlace === 'inside') y = ink.y + ink.height * 0.7;
    else y = ink.y - 28;
    const xs = count === 1 ? [cx] : count === 2 ? [cx + 28, cx - 28] : [cx + 28, cx - 28, cx];
    xs.forEach((x, i) => this.slots.push({ x, y: count === 3 && i === 2 ? y - 44 : y }));
  }

  /** The bounding box (world px) of the glyph's opaque pixels. */
  private inkBounds(): Phaser.Geom.Rectangle {
    const t = this.text;
    const canvas = t.canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const box = t.getBounds();
    if (!ctx || !canvas.width || !canvas.height) return box;
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let yy = 0; yy < height; yy += 2) {
      for (let xx = 0; xx < width; xx += 2) {
        if (data[(yy * width + xx) * 4 + 3] > 140) {
          if (xx < minX) minX = xx;
          if (xx > maxX) maxX = xx;
          if (yy < minY) minY = yy;
          if (yy > maxY) maxY = yy;
        }
      }
    }
    if (maxX < 0) return box;
    const sx = box.width / width;
    const sy = box.height / height;
    return new Phaser.Geom.Rectangle(box.x + minX * sx, box.y + minY * sy, (maxX - minX) * sx, (maxY - minY) * sy);
  }

  /** Called while the child overlaps the letter: their carried dots fly in. */
  receive(companions: DotCompanions): void {
    if (this.complete || companions.count === 0) return;
    const targets = this.openSlots.slice(0, companions.count);
    const startIndex = this.nextSlot;
    this.nextSlot += targets.length;
    companions.releaseTo(targets, (i) => {
      const slot = this.slots[startIndex + i];
      this.ghosts[startIndex + i]?.setVisible(false);
      const dot = this.scene.add
        .image(slot.x, slot.y, this.spec.dots === 0 ? MechanicKeys.glow : MechanicKeys.dot)
        .setScale(0.2 / this.resolution)
        .setDepth(Depth.decorBack + 3);
      this.scene.tweens.add({ targets: dot, scale: 0.8 / this.resolution, duration: 420, ease: 'Back.easeOut' });
      this.filled.push(dot);
      playSound('pop');
      useGameStore.getState().collectLetterDot();
    });
  }

  private celebrate(): void {
    this.complete = true;
    const { scene, spec } = this;
    scene.time.delayedCall(250, () => {
      for (const img of [...this.ghosts, ...this.filled]) {
        scene.tweens.add({ targets: img, alpha: 0, scale: img.scale * 1.6, duration: 260, onComplete: () => img.destroy() });
      }
      // The real letter, dots and all, pops in.
      this.text.setText(spec.letter).setColor(spec.color);
      this.text.setScale(0.8);
      scene.tweens.add({ targets: this.text, scale: 1, duration: 600, ease: 'Elastic.easeOut', easeParams: [1.1, 0.45] });
      scene.add
        .particles(this.text.x, this.text.y - FONT_SIZE * 0.45, ArtKeys.sparkle, {
          lifespan: 1600,
          speed: { min: 30, max: 90 },
          scale: { start: 0.6 / this.resolution, end: 0 },
          alpha: { start: 1, end: 0 },
          tint: [0xffffff, 0xfff6a8, Phaser.Display.Color.HexStringToColor(spec.color).color],
          blendMode: Phaser.BlendModes.ADD,
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-130, -150, 260, 300), quantity: 1 },
          frequency: 110,
        })
        .setDepth(Depth.sparkles);
      useGameStore.getState().discoverLetter(spec.letter);
      playSound('win');
      scene.time.delayedCall(400, () => sayLetterAndWord(letterIndex(spec)));
    });
  }
}
