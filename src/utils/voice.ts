import { useGameStore } from '@/stores/useGameStore';
import { LETTERS } from '@/game/letters';
import { getAudioOutput } from './sound';
import { speakArabic } from './speech';

/**
 * Plays the pre-generated voice clips in /public/audio (letter names, words,
 * "well done"), made offline by scripts/voice/generate.py. They go through
 * the shared Web Audio context, which is unlocked by the first tap, so they
 * also play on iOS. If a clip can't be loaded, falls back to the device's
 * Arabic TTS voice (if any).
 */

export type VoiceClip = `letter-${number}` | `word-${number}` | 'well-done';

/** Pause between clips in a phrase ("باء… بطة"), in seconds. */
export const CLIP_GAP = 0.25;

export const clipUrl = (clip: VoiceClip): string => `${import.meta.env.BASE_URL}audio/${clip}.mp3`;

const buffers = new Map<VoiceClip, Promise<AudioBuffer | null>>();
let playing: AudioBufferSourceNode[] = [];
/** Bumped on every phrase, so a slow load never plays over a newer phrase. */
let phraseId = 0;

function load(clip: VoiceClip): Promise<AudioBuffer | null> {
  let pending = buffers.get(clip);
  if (!pending) {
    const output = getAudioOutput();
    pending =
      output && typeof fetch === 'function'
        ? fetch(clipUrl(clip))
            .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
            .then((data) => output.ctx.decodeAudioData(data))
            .catch(() => null)
        : Promise.resolve(null);
    // Forget failures, so a later call can retry (e.g. after a network blip).
    void pending.then((b) => b ?? buffers.delete(clip));
    buffers.set(clip, pending);
  }
  return pending;
}

/** Starts loading a letter's clips ahead of time (call when its level starts). */
export function preloadLetterVoice(index: number): void {
  void load(`letter-${index}`);
  void load(`word-${index}`);
  void load('well-done');
}

function stopPlaying(): void {
  for (const source of playing) {
    try {
      source.stop();
    } catch {
      // Already stopped.
    }
  }
  playing = [];
}

/**
 * Plays `clips` one after another. `fallback` is spoken with device TTS when
 * any clip is unavailable. Resolves to whether the recorded clips played.
 */
export async function say(clips: VoiceClip[], fallback: string): Promise<boolean> {
  if (useGameStore.getState().isMuted) return false;
  const id = ++phraseId;
  stopPlaying();
  const output = getAudioOutput();
  const loaded = output ? await Promise.all(clips.map(load)) : [];
  if (id !== phraseId || useGameStore.getState().isMuted) return false;
  if (!output || loaded.length !== clips.length || loaded.some((b) => !b)) {
    speakArabic(fallback);
    return false;
  }
  const { ctx, out } = output;
  if (ctx.state === 'suspended') void ctx.resume();
  let at = ctx.currentTime + 0.02;
  for (const buffer of loaded as AudioBuffer[]) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    // The master gain is tuned for the synth effects; voice needs to be louder.
    const gain = ctx.createGain();
    gain.gain.value = 1.8;
    source.connect(gain).connect(out);
    source.start(at);
    playing.push(source);
    at += buffer.duration + CLIP_GAP;
  }
  return true;
}

export const sayLetter = (index: number) => say([`letter-${index}`], LETTERS[index].name);
export const sayWord = (index: number) => say([`word-${index}`], LETTERS[index].word);
export const sayLetterAndWord = (index: number) =>
  say([`letter-${index}`, `word-${index}`], `${LETTERS[index].name}… ${LETTERS[index].word}`);
export const sayWellDone = () => say(['well-done'], 'أحسنت');
