import { useGameStore } from '@/stores/useGameStore';
import { LETTERS } from '@/game/letters';
import { getAudioOutput } from './sound';
import { speakArabic } from './speech';

/**
 * Plays the pre-generated voice clips in /public/audio (letter names, words,
 * cheers, "well done"), made with a Microsoft neural voice by
 * scripts/voice/generate.py (run in GitHub Actions). Only clips listed in
 * audio/manifest.json are played, so a missing set costs no 404s. They go through
 * the shared Web Audio context, which is unlocked by the first tap, so they
 * also play on iOS. If a clip can't be loaded, falls back to the device's
 * Arabic TTS voice (if any).
 */

export type VoiceClip = `letter-${number}` | `word-${number}` | `cheer-${number}` | 'well-done';

/** Cheers ("واو!", "ياي!", "برافو!", "شاطر!", "هايل!", "جميل!"), see scripts/voice/generate.py. */
export const CHEER_COUNT = 6;
let lastCheer = -1;
/** A random cheer, never the same one twice in a row. */
export function randomCheer(): VoiceClip {
  let i = Math.floor(Math.random() * CHEER_COUNT);
  if (i === lastCheer) i = (i + 1) % CHEER_COUNT;
  lastCheer = i;
  return `cheer-${i}`;
}

/** Pause between clips in a phrase ("باء… بطة"), in seconds. */
export const CLIP_GAP = 0.2;

export const clipUrl = (clip: VoiceClip): string => `${import.meta.env.BASE_URL}audio/${clip}.mp3`;

let manifest: Promise<Set<string>> | undefined;
/** The clip names that exist (empty if there is no manifest yet). */
function availableClips(): Promise<Set<string>> {
  manifest ??=
    typeof fetch === 'function'
      ? fetch(`${import.meta.env.BASE_URL}audio/manifest.json`)
          .then((r) => (r.ok ? (r.json() as Promise<{ clips?: string[] }>) : { clips: [] }))
          .then((m) => new Set(m.clips ?? []))
          .catch(() => new Set<string>())
      : Promise.resolve(new Set<string>());
  return manifest;
}

const buffers = new Map<VoiceClip, Promise<AudioBuffer | null>>();
let playing: AudioBufferSourceNode[] = [];
/** Bumped on every phrase, so a slow load never plays over a newer phrase. */
let phraseId = 0;

function load(clip: VoiceClip): Promise<AudioBuffer | null> {
  let pending = buffers.get(clip);
  if (!pending) {
    const output = getAudioOutput();
    pending = availableClips().then((clips) =>
      output && clips.has(clip)
        ? fetch(clipUrl(clip))
            .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
            .then((data) => output.ctx.decodeAudioData(data))
            .catch(() => null)
        : null,
    );
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
  for (let i = 0; i < CHEER_COUNT; i++) void load(`cheer-${i}`);
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
/** The big moment (letter completed): a cheer, then name and word. */
export const celebrateLetter = (index: number) =>
  say([randomCheer(), `letter-${index}`, `word-${index}`], `${LETTERS[index].name}… ${LETTERS[index].word}`);
export const sayWellDone = () => say([randomCheer(), 'well-done'], 'أحسنت');
