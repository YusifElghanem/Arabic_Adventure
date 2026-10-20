import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useInputStore } from '@/stores/useInputStore';
import { unlockAudio } from '@/utils/sound';
import { ArrowLeftIcon, ArrowRightIcon, JumpIcon } from './icons';
import { useGameStore } from '@/stores/useGameStore';

/**
 * Big on-screen buttons for tablets and phones: walk left and right on one
 * side, jump on the other. Each button tracks its own pointer, so small
 * hands can walk and jump at once. Shown on touch devices, or as soon as
 * any touch is seen.
 */

function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(
    () => typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window),
  );
  useEffect(() => {
    if (isTouch) return;
    const onTouch = () => setIsTouch(true);
    window.addEventListener('touchstart', onTouch, { once: true, passive: true });
    return () => window.removeEventListener('touchstart', onTouch);
  }, [isTouch]);
  return isTouch;
}

interface HoldButtonProps {
  label: string;
  onPress: () => void;
  onRelease: () => void;
  className?: string;
  children: ReactNode;
}

function HoldButton({ label, onPress, onRelease, className = '', children }: HoldButtonProps) {
  const [pressed, setPressed] = useState(false);
  const pressedRef = useRef(false);
  const releaseRef = useRef(onRelease);
  releaseRef.current = onRelease;

  const down = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    unlockAudio();
    pressedRef.current = true;
    setPressed(true);
    onPress();
  };
  const up = () => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    setPressed(false);
    onRelease();
  };

  // Release if the controls disappear mid-press (e.g. the game pauses).
  useEffect(
    () => () => {
      if (pressedRef.current) releaseRef.current();
    },
    [],
  );

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onContextMenu={(e) => e.preventDefault()}
      className={`grid touch-none select-none place-items-center rounded-full shadow-xl ring-4 ring-white/80 transition-transform ${
        pressed ? 'scale-90 brightness-110' : 'scale-100'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default function TouchControls() {
  const isTouch = useTouchDevice();
  const setLeft = useInputStore((s) => s.setLeft);
  const setRight = useInputStore((s) => s.setRight);
  const pressJump = useInputStore((s) => s.pressJump);
  const releaseJump = useInputStore((s) => s.releaseJump);
  const pressAction = useInputStore((s) => s.pressAction);
  const hasBubbles = useGameStore((s) => s.tool === 'bubble');

  if (!isTouch) return null;

  return (
    <div
      dir="ltr"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-4 sm:px-8"
      style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
    >
      <div className="pointer-events-auto flex gap-4">
        <HoldButton label="يسار" onPress={() => setLeft(true)} onRelease={() => setLeft(false)} className="size-20 bg-sky-400/90 text-white sm:size-24">
          <ArrowLeftIcon size={44} />
        </HoldButton>
        <HoldButton label="يمين" onPress={() => setRight(true)} onRelease={() => setRight(false)} className="size-20 bg-sky-400/90 text-white sm:size-24">
          <ArrowRightIcon size={44} />
        </HoldButton>
      </div>
      <div className="pointer-events-auto flex items-end gap-4">
        {hasBubbles && (
          <HoldButton label="فقاقيع" onPress={pressAction} onRelease={() => {}} className="size-20 bg-cyan-300/95 sm:size-24">
            <img src={`${import.meta.env.BASE_URL}emoji/bubbles.svg`} alt="" className="size-12" draggable={false} />
          </HoldButton>
        )}
        <HoldButton label="اقفز" onPress={pressJump} onRelease={releaseJump} className="size-24 bg-amber-400/95 text-white sm:size-28">
          <JumpIcon size={52} />
        </HoldButton>
      </div>
    </div>
  );
}
