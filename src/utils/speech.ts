import { useGameStore } from '@/stores/useGameStore';

/**
 * Speaks short Arabic words (letter names, "well done") with the Web Speech
 * API. It only speaks when the device has an Arabic voice. Otherwise a
 * non-Arabic voice would mangle the word, which is worse than silence for a
 * child learning pronunciation.
 */

let arabicVoice: SpeechSynthesisVoice | null | undefined;

function findArabicVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang.toLowerCase() === 'ar-sa') ??
    voices.find((v) => v.lang.toLowerCase() === 'ar-eg') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('ar')) ??
    null
  );
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // Voices load asynchronously in Chrome; refresh the cache when they arrive.
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    arabicVoice = findArabicVoice();
  });
}

export function canSpeakArabic(): boolean {
  if (arabicVoice === undefined || arabicVoice === null) arabicVoice = findArabicVoice();
  return arabicVoice !== null;
}

/** Speaks `text` slowly and brightly. Returns false if no Arabic voice is available. */
export function speakArabic(text: string): boolean {
  if (useGameStore.getState().isMuted || !canSpeakArabic() || !arabicVoice) return false;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = arabicVoice;
    utterance.lang = arabicVoice.lang;
    utterance.rate = 0.8;
    utterance.pitch = 1.2;
    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
