/** Physics and feel tuning. Gentle values: the audience is 3–6 years old. */

export const GRAVITY = -22;

export const PLAYER_RADIUS = 0.35;
/** Half the length of the capsule's straight section. Total height = 2 * (half + radius) = 1.4. */
export const PLAYER_HALF_HEIGHT = 0.35;
export const PLAYER_FOOT_OFFSET = PLAYER_HALF_HEIGHT + PLAYER_RADIUS;

export const MOVE_SPEED = 5.2;
export const GROUND_ACCEL = 40;
export const AIR_ACCEL = 26;
/** Jump apex = JUMP_SPEED² / (2·|GRAVITY|) ≈ 2.05 units. */
export const JUMP_SPEED = 9.5;
/** Seconds after leaving a ledge during which a jump still counts. */
export const COYOTE_TIME = 0.2;
/** Seconds a jump press is remembered before landing. */
export const JUMP_BUFFER = 0.16;
export const MAX_FALL_SPEED = 22;

/** Falling below this height triggers the friendly respawn. */
export const KILL_Y = -9;
export const RESPAWN_DURATION = 1.1;

/** Identifies the player's rigid body in collision payloads. */
export const PLAYER_KIND = 'player';
