import { useGameStore } from '@/stores/useGameStore';

/**
 * Tiny Web Audio synthesiser for game feedback. There are no audio files to
 * download, and every sound is short, soft and pitched for small ears.
 * Browsers block audio until a user gesture, so call `unlockAudio()` from a
 * click or tap handler (the Play button does).
 */

export type SoundName = 'jump' | 'land' | 'collect' | 'bump' | 'pop' | 'boing' | 'roar' | 'whoosh' | 'win' | 'tap';

let context: AudioContext | null = null;
let master: GainNode | null = null;

function getContext(): AudioContext | null {
  if (context) return context;
  const Ctor =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
  } catch {
    context = null;
  }
  return context;
}

/** Must run inside a user gesture at least once for sound to play. */
export function unlockAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

interface ToneOptions {
  type?: OscillatorType;
  from: number;
  to?: number;
  start?: number;
  duration: number;
  volume?: number;
}

function tone(ctx: AudioContext, out: AudioNode, { type = 'sine', from, to, start = 0, duration, volume = 0.3 }: ToneOptions) {
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + Math.min(0.02, duration / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(out);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noise(ctx: AudioContext, out: AudioNode, { start = 0, duration, volume = 0.2, filterFrom, filterTo }: { start?: number; duration: number; volume?: number; filterFrom: number; filterTo: number }) {
  const t0 = ctx.currentTime + start;
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFrom, t0);
  filter.frequency.exponentialRampToValueAtTime(filterTo, t0 + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + duration * 0.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(gain).connect(out);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

const SOUNDS: Record<SoundName, (ctx: AudioContext, out: AudioNode) => void> = {
  jump: (c, o) => tone(c, o, { type: 'triangle', from: 330, to: 660, duration: 0.18, volume: 0.25 }),
  land: (c, o) => tone(c, o, { type: 'sine', from: 160, to: 90, duration: 0.1, volume: 0.18 }),
  tap: (c, o) => tone(c, o, { type: 'sine', from: 880, to: 990, duration: 0.07, volume: 0.15 }),
  collect: (c, o) => {
    [784, 988, 1175, 1568].forEach((f, i) => tone(c, o, { type: 'triangle', from: f, start: i * 0.07, duration: 0.22, volume: 0.22 }));
  },
  bump: (c, o) => {
    tone(c, o, { type: 'square', from: 220, to: 330, duration: 0.12, volume: 0.12 });
    tone(c, o, { type: 'triangle', from: 660, to: 880, start: 0.08, duration: 0.15, volume: 0.18 });
  },
  pop: (c, o) => {
    tone(c, o, { type: 'sine', from: 500, to: 1400, duration: 0.12, volume: 0.3 });
    tone(c, o, { type: 'triangle', from: 1568, start: 0.1, duration: 0.3, volume: 0.15 });
  },
  boing: (c, o) => {
    tone(c, o, { type: 'sine', from: 140, to: 520, duration: 0.35, volume: 0.32 });
    tone(c, o, { type: 'triangle', from: 280, to: 1040, duration: 0.3, volume: 0.1 });
  },
  roar: (c, o) => {
    // A friendly "rawr", not a scary one: short, mid-pitched and filtered.
    noise(c, o, { duration: 0.55, volume: 0.22, filterFrom: 900, filterTo: 250 });
    tone(c, o, { type: 'sawtooth', from: 180, to: 120, duration: 0.5, volume: 0.07 });
  },
  whoosh: (c, o) => noise(c, o, { duration: 0.7, volume: 0.15, filterFrom: 300, filterTo: 2400 }),
  win: (c, o) => {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      tone(c, o, { type: 'triangle', from: f, start: i * 0.12, duration: i === 5 ? 0.6 : 0.2, volume: 0.22 }),
    );
  },
};

export function playSound(name: SoundName): void {
  if (useGameStore.getState().isMuted) return;
  const ctx = getContext();
  if (!ctx || !master) return;
  if (ctx.state === 'suspended') void ctx.resume();
  try {
    SOUNDS[name](ctx, master);
  } catch {
    // Audio is decoration; never let it break gameplay.
  }
}
