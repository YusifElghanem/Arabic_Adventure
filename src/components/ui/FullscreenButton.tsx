import { playSound, unlockAudio } from '@/utils/sound';
import { canFullscreen, toggleFullscreen, useFullscreen } from '@/utils/fullscreen';
import { ExitFullscreenIcon, FullscreenIcon } from './icons';

/** Round icon button that toggles fullscreen; hidden where unsupported (iPhone). */
export default function FullscreenButton({ className = '' }: { className?: string }) {
  const on = useFullscreen();
  if (!canFullscreen()) return null;
  return (
    <button
      type="button"
      aria-label={on ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}
      onClick={() => {
        unlockAudio();
        playSound('tap');
        toggleFullscreen();
      }}
      className={`grid size-16 place-items-center rounded-full bg-white/80 text-sky-700 shadow-lg ring-2 ring-white transition active:scale-95 ${className}`}
    >
      {on ? <ExitFullscreenIcon size={30} /> : <FullscreenIcon size={30} />}
    </button>
  );
}
