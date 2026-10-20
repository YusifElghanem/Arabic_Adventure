import { useState } from 'react';
import { LEVEL_COUNT, THIEF_LEVEL_COUNT, useGameStore, type GameMode } from '@/stores/useGameStore';
import { LETTERS, letterForLevel } from '@/game/letters';
import { thiefSvg } from '@/game/art/thief';
import { toDataUri } from '@/game/art/svg';
import { playSound, unlockAudio } from '@/utils/sound';
import { CloseIcon, GridIcon, StarIcon } from './icons';

let thiefUri: string | null = null;
export const thiefIcon = () => (thiefUri ??= toDataUri(thiefSvg(false)));

/**
 * Level select: every letter as a big candy tile (all open), with the stars
 * already earned. The next level to play gently pulses. A second tab (the
 * thief's face) picks a letter to guard in the letter-thieves mode.
 */
export default function LevelSelect({ onClose }: { onClose: () => void }) {
  const startLevel = useGameStore((s) => s.startLevel);
  const levelRecords = useGameStore((s) => s.levelRecords);
  const unlockedLevels = useGameStore((s) => s.unlockedLevels);
  const next = Math.max(1, ...unlockedLevels);
  const [mode, setMode] = useState<GameMode>('adventure');
  const count = mode === 'thieves' ? THIEF_LEVEL_COUNT : LEVEL_COUNT;

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col bg-gradient-to-b from-sky-300 to-emerald-100"
      role="dialog"
      aria-modal="true"
      aria-label="اختر المرحلة"
    >
      <div dir="ltr" className="flex shrink-0 items-center justify-between p-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="flex gap-3" role="tablist">
          {(['adventure', 'thieves'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              aria-label={m === 'thieves' ? 'سارقين الحروف' : 'المراحل'}
              onClick={() => {
                playSound('tap');
                setMode(m);
              }}
              className={`grid size-16 place-items-center rounded-2xl shadow-lg transition active:scale-95 ${
                mode === m ? 'bg-white ring-4 ring-amber-400' : 'bg-white/60 ring-2 ring-white'
              } ${m === 'adventure' ? 'text-amber-500' : ''}`}
            >
              {m === 'thieves' ? <img src={thiefIcon()} alt="" className="size-12" /> : <GridIcon size={34} />}
            </button>
          ))}
        </div>
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
          {Array.from({ length: count }, (_, i) => i + 1).map((id) => {
            const thieves = mode === 'thieves';
            const spec = thieves ? LETTERS[id - 1] : letterForLevel(id);
            const label = spec ? spec.letter : `${LETTERS[0].letter} ${LETTERS[1].letter}`;
            const color = spec?.color ?? LETTERS[1].color;
            const stars = thieves ? -1 : (levelRecords[id]?.bestStars ?? 0);
            return (
              <button
                key={id}
                type="button"
                aria-label={`المرحلة ${id}`}
                onClick={() => {
                  unlockAudio();
                  playSound('tap');
                  startLevel(id, mode);
                }}
                className={`flex aspect-square flex-col items-center justify-center rounded-3xl bg-white shadow-[0_6px_0_rgba(0,0,0,0.12)] ring-4 transition active:translate-y-1 active:scale-95 ${
                  mode === 'adventure' && id === next ? 'ring-amber-300 animate-[gentle-pulse_1.8s_ease-in-out_infinite]' : 'ring-white'
                }`}
              >
                <span
                  className="font-display text-4xl font-extrabold leading-[1.5] drop-shadow-[0_2px_0_rgba(0,0,0,0.12)]"
                  style={{ color }}
                >
                  {label}
                </span>
                {stars >= 0 && <span dir="ltr" className="-mt-2 flex">
                  {[0, 1, 2].map((s) => (
                    <StarIcon key={s} size={18} filled={s < stars} style={s < stars ? undefined : { filter: 'brightness(0.75)' }} />
                  ))}
                </span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
