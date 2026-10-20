import { useGameStore } from '@/stores/useGameStore';
import { LETTERS, letterForLevel } from '@/game/letters';
import { LEVEL_COUNT } from '@/stores/useGameStore';
import { playSound, unlockAudio } from '@/utils/sound';
import { CloseIcon, StarIcon } from './icons';

/**
 * Level select: every letter as a big candy tile (all open), with the stars
 * already earned. The next level to play gently pulses.
 */
export default function LevelSelect({ onClose }: { onClose: () => void }) {
  const startLevel = useGameStore((s) => s.startLevel);
  const levelRecords = useGameStore((s) => s.levelRecords);
  const unlockedLevels = useGameStore((s) => s.unlockedLevels);
  const next = Math.max(1, ...unlockedLevels);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col bg-gradient-to-b from-sky-300 to-emerald-100"
      role="dialog"
      aria-modal="true"
      aria-label="اختر المرحلة"
    >
      <div dir="ltr" className="flex shrink-0 justify-end p-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <button
          type="button"
          aria-label="رجوع"
          onClick={() => {
            playSound('tap');
            onClose();
          }}
          className="grid size-16 place-items-center rounded-full bg-white/85 text-sky-700 shadow-lg ring-2 ring-white transition active:scale-95"
        >
          <CloseIcon size={30} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div dir="rtl" className="mx-auto grid max-w-4xl pt-2 grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-4">
          {Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1).map((id) => {
            const spec = letterForLevel(id);
            const label = spec ? spec.letter : `${LETTERS[0].letter} ${LETTERS[1].letter}`;
            const color = spec?.color ?? LETTERS[1].color;
            const stars = levelRecords[id]?.bestStars ?? 0;
            return (
              <button
                key={id}
                type="button"
                aria-label={`المرحلة ${id}`}
                onClick={() => {
                  unlockAudio();
                  playSound('tap');
                  startLevel(id);
                }}
                className={`flex aspect-square flex-col items-center justify-center rounded-3xl bg-white shadow-[0_6px_0_rgba(0,0,0,0.12)] ring-4 transition active:translate-y-1 active:scale-95 ${
                  id === next ? 'ring-amber-300 animate-[gentle-pulse_1.8s_ease-in-out_infinite]' : 'ring-white'
                }`}
              >
                <span
                  className="font-display text-4xl font-extrabold leading-[1.5] drop-shadow-[0_2px_0_rgba(0,0,0,0.12)]"
                  style={{ color }}
                >
                  {label}
                </span>
                <span dir="ltr" className="-mt-2 flex">
                  {[0, 1, 2].map((s) => (
                    <StarIcon key={s} size={18} filled={s < stars} style={s < stars ? undefined : { filter: 'brightness(0.75)' }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
