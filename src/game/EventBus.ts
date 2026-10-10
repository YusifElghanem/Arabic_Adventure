/**
 * Typed event bus between the Phaser game and the React UI.
 *
 * This file deliberately has no Phaser import, so React code can listen to
 * game events without pulling the engine into the main bundle. (Phaser is
 * lazy-loaded when a level starts.)
 */

export interface GameEvents {
  /** Asset loading progress, 0..1. */
  'preload-progress': [progress: number];
  /** A level scene finished building and is on screen. */
  'level-ready': [levelId: number];
}

type Listener<K extends keyof GameEvents> = (...args: GameEvents[K]) => void;

/** Listeners are stored type-erased; the public methods restore the types. */
type ErasedListener = (...args: unknown[]) => void;

export class TypedEventBus<Events extends { [K in keyof Events]: unknown[] }> {
  private listeners = new Map<keyof Events, Set<ErasedListener>>();

  /** Subscribes to an event. Returns an unsubscribe function. */
  on<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as unknown as ErasedListener);
    return () => this.off(event, listener);
  }

  /** Subscribes for a single emission. */
  once<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): () => void {
    const off = this.on(event, (...args) => {
      off();
      listener(...args);
    });
    return off;
  }

  off<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): void {
    this.listeners.get(event)?.delete(listener as unknown as ErasedListener);
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    // Copy first so listeners can unsubscribe while being called.
    for (const listener of [...(this.listeners.get(event) ?? [])]) {
      try {
        listener(...args);
      } catch (error) {
        console.error(`[EventBus] listener for "${String(event)}" failed`, error);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const EventBus = new TypedEventBus<GameEvents>();
export type { Listener };

