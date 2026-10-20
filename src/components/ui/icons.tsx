import type { SVGProps } from 'react';
import { coinSvg } from '@/game/art/mechanics';
import { toDataUri } from '@/game/art/svg';

/**
 * Inline SVG icons. The game UI is icon-only so pre-readers can use it.
 * Icons inherit `currentColor` unless they are illustrations (sun, star,
 * outfits), which carry their own palette.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

const base = ({ size = 24, ...props }: IconProps): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  ...props,
});

export const GridIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" fill="currentColor" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" fill="currentColor" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" fill="currentColor" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" fill="currentColor" />
  </svg>
);

export const FullscreenIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

export const ExitFullscreenIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" />
  </svg>
);

export const PauseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
    <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
  </svg>
);

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M6 9.5V19a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1V9.5" />
  </svg>
);

export const ReplayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4.5h4.5" />
  </svg>
);

export const NextIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h13" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const SoundOnIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
    <path d="M15.5 9a4 4 0 0 1 0 6" />
    <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
);

export const SoundOffIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
    <path d="m16 9.5 5 5M21 9.5l-5 5" />
  </svg>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 5 8 12l7 7" strokeWidth={3.2} />
  </svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m9 5 7 7-7 7" strokeWidth={3.2} />
  </svg>
);

export const JumpIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 14 7-7 7 7" strokeWidth={3.2} />
    <path d="M7 19h10" strokeWidth={2.6} />
  </svg>
);

export const CameraIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const GalleryIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m20.5 16-5-5-8.5 8.5" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 6 12 12M18 6 6 18" strokeWidth={3} />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" strokeWidth={3} />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l1 12.5h9l1-12.5" />
  </svg>
);

export const ZoomInIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2M11 8v6M8 11h6" />
  </svg>
);

export const ZoomOutIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2M8 11h6" />
  </svg>
);

export const ParentIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="7" r="3" />
    <circle cx="17" cy="10" r="2.2" />
    <path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20" />
    <path d="M15 20v-1a3.5 3.5 0 0 1 3.5-3.5h0A3 3 0 0 1 21 18.5V20" />
  </svg>
);

/* ----------------------------- Illustrations ----------------------------- */

/** A smiling sun. `progress` (0..1) fills a ring around it. */
export const SunIcon = ({ size = 64, progress, ...props }: IconProps & { progress?: number }) => {
  const ringR = 21;
  const circumference = 2 * Math.PI * ringR;
  const clamped = Math.min(1, Math.max(0, progress ?? 1));
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden focusable={false} {...props}>
      {progress !== undefined && (
        <>
          <circle cx="24" cy="24" r={ringR} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="4" />
          <circle
            cx="24"
            cy="24"
            r={ringR}
            fill="none"
            stroke="#f97316"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped)}
            transform="rotate(-90 24 24)"
            style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(.34,1.56,.64,1)' }}
          />
        </>
      )}
      <g stroke="#fbbf24" strokeWidth="2.6" strokeLinecap="round">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={24 + Math.cos(a) * 12.5}
              y1={24 + Math.sin(a) * 12.5}
              x2={24 + Math.cos(a) * 16}
              y2={24 + Math.sin(a) * 16}
            />
          );
        })}
      </g>
      <circle cx="24" cy="24" r="10" fill="#fde047" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="20.5" cy="22.5" r="1.3" fill="#7c2d12" />
      <circle cx="27.5" cy="22.5" r="1.3" fill="#7c2d12" />
      <circle cx="18.5" cy="26" r="1.6" fill="#fb923c" opacity="0.6" />
      <circle cx="29.5" cy="26" r="1.6" fill="#fb923c" opacity="0.6" />
      <path d="M20.5 26.5q3.5 3.2 7 0" fill="none" stroke="#7c2d12" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

export const HeartIcon = ({ size = 32, filled = true, ...props }: IconProps & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable={false} {...props}>
    <path
      d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"
      fill={filled ? '#ff4d6d' : 'rgba(255,255,255,0.45)'}
      stroke={filled ? '#c9184a' : 'rgba(255,255,255,0.95)'}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    {filled && <path d="M6.5 8.2c.6-1 1.5-1.4 2.4-1.3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" fill="none" />}
  </svg>
);

export const StarIcon = ({ size = 40, filled = true, ...props }: IconProps & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable={false} {...props}>
    <path
      d="M12 2.8l2.75 5.6 6.15.9-4.45 4.33 1.05 6.12L12 16.86l-5.5 2.9 1.05-6.13L3.1 9.3l6.15-.9L12 2.8Z"
      fill={filled ? '#facc15' : 'rgba(255,255,255,0.35)'}
      stroke={filled ? '#ca8a04' : 'rgba(255,255,255,0.9)'}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    {filled && <path d="M9 9.5l1.2-.2" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />}
  </svg>
);

export const OnesieIcon = ({ size = 48, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden focusable={false} {...props}>
    <circle cx="15" cy="10" r="5" fill="#c4b5fd" />
    <circle cx="33" cy="10" r="5" fill="#c4b5fd" />
    <circle cx="24" cy="17" r="11" fill="#c4b5fd" />
    <circle cx="24" cy="18" r="7.5" fill="#fde2c8" />
    <circle cx="21.5" cy="17.5" r="1" fill="#3f2a1d" />
    <circle cx="26.5" cy="17.5" r="1" fill="#3f2a1d" />
    <path d="M21.8 20.6q2.2 1.8 4.4 0" stroke="#3f2a1d" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <rect x="14" y="26" width="20" height="17" rx="8" fill="#c4b5fd" />
    <ellipse cx="24" cy="34" rx="6" ry="5" fill="#ede9fe" />
  </svg>
);

export const ExplorerIcon = ({ size = 48, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden focusable={false} {...props}>
    <ellipse cx="24" cy="11" rx="15" ry="3.5" fill="#a16207" />
    <path d="M15 11a9 7 0 0 1 18 0Z" fill="#ca8a04" />
    <rect x="15" y="9.5" width="18" height="2.4" fill="#7c2d12" />
    <circle cx="24" cy="19" r="7.5" fill="#fde2c8" />
    <circle cx="21.5" cy="18.5" r="1" fill="#3f2a1d" />
    <circle cx="26.5" cy="18.5" r="1" fill="#3f2a1d" />
    <path d="M21.8 21.6q2.2 1.8 4.4 0" stroke="#3f2a1d" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M18 26.5h12l-2 3h-8Z" fill="#ef4444" />
    <rect x="15" y="28" width="18" height="10" rx="4" fill="#d6b97b" />
    <rect x="16" y="37" width="16" height="6" rx="2.5" fill="#92400e" />
  </svg>
);

/** The in-game gold coin (same art as the level coins). */
let coinUri: string | null = null;
export const CoinIcon = ({ size = 32, className = '' }: { size?: number; className?: string }) => {
  coinUri ??= toDataUri(coinSvg());
  return <img src={coinUri} alt="" width={size} height={size} className={className} draggable={false} />;
};
