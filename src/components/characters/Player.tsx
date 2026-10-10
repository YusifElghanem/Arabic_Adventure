import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier';
import { MathUtils, Vector3 } from 'three';
import {
  AIR_ACCEL,
  COYOTE_TIME,
  GROUND_ACCEL,
  JUMP_BUFFER,
  JUMP_SPEED,
  KILL_Y,
  MAX_FALL_SPEED,
  MOVE_SPEED,
  PLAYER_FOOT_OFFSET,
  PLAYER_HALF_HEIGHT,
  PLAYER_KIND,
  PLAYER_RADIUS,
  RESPAWN_DURATION,
} from '@/game/constants';
import { playerTracker } from '@/game/playerTracker';
import { horizontalAxis, useInputStore } from '@/stores/useInputStore';
import { useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import PlayerAvatar, { createAvatarMotion, type AvatarMotion } from './PlayerAvatar';

/**
 * The playable character: a dynamic Rapier capsule locked to the 2.5D plane
 * (no Z movement, no tipping over), with a tuned platformer controller and a
 * friendly fail-safe. Falling off the world floats the child back to the
 * start inside a bubble. Nothing is lost and there is no penalty.
 */

interface PlayerProps {
  spawn: [number, number, number];
}

const GROUND_PROBE = 0.12;
const PROBE_OFFSETS = [0, -PLAYER_RADIUS * 0.7, PLAYER_RADIUS * 0.7];

interface ControllerState {
  lastGroundedAt: number;
  jumpBufferedAt: number;
  seenJumpPresses: number;
  wasGrounded: boolean;
  respawn: { from: Vector3; elapsed: number } | null;
}

export default function Player({ spawn }: PlayerProps) {
  const body = useRef<RapierRigidBody>(null);
  const motion = useRef<AvatarMotion>(createAvatarMotion());
  const { world, rapier } = useRapier();
  const spawnVec = useMemo(() => new Vector3(...spawn), [spawn]);
  const scratch = useMemo(() => ({ pos: new Vector3() }), []);
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }), [rapier]);
  const ctrl = useRef<ControllerState>({
    lastGroundedAt: -Infinity,
    jumpBufferedAt: -Infinity,
    seenJumpPresses: useInputStore.getState().jumpPresses,
    wasGrounded: false,
    respawn: null,
  });

  useEffect(() => {
    playerTracker.reset(spawnVec);
  }, [spawnVec]);

  const isGrounded = (rb: RapierRigidBody): boolean => {
    const p = rb.translation();
    for (const dx of PROBE_OFFSETS) {
      ray.origin = { x: p.x + dx, y: p.y, z: p.z };
      const hit = world.castRay(
        ray,
        PLAYER_FOOT_OFFSET + GROUND_PROBE,
        true,
        rapier.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        undefined,
        rb,
      );
      if (hit) return true;
    }
    return false;
  };

  const beginRespawn = (rb: RapierRigidBody) => {
    const p = rb.translation();
    ctrl.current.respawn = { from: new Vector3(p.x, p.y, p.z), elapsed: 0 };
    rb.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    playerTracker.respawning = true;
    useInputStore.getState().releaseAll();
    playSound('whoosh');
  };

  const stepRespawn = (rb: RapierRigidBody, dt: number) => {
    const r = ctrl.current.respawn!;
    r.elapsed += dt;
    const t = Math.min(1, r.elapsed / RESPAWN_DURATION);
    const eased = t * t * (3 - 2 * t);
    // Float back along a gentle arc to the start.
    scratch.pos.lerpVectors(r.from, spawnVec, eased);
    scratch.pos.y += Math.sin(Math.PI * eased) * 3;
    rb.setNextKinematicTranslation(scratch.pos);

    if (t >= 1) {
      rb.setBodyType(rapier.RigidBodyType.Dynamic, true);
      rb.setTranslation(spawnVec, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      ctrl.current.respawn = null;
      playerTracker.respawning = false;
      playerTracker.pendingLaunch = null;
    }
  };

  useFrame((state, delta) => {
    const rb = body.current;
    if (!rb) return;
    const dt = Math.min(delta, 0.05);
    const now = state.clock.elapsedTime;
    const c = ctrl.current;
    const playing = useGameStore.getState().screen === 'playing';

    if (c.respawn) {
      if (playing) stepRespawn(rb, dt);
    } else if (rb.translation().y < KILL_Y) {
      beginRespawn(rb);
    } else if (playing) {
      const input = useInputStore.getState();
      const velocity = rb.linvel();
      const grounded = isGrounded(rb) && velocity.y <= 0.6;
      if (grounded) {
        c.lastGroundedAt = now;
        if (!c.wasGrounded && velocity.y < -4) playSound('land');
      }
      c.wasGrounded = grounded;

      // Horizontal: accelerate towards the target speed for a soft, forgiving feel.
      const target = horizontalAxis(input) * MOVE_SPEED;
      const accel = (grounded ? GROUND_ACCEL : AIR_ACCEL) * dt;
      let vx = velocity.x + MathUtils.clamp(target - velocity.x, -accel, accel);
      if (Math.abs(vx) < 0.01) vx = 0;

      // Vertical: buffered jump plus coyote time. Every jump is a full jump:
      // small children tap rather than hold, so there is no variable height.
      let vy = Math.max(velocity.y, -MAX_FALL_SPEED);
      if (input.jumpPresses !== c.seenJumpPresses) {
        c.seenJumpPresses = input.jumpPresses;
        c.jumpBufferedAt = now;
      }
      if (now - c.jumpBufferedAt <= JUMP_BUFFER && now - c.lastGroundedAt <= COYOTE_TIME) {
        vy = JUMP_SPEED;
        c.jumpBufferedAt = -Infinity;
        c.lastGroundedAt = -Infinity;
        playSound('jump');
      }

      // Mechanics (e.g. the Letter B trampoline) can launch the player.
      if (playerTracker.pendingLaunch !== null) {
        vy = playerTracker.pendingLaunch;
        playerTracker.pendingLaunch = null;
      }

      rb.setLinvel({ x: vx, y: vy, z: 0 }, true);

      const m = motion.current;
      m.speed = Math.min(1, Math.abs(vx) / MOVE_SPEED);
      m.vy = vy;
      m.grounded = grounded;
      if (Math.abs(target) > 0.1) m.facing = Math.sign(target);
      else if (grounded && m.speed < 0.2) m.facing = 0;
      playerTracker.grounded = grounded;
    }

    const p = rb.translation();
    const v = rb.linvel();
    playerTracker.position.set(p.x, p.y, p.z);
    playerTracker.velocity.set(v.x, v.y, v.z);
    motion.current.respawning = c.respawn !== null;
    if (c.respawn) motion.current.grounded = false;
  });

  return (
    <RigidBody
      ref={body}
      position={spawn}
      colliders={false}
      enabledRotations={[false, false, false]}
      enabledTranslations={[true, true, false]}
      ccd
      canSleep={false}
      linearDamping={0}
      userData={{ kind: PLAYER_KIND }}
    >
      {/* Zero friction stops the capsule sticking to walls; the controller handles braking. */}
      <CapsuleCollider args={[PLAYER_HALF_HEIGHT, PLAYER_RADIUS]} friction={0} restitution={0} />
      <group position={[0, -PLAYER_FOOT_OFFSET, 0]}>
        <PlayerAvatar motion={motion} />
      </group>
    </RigidBody>
  );
}
