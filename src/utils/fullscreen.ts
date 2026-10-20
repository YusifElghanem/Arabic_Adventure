import { useEffect, useState } from 'react';

/**
 * Fullscreen helpers (with the webkit prefix for older Safari). iPhone
 * Safari has no fullscreen API at all, so the button hides itself there.
 */

type WebkitDocument = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void };

const doc = () => (typeof document === 'undefined' ? undefined : (document as WebkitDocument));

export const canFullscreen = (): boolean => !!(doc()?.fullscreenEnabled || doc()?.webkitFullscreenEnabled);
export const isFullscreen = (): boolean => !!(doc()?.fullscreenElement || doc()?.webkitFullscreenElement);

export function toggleFullscreen(): void {
  const d = doc();
  if (!d) return;
  try {
    if (isFullscreen()) {
      if (d.exitFullscreen) void d.exitFullscreen().catch(() => {});
      else d.webkitExitFullscreen?.();
      return;
    }
    const el = d.documentElement as WebkitElement;
    if (el.requestFullscreen) {
      void el
        .requestFullscreen({ navigationUI: 'hide' })
        // Phones: prefer landscape while in fullscreen (ignored where unsupported).
        .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
        .catch(() => {});
    } else el.webkitRequestFullscreen?.();
  } catch {
    // Fullscreen is a convenience; never break the game over it.
  }
}

/** Re-renders when fullscreen is entered or left (also via the Esc key). */
export function useFullscreen(): boolean {
  const [on, setOn] = useState(isFullscreen);
  useEffect(() => {
    const update = () => setOn(isFullscreen());
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      document.removeEventListener('webkitfullscreenchange', update);
    };
  }, []);
  return on;
}
