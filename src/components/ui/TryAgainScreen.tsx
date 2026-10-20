import { useGameStore } from '@/stores/useGameStore';
import { thiefSvg } from '@/game/art/thief';
import { toDataUri } from '@/game/art/svg';
import { HeartIcon, HomeIcon, ReplayIcon } from './icons';
import { MenuButton } from './PauseMenu';

let laughUri: string | null = null;

/**
 * Challenge mode, out of hearts: a cheeky thief giggles, and a big pulsing
 * "again" button. No "game over" words, no sad music.
 */
export default function TryAgainScreen() {
  const session = useGameStore((s) => s.session);
  const startLevel = useGameStore((s) => s.startLevel);
  const exitLevel = useGameStore((s) => s.exitLevel);
  if (!session) return null;
  laughUri ??= toDataUri(thiefSvg(false));

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-b from-violet-300/70 to-sky-300/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="حاول تاني">
      <div className="flex flex-col items-center gap-5 rounded-[2.5rem] bg-white/90 px-8 py-7 shadow-2xl">
        <img src={laughUri} alt="" className="size-32 animate-[wiggle_500ms_ease-in-out_infinite]" />
        <div dir="ltr" className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <HeartIcon key={i} size={44} filled={false} style={{ filter: 'drop-shadow(0 1px 0 #f9a8d4)' }} />
          ))}
        </div>
        <div dir="ltr" className="mt-1 flex items-center gap-5">
          <MenuButton label="الرئيسية" onClick={exitLevel} className="size-18 bg-violet-400">
            <HomeIcon size={36} />
          </MenuButton>
          <MenuButton label="حاول تاني" onClick={() => startLevel(session.levelId, session.mode)} className="size-24 bg-emerald-500 animate-[gentle-pulse_1.6s_ease-in-out_infinite]">
            <ReplayIcon size={48} />
          </MenuButton>
        </div>
      </div>
    </div>
  );
}
