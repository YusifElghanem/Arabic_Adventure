import { Vector3 } from 'three';
import type { CollisionTarget } from '@react-three/rapier';
import { PLAYER_KIND } from './constants';

/**
 * Mutable, render-loop-friendly view of the player, shared with the camera
 * and level mechanics. Updated every frame by <Player>, so it lives outside
 * React and Zustand: updating them 60 times a second would cause needless
 * re-renders.
 */
export const playerTracker = {
  position: new Vector3(),
  velocity: new Vector3(),
  grounded: false,
  respawning: false,
  /** Set by mechanics such as the Letter B trampoline; consumed by <Player>. */
  pendingLaunch: null as number | null,

  /** Ask the player to shoot upwards with the given vertical speed. */
  launch(verticalSpeed: number) {
    this.pendingLaunch = verticalSpeed;
  },

  reset(spawn: Vector3) {
    this.position.copy(spawn);
    this.velocity.set(0, 0, 0);
    this.grounded = false;
    this.respawning = false;
    this.pendingLaunch = null;
  },
};

/** True when a collision target is the player's rigid body. */
export function isPlayer(target: CollisionTarget | undefined): boolean {
  const data = target?.rigidBody?.userData as { kind?: string } | undefined;
  return data?.kind === PLAYER_KIND;
}
