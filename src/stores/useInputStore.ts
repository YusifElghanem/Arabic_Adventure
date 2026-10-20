import { create } from 'zustand';

/**
 * Directional and jump input from the keyboard and the on-screen touch
 * buttons. <Player> reads it once per frame with `getState()`, so input
 * never re-renders the 3D scene.
 */
interface InputState {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  /** Increments on every new jump press, so quick taps between frames are never lost. */
  jumpPresses: number;
  /** Increments on every tool-button press (bubble wand). */
  actionPresses: number;
  setLeft: (pressed: boolean) => void;
  setRight: (pressed: boolean) => void;
  pressJump: () => void;
  releaseJump: () => void;
  pressAction: () => void;
  releaseAll: () => void;
}

export const useInputStore = create<InputState>()((set) => ({
  left: false,
  right: false,
  jumpHeld: false,
  jumpPresses: 0,
  actionPresses: 0,
  setLeft: (pressed) => set({ left: pressed }),
  setRight: (pressed) => set({ right: pressed }),
  pressJump: () =>
    set((state) => (state.jumpHeld ? state : { jumpHeld: true, jumpPresses: state.jumpPresses + 1 })),
  releaseJump: () => set({ jumpHeld: false }),
  pressAction: () => set((state) => ({ actionPresses: state.actionPresses + 1 })),
  releaseAll: () => set({ left: false, right: false, jumpHeld: false }),
}));

/** Horizontal intent in [-1, 1]. Holding both directions cancels out. */
export const horizontalAxis = (state: Pick<InputState, 'left' | 'right'>): number =>
  (state.right ? 1 : 0) - (state.left ? 1 : 0);
