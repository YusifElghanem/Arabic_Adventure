import Phaser from 'phaser';
import { useGameStore, type Outfit } from '@/stores/useGameStore';
import { horizontalAxis, useInputStore } from '@/stores/useInputStore';
import { playSound } from '@/utils/sound';
import { ArtKeys } from '../art';
import { MOVE_SPEED, PLAYER_BODY, RESPAWN_DURATION } from '../constants';
import { Depth } from '../world/depths';
import { createControllerState, stepController, type ControllerState } from './controller';
import PlayerPuppet, { PHOTO_FACE_KEY, type PuppetMotion } from './PlayerPuppet';

/**
 * The playable child: an invisible Arcade Physics body that the controller
 * drives, plus the puppet drawn at its feet.
 *
 * Fail-safe: falling below `killY` (into the cloud sea) never costs
 * anything. The child floats back to the start inside a bubble, with input
 * disabled for the trip.
 */

export interface PlayerOptions {
  spawn: { x: number; y: number };
  killY: number;
  resolution: number;
  /** Called when the child falls into the cloud sea (challenge mode costs a heart). */
  onFall?: () => void;
}

export default class Player {
  readonly zone: Phaser.GameObjects.Zone;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly puppet: PlayerPuppet;
  private readonly scene: Phaser.Scene;
  private readonly options: PlayerOptions;
  private readonly ctrl: ControllerState;
  private readonly motion: PuppetMotion = { speed: 0, vy: 0, grounded: false, facing: 0, respawning: false };
  private readonly dust?: Phaser.GameObjects.Particles.ParticleEmitter;
  private pendingLaunch: number | null = null;
  private respawnTween: Phaser.Tweens.Tween | null = null;
  private wasGrounded = false;
  private clock = 0;
  private invulnerableUntil = 0;
  private knockUntil = 0;
  private unsubscribe: () => void;

