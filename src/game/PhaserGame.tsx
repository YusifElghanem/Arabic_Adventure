import { useEffect, useRef } from 'react';
import { EventBus } from './EventBus';
import { createGame } from './createGame';

/**
 * React host for the Phaser game. It mounts the engine into a full-size div
 * and tears it down on unmount. It is lazy-loaded so Phaser only downloads
 * when a level starts.
 */

interface PhaserGameProps {
  /** Called once the level has rendered its first frame. */
  onReady: () => void;
}

export default function PhaserGame({ onReady }: PhaserGameProps) {
  const container = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const parent = container.current;
    if (!parent) return;
    const offReady = EventBus.on('level-ready', () => onReadyRef.current());
    const { destroy } = createGame(parent);
    return () => {
      offReady();
      destroy();
    };
  }, []);

  return <div ref={container} className="absolute inset-0 touch-none overflow-hidden" />;
}
