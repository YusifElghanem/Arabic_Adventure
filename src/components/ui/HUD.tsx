import { selectSunProgress, useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import { thiefIcon } from './LevelSelect';
import { thiefSvg } from '@/game/art/thief';
import { toDataUri } from '@/game/art/svg';
import { PauseIcon, SoundOffIcon, SoundOnIcon, StarIcon, SunIcon, CoinIcon } from './icons';

/**
 * Icon-only heads-up display over the canvas. The smiling sun's ring fills
 * as the child completes the level's goals, and stars light up as they are
 * collected. Mute and pause buttons sit on the other side. There is no text,
 * so pre-readers can follow it.
 */
export default function HUD() {
  const sunProgress = useGameStore(selectSunProgress);
  const starsCollected = useGameStore((s) => s.session?.starsCollected ?? 0);
  const totalStars = useGameStore((s) => s.session?.totalStars ?? 0);
  const isMuted = useGameStore((s) => s.isMuted);
  const toggleMuted = useGameStore((s) => s.toggleMuted);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const coins = useGameStore((s) => s.coins);
  const thievesTotal = useGameStore((s) => (s.session?.mode === 'thieves' ? s.session.thievesTotal : 0));
  const befriended = useGameStore((s) => s.session?.thievesBefriended ?? 0);

  return (
    <div
      dir="ltr"
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 sm:p-4"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <div
        className="flex items-center gap-2 rounded-full bg-white/45 py-1.5 ps-1.5 pe-4 shadow-lg ring-2 ring-white/70 backdrop-blur-md"
        role="status"
        aria-label={`${starsCollected} / ${totalStars}`}
      >
        <SunIcon size={60} progress={sunProgress} className={sunProgress >= 1 ? 'animate-[spin_6s_linear_infinite]' : ''} />
        <div className="flex items-center gap-1">
          {Array.from({ length: totalStars }, (_, i) => (
            <StarIcon
              key={i}
              size={38}
              filled={i < starsCollected}
              className={i < starsCollected ? 'animate-[star-pop_500ms_cubic-bezier(.34,1.56,.64,1)] drop-shadow' : ''}
            />
          ))}
        </div>
        {thievesTotal > 0 && (
          <div className="ms-1 flex items-center" aria-label={`${befriended} / ${thievesTotal}`}>
            {Array.from({ length: thievesTotal }, (_, i) => (
              <img
                key={i}
                src={i < befriended ? friendIcon() : thiefIcon()}
                alt=""
                className={`-ms-1 size-9 ${i < befriended ? 'animate-[star-pop_500ms_cubic-bezier(.34,1.56,.64,1)]' : 'opacity-60 grayscale-[0.4]'}`}
              />
            ))}
          </div>
        )}
      </div>

      <div
        key={coins}
        className="ms-2 me-auto flex items-center gap-1 self-center rounded-full bg-white/45 py-1 ps-1 pe-3 shadow-lg ring-2 ring-white/70 backdrop-blur-md animate-[star-pop_300ms_ease-out]"
        role="status"
        aria-label={`${coins}`}
      >
        <CoinIcon size={32} />
        <span className="font-display text-2xl font-extrabold text-amber-600 drop-shadow-[0_1px_0_#fff]">{coins}</span>
      </div>

      <div className="pointer-events-auto flex gap-2">
        <RoundButton
          label={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
          onClick={() => {
            toggleMuted();
            playSound('tap');
          }}
        >
          {isMuted ? <SoundOffIcon size={28} /> : <SoundOnIcon size={28} />}
        </RoundButton>
        <RoundButton
          label="إيقاف مؤقت"
          onClick={() => {
            playSound('tap');
            pauseGame();
          }}
        >
          <PauseIcon size={28} />
        </RoundButton>
      </div>
    </div>
  );
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-14 place-items-center rounded-full bg-white/80 text-sky-700 shadow-lg ring-2 ring-white transition hover:bg-white active:scale-90"
    >
      {children}
    </button>
  );
}

let friendUri: string | null = null;
const friendIcon = () => (friendUri ??= toDataUri(thiefSvg(true)));
