import { AIR_ACCEL, COYOTE_TIME, GROUND_ACCEL, JUMP_BUFFER, JUMP_SPEED, MAX_FALL_SPEED, MOVE_SPEED } from '../constants';

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
}

export const createControllerState = (jumpPresses = 0): ControllerState => ({
  lastGroundedAt: -Infinity,
  jumpBufferedAt: -Infinity,
  seenJumpPresses: jumpPresses,
});

export function stepController(state: ControllerState, input: ControllerInput, body: BodyReading): ControllerOutput {
  const { now, dt, grounded } = body;
  if (grounded) state.lastGroundedAt = now;

  // Horizontal: accelerate towards the target speed, never snapping.
  const target = Math.max(-1, Math.min(1, input.axis)) * MOVE_SPEED;
  const accel = (grounded ? GROUND_ACCEL : AIR_ACCEL) * dt;
  let vx = body.vx + Math.max(-accel, Math.min(accel, target - body.vx));
  if (Math.abs(vx) < 1) vx = 0;

  // Vertical: buffered jump plus coyote time. Every jump is a full jump:
  // small children tap rather than hold.
  if (input.jumpPresses !== state.seenJumpPresses) {
    state.seenJumpPresses = input.jumpPresses;
    state.jumpBufferedAt = now;
  }
  let vy = Math.min(body.vy, MAX_FALL_SPEED);
  let jumped = false;
  if (now - state.jumpBufferedAt <= JUMP_BUFFER && now - state.lastGroundedAt <= COYOTE_TIME) {
    vy = -JUMP_SPEED;
    jumped = true;
    state.jumpBufferedAt = -Infinity;
    state.lastGroundedAt = -Infinity;
  }
  return { vx, vy, jumped };
}
