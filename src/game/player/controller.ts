import { AIR_ACCEL, AIR_JUMPS, COYOTE_TIME, DOUBLE_JUMP_SPEED, GROUND_ACCEL, JUMP_BUFFER, JUMP_SPEED, MAX_FALL_SPEED, MOVE_SPEED } from '../constants';

/**
 * The platformer controller as a pure function of (state, input, physics
 * readings) → new velocity. It has no Phaser dependency, so its feel (soft
 * acceleration, coyote time, jump buffering) is unit tested.
 */

export interface ControllerState {
  /** Seconds timestamp of the last frame the player stood on something. */
  lastGroundedAt: number;
  /** Seconds timestamp of the last unconsumed jump press. */
  jumpBufferedAt: number;
  /** Input jump-press counter value already seen. */
  seenJumpPresses: number;
  /** Double jumps left before touching the ground again. */
  airJumpsLeft: number;
}

export interface ControllerInput {
  /** -1..1 horizontal intent. */
  axis: number;
  /** Monotonic counter of jump presses (see useInputStore). */
  jumpPresses: number;
}

export interface BodyReading {
  vx: number;
  vy: number;
  grounded: boolean;
  /** Current time in seconds. */
  now: number;
  /** Frame time in seconds. */
  dt: number;
}

export interface ControllerOutput {
  vx: number;
  vy: number;
  jumped: boolean;
  /** True when this jump was the mid-air double jump. */
  doubleJumped: boolean;
}

export const createControllerState = (jumpPresses = 0): ControllerState => ({
  lastGroundedAt: -Infinity,
  jumpBufferedAt: -Infinity,
  seenJumpPresses: jumpPresses,
  airJumpsLeft: AIR_JUMPS,
});

export function stepController(state: ControllerState, input: ControllerInput, body: BodyReading): ControllerOutput {
  const { now, dt, grounded } = body;
  if (grounded) {
    state.lastGroundedAt = now;
    state.airJumpsLeft = AIR_JUMPS;
  }

  // Horizontal: accelerate towards the target speed, never snapping.
  const target = Math.max(-1, Math.min(1, input.axis)) * MOVE_SPEED;
  const accel = (grounded ? GROUND_ACCEL : AIR_ACCEL) * dt;
  let vx = body.vx + Math.max(-accel, Math.min(accel, target - body.vx));
  if (Math.abs(vx) < 1) vx = 0;

  // Vertical: buffered jump plus coyote time. Every jump is a full jump:
  // small children tap rather than hold.
  const freshPress = input.jumpPresses !== state.seenJumpPresses;
  if (freshPress) {
    state.seenJumpPresses = input.jumpPresses;
    state.jumpBufferedAt = now;
  }
  let vy = Math.min(body.vy, MAX_FALL_SPEED);
  let jumped = false;
  let doubleJumped = false;
  if (now - state.jumpBufferedAt <= JUMP_BUFFER && now - state.lastGroundedAt <= COYOTE_TIME) {
    vy = -JUMP_SPEED;
    jumped = true;
    state.jumpBufferedAt = -Infinity;
    state.lastGroundedAt = -Infinity;
  } else if (freshPress && !grounded && state.airJumpsLeft > 0) {
    // Only a fresh press in the air double-jumps, so a press buffered just
    // before landing still becomes a normal ground jump once the double is spent.
    vy = -DOUBLE_JUMP_SPEED;
    jumped = doubleJumped = true;
    state.airJumpsLeft--;
    state.jumpBufferedAt = -Infinity;
  }
  return { vx, vy, jumped, doubleJumped };
}