  constructor(scene: Phaser.Scene, options: PlayerOptions) {
    this.scene = scene;
    this.options = options;
    const { spawn, resolution } = options;

    this.zone = scene.add.zone(spawn.x, spawn.y - PLAYER_BODY.height / 2, PLAYER_BODY.width, PLAYER_BODY.height);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocityY(2400);

    const state = useGameStore.getState();
    this.puppet = new PlayerPuppet(scene, spawn.x, spawn.y, state.outfit, resolution);
    this.ctrl = createControllerState(useInputStore.getState().jumpPresses);

    this.dust = scene.add
      .particles(0, 0, ArtKeys.sparkle, {
        lifespan: 420,
        speed: { min: 60, max: 150 },
        angle: { min: 200, max: 340 },
        gravityY: 300,
        scale: { start: 0.55 / resolution, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xffffff, 0xffe3f1, 0xfff6c2],
        emitting: false,
      })
      .setDepth(Depth.player - 1);

    this.loadFace(state.faceTextureUrl);
    // Outfit and photo can change while playing (e.g. from another tab); follow along.
    this.unsubscribe = useGameStore.subscribe((s, prev) => {
      if (s.outfit !== prev.outfit) this.setOutfit(s.outfit);
      if (s.faceTextureUrl !== prev.faceTextureUrl) this.loadFace(s.faceTextureUrl);
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe());
  }

  /** Feet position (bottom centre of the body). */
  get feet(): { x: number; y: number } {
    return { x: this.body.center.x, y: this.body.bottom };
  }

  get respawning(): boolean {
    return this.respawnTween !== null;
  }

  get velocity(): Phaser.Math.Vector2 {
    return this.body.velocity;
  }

  /** True for a moment after being hit (the child blinks). */
  get invulnerable(): boolean {
    return this.clock < this.invulnerableUntil || this.respawning;
  }

  /**
   * Challenge mode: hit by a candy. A soft knock-back and 1.6 s of blinking
   * during which nothing can hit again. Returns false if already blinking.
   */
  hurt(fromX: number): boolean {
    if (this.invulnerable) return false;
    this.invulnerableUntil = this.clock + 1.6;
    this.knockUntil = this.clock + 0.25;
    const dir = this.feet.x < fromX ? -1 : 1;
    this.body.setVelocity(dir * 300, -420);
    playSound('bump');
    this.scene.tweens.add({ targets: this.puppet.container, alpha: 0.25, duration: 100, yoyo: true, repeat: 7, onComplete: () => this.puppet.container.setAlpha(1) });
    return true;
  }

  /** Shoot the player upwards (the ب trampoline). */
  launch(verticalSpeed: number): void {
    if (!this.respawning) this.pendingLaunch = verticalSpeed;
  }

  private setOutfit(outfit: Outfit): void {
    this.puppet.setOutfit(outfit);
  }

  /** Loads the child's photo into a texture (data URL → base64 texture). */
  private loadFace(url: string | null): void {
    const textures = this.scene.textures;
    if (!url) {
      this.puppet.setPhotoFace(false);
      return;
    }
    // Same photo as last time (e.g. after "play again"): reuse the texture.
    if (textures.exists(PHOTO_FACE_KEY) && this.scene.registry.get('photoFaceUrl') === url) {
      this.puppet.setPhotoFace(true);
      return;
    }
    if (textures.exists(PHOTO_FACE_KEY)) textures.remove(PHOTO_FACE_KEY);
    const onAdd = (key: string) => {
      if (key !== PHOTO_FACE_KEY) return;
      textures.off(Phaser.Textures.Events.ADD, onAdd);
      this.scene.registry.set('photoFaceUrl', url);
      if (this.scene.sys.isActive() || this.scene.sys.isPaused()) this.puppet.setPhotoFace(true);
    };
    textures.on(Phaser.Textures.Events.ADD, onAdd);
    textures.once(Phaser.Textures.Events.ERROR, () => textures.off(Phaser.Textures.Events.ADD, onAdd));
    textures.addBase64(PHOTO_FACE_KEY, url);
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.clock += dt;

    if (!this.respawning && this.body.bottom > this.options.killY) this.beginRespawn();

    if (!this.respawning) {
      const input = useInputStore.getState();
      const grounded = this.body.blocked.down || this.body.touching.down;
      // A knock-back flies its course before the controls take over again.
      const knocked = this.clock < this.knockUntil;
      const out = stepController(
        this.ctrl,
        { axis: horizontalAxis(input), jumpPresses: input.jumpPresses },
        { vx: this.body.velocity.x, vy: this.body.velocity.y, grounded, now: this.clock, dt },
      );
      let vy = out.vy;
      if (out.doubleJumped) {
        playSound('boing');
        this.puff(8);
      } else if (out.jumped) {
        playSound('jump');
        this.puff(5);
      }
      if (this.pendingLaunch !== null) {
        vy = -this.pendingLaunch;
        this.pendingLaunch = null;
      }
      if (!knocked) this.body.setVelocity(out.vx, vy);

      if (grounded && !this.wasGrounded && this.motion.vy > 500) {
        playSound('land');
        this.puff(8);
      }
      this.wasGrounded = grounded;

      this.motion.speed = Math.min(1, Math.abs(out.vx) / MOVE_SPEED);
      this.motion.vy = this.body.velocity.y;
      this.motion.grounded = grounded;
      const axis = horizontalAxis(input);
      if (axis !== 0) this.motion.facing = axis;
      else if (grounded && this.motion.speed < 0.15) this.motion.facing = 0;
    }

    this.motion.respawning = this.respawning;
    const { x, y } = this.feet;
    this.puppet.setPosition(x, y);
    this.puppet.update(delta, this.motion);
    void time;
  }

  private puff(count: number): void {
    const { x, y } = this.feet;
    this.dust?.explode(count, x, y - 4);
  }

  private beginRespawn(): void {
    this.options.onFall?.();
    const from = new Phaser.Math.Vector2(this.feet.x, this.feet.y);
    const to = new Phaser.Math.Vector2(this.options.spawn.x, this.options.spawn.y);
    const control = new Phaser.Math.Vector2((from.x + to.x) / 2, Math.min(from.y, to.y) - 320);
    const curve = new Phaser.Curves.QuadraticBezier(from, control, to);
    const point = new Phaser.Math.Vector2();

    this.body.setVelocity(0, 0);
    this.body.setEnable(false);
    this.motion.grounded = false;
    this.motion.speed = 0;
    this.motion.facing = 0;
    useInputStore.getState().releaseAll();
    playSound('whoosh');
    // Rise above the cloud sea so the child can watch the bubble float home.
    this.puppet.container.setDepth(Depth.cloudSea + 1);

    const progress = { t: 0 };
    this.respawnTween = this.scene.tweens.add({
      targets: progress,
      t: 1,
      duration: RESPAWN_DURATION * 1000,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        curve.getPoint(progress.t, point);
        this.zone.setPosition(point.x, point.y - PLAYER_BODY.height / 2);
      },
      onComplete: () => {
        this.zone.setPosition(to.x, to.y - PLAYER_BODY.height / 2);
        this.body.setEnable(true);
        this.body.reset(to.x, to.y - PLAYER_BODY.height / 2);
        this.respawnTween = null;
        this.wasGrounded = false;
        this.puppet.container.setDepth(Depth.player);
        playSound('pop');
        this.puff(10);
      },
    });
  }
}
