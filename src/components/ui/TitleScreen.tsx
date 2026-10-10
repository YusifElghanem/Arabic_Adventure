import { ARABIC_LETTERS, OUTFITS, useGameStore, type Outfit } from '@/stores/useGameStore';
import { playSound, unlockAudio } from '@/utils/sound';
import { ExplorerIcon, OnesieIcon, PlayIcon, SoundOffIcon, SoundOnIcon } from './icons';
import AvatarPreview from './AvatarPreview';
import ParentGateButton from './ParentGateButton';

/**
 * Home screen: the child's own avatar waving on a little island, two big
 * outfit buttons, and a huge Play button. Grown-up settings (the photo) sit
 * behind a press-and-hold button in the corner.
 */

const OUTFIT_META: Record<Outfit, { label: string; Icon: typeof OnesieIcon; ring: string }> = {
  onesie: { label: 'بيجامة الدب', Icon: OnesieIcon, ring: 'ring-violet-400' },
  explorer: { label: 'ملابس المستكشف', Icon: ExplorerIcon, ring: 'ring-amber-500' },
};

/** The letters this build teaches, shown as a progress shelf for parents. */
const TAUGHT_LETTERS = ARABIC_LETTERS.slice(0, 2);

export default function TitleScreen() {
  const outfit = useGameStore((s) => s.outfit);
  const setOutfit = useGameStore((s) => s.setOutfit);
  const startLevel = useGameStore((s) => s.startLevel);
  const openPhotoModal = useGameStore((s) => s.openPhotoModal);
  const isMuted = useGameStore((s) => s.isMuted);
  const toggleMuted = useGameStore((s) => s.toggleMuted);
  const lettersDiscovered = useGameStore((s) => s.lettersDiscovered);

  const play = () => {
    unlockAudio();
    playSound('tap');
    startLevel(1);
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-100">
      <BackgroundClouds />

      <div
        dir="ltr"
        className="relative z-10 flex w-full items-center justify-between p-4"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <ParentGateButton onUnlock={openPhotoModal} />
        <button
          type="button"
          aria-label={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
          onClick={() => {
            unlockAudio();
            toggleMuted();
            playSound('tap');
          }}
          className="grid size-16 place-items-center rounded-full bg-white/80 text-sky-700 shadow-lg ring-2 ring-white transition active:scale-95"
        >
          {isMuted ? <SoundOffIcon size={30} /> : <SoundOnIcon size={30} />}
        </button>
      </div>

      <h1 className="relative z-10 -mt-2 shrink-0 font-display text-5xl font-extrabold text-white drop-shadow-[0_4px_0_rgba(2,132,199,0.55)] sm:text-6xl">
        مغامرة الحروف
      </h1>

      <AvatarPreview className="relative z-10 my-2 aspect-[150/170] max-h-[300px] min-h-0 w-auto flex-1" />

      <div dir="ltr" className="relative z-10 flex shrink-0 items-center gap-5" role="radiogroup" aria-label="اختر الملابس">
        {OUTFITS.map((option) => {
          const { label, Icon, ring } = OUTFIT_META[option];
          const selected = option === outfit;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              onClick={() => {
                unlockAudio();
                playSound('tap');
                setOutfit(option);
              }}
              className={`grid size-20 shrink-0 place-items-center rounded-full bg-white shadow-lg transition active:scale-90 ${
                selected ? `scale-110 ring-[6px] ${ring}` : 'opacity-80 ring-2 ring-white'
              }`}
            >
              <Icon size={56} />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="ابدأ اللعب"
        onClick={play}
        className="relative z-10 mt-5 grid size-28 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_10px_0_#047857,0_18px_30px_rgba(4,120,87,0.35)] ring-8 ring-white transition hover:bg-emerald-400 active:translate-y-2 active:shadow-[0_2px_0_#047857] animate-[gentle-pulse_1.8s_ease-in-out_infinite] sm:size-32"
      >
        <PlayIcon size={64} className="translate-x-1" />
      </button>

      <div
        className="relative z-10 mt-auto flex gap-3 p-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        aria-label="الحروف التي تعلمها الطفل"
      >
        {TAUGHT_LETTERS.map((letter) => {
          const learned = lettersDiscovered.includes(letter);
          return (
            <span
              key={letter}
              className={`grid size-14 place-items-center rounded-2xl font-display text-3xl font-bold shadow-md transition ${
                learned ? 'bg-white text-sky-600 ring-4 ring-amber-300' : 'bg-white/40 text-white/80'
              }`}
            >
              {letter}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function BackgroundClouds() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[
        { top: '12%', left: '6%', scale: 1, delay: '0s' },
        { top: '22%', left: '72%', scale: 1.3, delay: '-6s' },
        { top: '55%', left: '-4%', scale: 1.5, delay: '-3s' },
        { top: '62%', left: '80%', scale: 1.1, delay: '-9s' },
      ].map((c, i) => (
        <svg
          key={i}
          viewBox="0 0 120 60"
          className="absolute w-36 animate-[drift_14s_ease-in-out_infinite] opacity-90"
          style={{ top: c.top, left: c.left, transform: `scale(${c.scale})`, animationDelay: c.delay }}
        >
          <g fill="#ffffff">
            <circle cx="35" cy="35" r="20" />
            <circle cx="60" cy="25" r="24" />
            <circle cx="85" cy="35" r="18" />
            <rect x="25" y="35" width="70" height="18" rx="9" />
          </g>
        </svg>
      ))}
    </div>
  );
}
