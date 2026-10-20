import { useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import { HomeIcon, PlayIcon, ReplayIcon } from './icons';
import FullscreenButton from './FullscreenButton';

/** Icon-only pause overlay: resume (big), restart, home. */
export default function PauseMenu() {
  const resumeGame = useGameStore((s) => s.resumeGame);
  const startLevel = useGameStore((s) => s.startLevel);
  const exitLevel = useGameStore((s) => s.exitLevel);
  const levelId = useGameStore((s) => s.session?.levelId ?? 1);
  const mode = useGameStore((s) => s.session?.mode ?? 'adventure');

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-sky-900/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="إيقاف مؤقت">
      <div dir="ltr" className="flex items-center gap-6 rounded-[2.5rem] bg-white/90 p-6 shadow-2xl sm:gap-8 sm:p-8">
        <MenuButton label="الرئيسية" onClick={() => exitLevel()} className="size-20 bg-violet-400">
          <HomeIcon size={40} />
        </MenuButton>
        <MenuButton label="متابعة" onClick={() => resumeGame()} className="size-28 bg-emerald-500 animate-[gentle-pulse_1.6s_ease-in-out_infinite]">
          <PlayIcon size={60} />
        </MenuButton>
        <MenuButton label="إعادة" onClick={() => startLevel(levelId, mode)} className="size-20 bg-amber-400">
          <ReplayIcon size={40} />
        </MenuButton>
      </div>
      <FullscreenButton className="absolute right-4 top-4" />
    </div>
  );
}

export function MenuButton({ label, onClick, className = '', children }: { label: string; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        playSound('tap');
        onClick();
      }}
      className={`grid place-items-center rounded-full text-white shadow-xl ring-4 ring-white transition hover:brightness-105 active:scale-90 ${className}`}
    >
      {children}
    </button>
  );
}
