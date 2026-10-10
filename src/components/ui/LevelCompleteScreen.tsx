import { isLevelAvailable } from '@/game/levels';
import { ARABIC_LETTERS, MAX_STARS_PER_LEVEL, computeAwardedStars, useGameStore } from '@/stores/useGameStore';
import { HomeIcon, NextIcon, ReplayIcon, StarIcon, SunIcon } from './icons';
import { MenuButton } from './PauseMenu';

/** Celebration overlay: a dancing sun, stars popping in one by one, and big icon buttons. */
export default function LevelCompleteScreen() {
  const session = useGameStore((s) => s.session);
  const startLevel = useGameStore((s) => s.startLevel);
  const exitLevel = useGameStore((s) => s.exitLevel);
  const isLevelUnlocked = useGameStore((s) => s.isLevelUnlocked);
  const lettersDiscovered = useGameStore((s) => s.lettersDiscovered);

  if (!session) return null;
  // Show letters in alphabet order, not the order they were found.
  const letters = ARABIC_LETTERS.filter((letter) => lettersDiscovered.includes(letter));
  const awarded = computeAwardedStars(session);
  const nextLevel = session.levelId + 1;
  const hasNext = isLevelAvailable(nextLevel) && isLevelUnlocked(nextLevel);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-b from-amber-200/70 to-sky-300/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="أحسنت">
      <div className="flex flex-col items-center gap-5 rounded-[2.5rem] bg-white/90 px-8 py-7 shadow-2xl">
        <SunIcon size={120} className="animate-[sun-dance_2s_ease-in-out_infinite]" />

        <div dir="ltr" className="flex items-end gap-2">
          {Array.from({ length: MAX_STARS_PER_LEVEL }, (_, i) => (
            <StarIcon
              key={i}
              size={i === 1 ? 84 : 68}
              filled={i < awarded}
              className="opacity-0 drop-shadow-lg"
              style={{ animation: `star-pop 600ms cubic-bezier(.34,1.56,.64,1) ${300 + i * 350}ms forwards` }}
            />
          ))}
        </div>

        {letters.length > 0 && (
          <div dir="rtl" className="flex gap-3" aria-label="الحروف">
            {letters.map((letter) => (
              <span
                key={letter}
                className="grid size-16 place-items-center rounded-2xl bg-sky-100 font-display text-4xl font-bold text-sky-700 shadow-inner"
              >
                {letter}
              </span>
            ))}
          </div>
        )}

        <div dir="ltr" className="mt-1 flex items-center gap-5">
          <MenuButton label="الرئيسية" onClick={exitLevel} className="size-18 bg-violet-400">
            <HomeIcon size={36} />
          </MenuButton>
          <MenuButton label="العب مرة أخرى" onClick={() => startLevel(session.levelId)} className="size-18 bg-amber-400">
            <ReplayIcon size={36} />
          </MenuButton>
          {hasNext && (
            <MenuButton label="المرحلة التالية" onClick={() => startLevel(nextLevel)} className="size-24 bg-emerald-500">
              <NextIcon size={48} />
            </MenuButton>
          )}
        </div>
      </div>
    </div>
  );
}
