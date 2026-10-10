import { useEffect } from 'react';
import { useInputStore } from '@/stores/useInputStore';

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);

/** Maps arrow keys / WASD / Space to the shared input store while `enabled`. */
export function useKeyboardControls(enabled: boolean): void {
  useEffect(() => {
    const input = useInputStore.getState();
    if (!enabled) {
      input.releaseAll();
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;

      if (LEFT_KEYS.has(event.code)) input.setLeft(true);
      else if (RIGHT_KEYS.has(event.code)) input.setRight(true);
      else if (JUMP_KEYS.has(event.code)) {
        if (!event.repeat) input.pressJump();
      } else return;
      // Stop the page scrolling on Space and the arrow keys.
      event.preventDefault();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (LEFT_KEYS.has(event.code)) input.setLeft(false);
      else if (RIGHT_KEYS.has(event.code)) input.setRight(false);
      else if (JUMP_KEYS.has(event.code)) input.releaseJump();
    };

    // Lifting a key while the tab is hidden never fires keyup, so release everything.
    const onBlur = () => input.releaseAll();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      input.releaseAll();
    };
  }, [enabled]);
}
