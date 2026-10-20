import Phaser from 'phaser';
import { useGameStore } from '@/stores/useGameStore';
import { EventBus } from '../EventBus';
import { ART_RESOLUTION_KEY } from '../assets';
import { lookId, onesieArt } from '../art/character';
import { toDataUri } from '../art/svg';
import { placeCoins } from '../coins';
import Coin from '../mechanics/Coin';
import { onesieLook } from '../shop';
import { SKY_COLOR, SceneKeys, type LevelSceneData } from '../constants';
import DotCompanions from '../player/DotCompanions';
import LetterDisplay from '../mechanics/LetterDisplay';
import WordFriend, { FRIEND_SIZE, friendTextureKey } from '../mechanics/WordFriend';
import { getChallengeLevel, getGuardLevel, getLevelDefinition, thiefCount, type LevelDefinition, type ThiefKind } from '../levels';
import CandyShot from '../mechanics/CandyShot';
import BubbleShot from '../mechanics/BubbleShot';
import GuardedLetter from '../mechanics/GuardedLetter';
import Thief from '../mechanics/Thief';
import { useInputStore } from '@/stores/useInputStore';
import { celebrateLetter } from '@/utils/voice';
import FloatingLetterA from '../mechanics/FloatingLetterA';
import GoalGate from '../mechanics/GoalGate';
import LetterB from '../mechanics/LetterB';
import MysteryBlock from '../mechanics/MysteryBlock';
import Star from '../mechanics/Star';
import Player from '../player/Player';
import { computeCameraZoom } from '../scaling';
import { preloadLetterVoice } from '@/utils/voice';
import { letterIndex } from '../letters';
import { playSound } from '@/utils/sound';
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
/** Registry key: which onesie look the character textures currently show. */
const LOOK_KEY = 'onesieLook';
/** Magnet tool: coins within this distance of the child glide in. */
const MAGNET_RADIUS = 260;
/** Bubble wand: seconds between bubbles, and how far it looks for a thief. */
const BUBBLE_COOLDOWN = 0.45;
const BUBBLE_RANGE = 900;

