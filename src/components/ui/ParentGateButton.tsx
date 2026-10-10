import { useEffect, useRef, useState } from 'react';
import { ParentIcon } from './icons';

/**
 * A press-and-hold button (1.2 s) for grown-up settings. Little ones tapping
 * around can't open the photo upload by accident.
 */
const HOLD_MS = 1200;

export default function ParentGateButton({ onUnlock }: { onUnlock: () => void }) {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);

  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    startedAt.current = null;
    setProgress(0);
  };

  const tick = () => {
    if (startedAt.current === null) return;
    const p = Math.min(1, (performance.now() - startedAt.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      stop();
      onUnlock();
      return;
    }
    frame.current = requestAnimationFrame(tick);
  };

  useEffect(() => stop, []);

  const r = 26;
  const circumference = 2 * Math.PI * r;

  return (
    <button
      type="button"
      aria-label="للوالدين: اضغط مطولًا لإضافة صورة الطفل"
      title="للوالدين: اضغط مطولًا"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        startedAt.current = performance.now();
        frame.current = requestAnimationFrame(tick);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        // Keyboard users (grown-ups) can open it directly.
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onUnlock();
        }
      }}
      className="relative grid size-16 touch-none place-items-center rounded-full bg-white/80 text-sky-700 shadow-lg ring-2 ring-white transition active:scale-95"
    >
      <svg className="absolute inset-0" viewBox="0 0 64 64" aria-hidden>
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform="rotate(-90 32 32)"
          opacity={progress > 0 ? 1 : 0}
        />
      </svg>
      <ParentIcon size={30} />
    </button>
  );
}