export default class LevelScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private runId = 0;
  private background!: ParallaxBackground;
  private ambient!: Ambient;
  private platforms: Platform[] = [];
  /** Exposed for debugging and automated play-tests. */
  player!: Player;
  /** Classic level only. */
  letterB?: LetterB;
  mysteryBlock?: MysteryBlock;
  /** Template levels only. */
  blocks: MysteryBlock[] = [];
  letterDisplay?: LetterDisplay;
  friend?: WordFriend;
  companions?: DotCompanions;
  private lookAhead = 0;
  coins: Coin[] = [];
  /** Thieves mode only. */
  guardLetter?: GuardedLetter;
  thieves: Thief[] = [];
  private bubbles: BubbleShot[] = [];
  private candies: CandyShot[] = [];
  private challenge = false;
  private seenActions = 0;
  private bubbleReadyAt = 0;
  private clock = 0;
  private thievesSpawned = 0;
  private nextThiefAt = 0;
  private finished = false;

  constructor() {
    super(SceneKeys.Level);
  }

  init(data: LevelSceneData): void {
    const session = useGameStore.getState().session;
    const mode = session?.runId === data.runId ? session.mode : 'adventure';
    this.challenge = mode === 'challenge';
    const level =
      mode === 'thieves' ? getGuardLevel(data.levelId) : mode === 'challenge' ? getChallengeLevel(data.levelId) : getLevelDefinition(data.levelId);
    if (!level) throw new Error(`Unknown level ${data.levelId}`);
    this.level = level;
    this.runId = data.runId;
    this.platforms = [];
    this.lookAhead = 0;
    this.blocks = [];
    this.coins = [];
    this.guardLetter = undefined;
    this.thieves = [];
    this.bubbles = [];
    this.candies = [];
    this.seenActions = useInputStore.getState().actionPresses;
    this.bubbleReadyAt = 0;
    this.clock = 0;
    this.thievesSpawned = 0;
    this.nextThiefAt = 2;
    this.finished = false;
    this.letterB = undefined;
    this.mysteryBlock = undefined;
    this.letterDisplay = undefined;
    this.friend = undefined;
    this.companions = undefined;
  }

  /**
   * Loads what this run needs beyond the shared manifest: the onesie in the
   * shop look the child is wearing (rebuilt only when it changed), and for
   * template levels the word picture.
   */
  preload(): void {
    const r = (this.registry.get(ART_RESOLUTION_KEY) as number | undefined) ?? 1;
    const { costume, skin } = useGameStore.getState();
    const look = onesieLook(costume, skin);
    if (this.registry.get(LOOK_KEY) !== lookId(look)) {
      this.registry.set(LOOK_KEY, lookId(look));
      for (const piece of onesieArt(look)) {
        this.textures.remove(piece.key);
        this.load.svg(piece.key, toDataUri(piece.svg()), { width: Math.round(piece.width * r), height: Math.round(piece.height * r) });
      }
    }
    const spec = this.level.letter;
    if (!spec || this.level.kind !== 'template') return;
    const key = friendTextureKey(spec);
    if (this.textures.exists(key)) return;
    const size = Math.round(FRIEND_SIZE * 1.4 * r);
    this.load.svg(key, `${import.meta.env.BASE_URL}emoji/${spec.emoji}.svg`, { width: size, height: size });
  }

  create(): void {
    const { width, height, goals } = this.level;
    const resolution = (this.registry.get(ART_RESOLUTION_KEY) as number | undefined) ?? 1;
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    // Register goals first, so mechanics that read the session see this run's goals.
    if (useGameStore.getState().session?.runId === this.runId) {
      useGameStore.getState().registerLevelGoals(goals);
    }

    // Fetch this level's voice clips now, so they play without delay.
    if (this.level.letter) preloadLetterVoice(letterIndex(this.level.letter));
    else {
      preloadLetterVoice(0);
      preloadLetterVoice(1);
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
    // Moving platforms carry no scenery (it would float in the air without them).
    const still = this.platforms.filter((p) => !p.moving);
    decoratePlatforms(this, still, this.level.decorSeed, resolution, reducedMotion);
    const homes = still.filter((_, i) => i % 2 === 1).map((p) => ({ x: p.spec.x + p.width / 2, y: p.spec.y - 230 }));
    this.ambient = new Ambient(this, resolution, homes, reducedMotion, this.level.decorSeed);

    // The player first: mechanics aim at it.
    this.player = new Player(this, {
      spawn: this.level.spawn,
      killY: this.level.cloudSeaY + 150,
      resolution,
      // Challenge mode: falling in costs a heart (the bubble still floats the child home).
      onFall: this.challenge ? () => useGameStore.getState().loseHeart() : undefined,
    });
    this.physics.add.collider(this.player.zone, this.platforms.map((p) => p.body));

    if (this.level.kind === 'classic') this.buildClassicMechanics(resolution);
    else if (this.level.kind === 'template') this.buildTemplateMechanics(resolution);
    else this.buildGuardMechanics(resolution);

    const stars = (this.level.mechanics?.stars ?? this.level.template?.stars ?? this.level.guard?.stars ?? []).map((s) => new Star(this, s.x, s.y, resolution));
    for (const star of stars) this.physics.add.overlap(this.player.zone, star.zone, () => star.collect());
    this.coins = placeCoins(this.level).map((c) => new Coin(this, c.x, c.y, resolution));
    for (const coin of this.coins) this.physics.add.overlap(this.player.zone, coin.zone, () => coin.collect());
    // Thieves mode ends when every thief is a friend, not at a rainbow.
    const goalSpec = this.level.mechanics?.goal ?? this.level.template?.goal;
    if (goalSpec) {
      const goal = new GoalGate(this, goalSpec.x, goalSpec.groundY, resolution);
      this.physics.add.overlap(this.player.zone, goal.sensor, () => goal.enter());
    }

    const camera = this.cameras.main;
    camera.startFollow(this.player.puppet.container, false, 0.1, 0.15, 0, CAMERA_FOLLOW_OFFSET_Y);
    camera.setDeadzone(60, 150);
    camera.centerOn(this.level.spawn.x, this.level.spawn.y - CAMERA_FOLLOW_OFFSET_Y);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
      this.letterB?.destroy();
    });

    // Emit after the first frame renders, so React hides the loader only once there's a picture.
    this.events.once(Phaser.Scenes.Events.POST_UPDATE, () => EventBus.emit('level-ready', this.level.id));
  }

  update(time: number, delta: number): void {
    for (const p of this.platforms) p.update(delta);
    this.player.update(time, delta);
    this.companions?.update(delta, this.player.feet);
    const dt = Math.min(delta, 50) / 1000;
    this.clock += dt;
    this.updateTools(dt);
    if (this.level.guard) this.updateThieves(dt);
    if (useGameStore.getState().tool === 'magnet') {
      const { x, y } = this.player.feet;
      const cy = y - 70;
      for (const coin of this.coins) {
        const p = coin.position;
        if (!coin.isCollected && Math.hypot(p.x - x, p.y - cy) < MAGNET_RADIUS) coin.pullTowards(x, cy, delta / 1000);
      }
    }

    // Look ahead in the direction of travel (smoothed), so the child sees what's coming.
    const target = Phaser.Math.Clamp(-this.player.velocity.x * LOOK_AHEAD, -160, 160);
    this.lookAhead += (target - this.lookAhead) * (1 - Math.exp(-2.5 * dt));
    this.cameras.main.setFollowOffset(this.lookAhead, CAMERA_FOLLOW_OFFSET_Y);

    this.background.update(delta);
    this.ambient.update(delta);
  }

  /** Level 1: the ب trampoline, its Mystery Block, and the giant أ with the lion. */
  private buildClassicMechanics(resolution: number): void {
    const mechanics = this.level.mechanics!;
    const playerBody = this.player.body;
    const letterB = new LetterB(this, mechanics.letterB.x, mechanics.letterB.groundY, resolution);
    const block = new MysteryBlock(
      this,
      mechanics.mysteryBlock.x,
      mechanics.mysteryBlock.y,
      resolution,
      () => letterB.dotPosition,
      () => useGameStore.getState().collectLetterDot(),
    );
    const letterA = new FloatingLetterA(this, mechanics.letterA.x, mechanics.letterA.groundY, mechanics.letterA.lionX, resolution);
    this.physics.add.collider(this.player.zone, block.zone, () => block.handleCollision(playerBody));
    this.physics.add.collider(this.player.zone, letterB.zone, () => letterB.handleCollision(playerBody, (v) => this.player.launch(v)));
    this.physics.add.overlap(this.player.zone, letterA.sensor, () => letterA.greet());
    this.letterB = letterB;
    this.mysteryBlock = block;
  }

  /**
   * Generated letter levels: each Mystery Block's dot flies to the child and
   * orbits them; at the big letter, the dots fly into its slots.
   */
  private buildTemplateMechanics(resolution: number): void {
    const template = this.level.template!;
    const spec = this.level.letter!;
    const playerBody = this.player.body;
    const companions = new DotCompanions(this, resolution);
    const head = () => ({ x: this.player.feet.x, y: this.player.feet.y - 150 });
    this.blocks = template.blocks.map((b) => {
      const block = new MysteryBlock(this, b.x, b.y, resolution, head, () => companions.add(head()));
      this.physics.add.collider(this.player.zone, block.zone, () => block.handleCollision(playerBody));
      return block;
    });
    this.letterDisplay = new LetterDisplay(this, spec, template.letter.x, template.letter.groundY, resolution);
    const display = this.letterDisplay;
    this.physics.add.overlap(this.player.zone, display.sensor, () => display.receive(companions));
    this.friend = new WordFriend(this, spec, template.friend.x, template.friend.groundY);
    const friend = this.friend;
    this.physics.add.overlap(this.player.zone, friend.sensor, () => friend.greet());
    this.companions = companions;
  }

  /** Thieves mode: the big letter to protect; thieves come in over time (see updateThieves). */
  private buildGuardMechanics(resolution: number): void {
    const guard = this.level.guard!;
    this.guardLetter = new GuardedLetter(this, this.level.letter!, guard.letter.x, guard.letter.groundY, resolution);
    if (useGameStore.getState().session?.runId === this.runId) useGameStore.getState().registerThieves(thiefCount(guard));
  }

  private updateThieves(dt: number): void {
    const guard = this.level.guard!;
    const centre = { x: this.player.feet.x, y: this.player.feet.y - 70 };
    for (const thief of this.thieves) thief.update(dt, centre);
    const active = this.thieves.filter((t) => t.active).length;
    if (this.thievesSpawned < guard.thieves && active < guard.maxAtOnce && this.clock >= this.nextThiefAt) {
      const entry = guard.entries[this.thievesSpawned % guard.entries.length];
      this.spawnThief(entry, guard.cast?.[this.thievesSpawned] ?? 'looper', false);
      this.thievesSpawned++;
      this.nextThiefAt = this.clock + (this.challenge ? 2.2 : 3.5);
    }
    this.updateCandies(dt, centre);
  }

  private spawnThief(entry: { x: number; y: number }, kind: ThiefKind, small: boolean): void {
    const guard = this.level.guard!;
    const resolution = (this.registry.get(ART_RESOLUTION_KEY) as number | undefined) ?? 1;
    const phase = ((this.thieves.length + 1) * 2.1) % (Math.PI * 2);
    this.thieves.push(
      new Thief(this, this.level.letter!, entry, this.guardLetter!, guard.roam, resolution, phase, () => this.onBefriend(), {
        kind,
        small,
        speed: guard.speed,
        throwEvery: guard.throwEvery,
        onThrow: (x, y) => this.throwCandy(x, y),
        onSplit: (x, y) => {
          this.spawnThief({ x: x - 30, y }, 'looper', true);
          this.spawnThief({ x: x + 30, y }, 'looper', true);
        },
      }),
    );
  }

  /** Challenge mode: a candy tossed at where the child is now. */
  private throwCandy(x: number, y: number): void {
    if (!this.challenge || this.finished) return;
    const resolution = (this.registry.get(ART_RESOLUTION_KEY) as number | undefined) ?? 1;
    const target = { x: this.player.feet.x, y: this.player.feet.y - 70 };
    this.candies.push(new CandyShot(this, { x, y }, target, 240 + this.level.world * 15, resolution));
    playSound('whoosh');
  }

  private updateCandies(dt: number, centre: { x: number; y: number }): void {
    for (const candy of this.candies) {
      candy.update(dt);
      if (!candy.alive) continue;
      const p = candy.position;
      if (Math.hypot(p.x - centre.x, p.y - centre.y) < 52 && this.player.hurt(p.x)) {
        candy.pop();
        useGameStore.getState().loseHeart();
        continue;
      }
      // Bubbles pop candies too.
      for (const b of this.bubbles) {
        if (b.alive && Math.hypot(b.position.x - p.x, b.position.y - p.y) < 50) {
          b.pop();
          candy.pop();
          playSound('pop');
          break;
        }
      }
    }
    this.candies = this.candies.filter((c) => c.alive);
  }

  private onBefriend(): void {
    const store = useGameStore.getState();
    store.befriendThief();
    // A thank-you: three coins (five in challenge mode).
    for (let i = 0; i < (this.challenge ? 5 : 3); i++) this.time.delayedCall(250 + i * 150, () => useGameStore.getState().collectCoin());
    this.time.delayedCall(250, () => playSound('coin'));
    const session = useGameStore.getState().session;
    if (!this.finished && session && session.thievesBefriended >= session.thievesTotal) {
      this.finished = true;
      this.time.delayedCall(900, () => {
        this.guardLetter?.celebrate();
        playSound('win');
        celebrateLetter(letterIndex(this.level.letter!));
      });
      this.time.delayedCall(3600, () => {
        if (useGameStore.getState().session?.runId === this.runId) useGameStore.getState().completeLevel();
      });
    }
  }

  /** The bubble wand: each tool-button press blows a bubble that seeks the nearest thief. */
  private updateTools(dt: number): void {
    const presses = useInputStore.getState().actionPresses;
    if (presses !== this.seenActions) {
      this.seenActions = presses;
      if (useGameStore.getState().tool === 'bubble' && this.clock >= this.bubbleReadyAt && useGameStore.getState().screen === 'playing') {
        this.bubbleReadyAt = this.clock + BUBBLE_COOLDOWN;
        const from = { x: this.player.feet.x, y: this.player.feet.y - 80 };
        const nearest = () => {
          let best: Thief | null = null;
          let bestD = BUBBLE_RANGE;
          for (const t of this.thieves) {
            const d = t.active ? Math.hypot(t.position.x - from.x, t.position.y - from.y) : Infinity;
            if (d < bestD) [best, bestD] = [t, d];
          }
          return best;
        };
        const target = nearest();
        const dir = this.player.velocity.x < -5 ? -1 : 1;
        const resolution = (this.registry.get(ART_RESOLUTION_KEY) as number | undefined) ?? 1;
        this.bubbles.push(new BubbleShot(this, from.x, from.y, dir, resolution, () => (target?.active ? target.position : null)));
        playSound('pop');
      }
    }
    for (const b of this.bubbles) {
      b.update(dt);
      if (!b.alive) continue;
      for (const t of this.thieves) {
        if (t.tryCatch(b.position.x, b.position.y, 40)) {
          b.pop();
          break;
        }
      }
    }
    this.bubbles = this.bubbles.filter((b) => b.alive);
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
