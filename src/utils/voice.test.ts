import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LETTERS } from '@/game/letters';
import { useGameStore } from '@/stores/useGameStore';

const speakArabic = vi.fn((_text: string) => true);
vi.mock('./speech', () => ({ speakArabic: (t: string) => speakArabic(t) }));

const { CHEER_COUNT, clipUrl, randomCheer, sayLetterAndWord, sayWellDone } = await import('./voice');

const files = Object.keys(import.meta.glob('../../public/audio/*.mp3')).map((p) => p.split('/').pop());

describe('voice clips', () => {
  beforeEach(() => {
    speakArabic.mockClear();
    useGameStore.setState({ isMuted: false });
  });

  it('has a name and a word clip for every letter, plus "well done" and the cheers', () => {
    LETTERS.forEach((_, i) => {
      expect(files).toContain(`letter-${i}.mp3`);
      expect(files).toContain(`word-${i}.mp3`);
    });
    expect(files).toContain('well-done.mp3');
    for (let i = 0; i < CHEER_COUNT; i++) expect(files).toContain(`cheer-${i}.mp3`);
    expect(files).toHaveLength(LETTERS.length * 2 + 1 + CHEER_COUNT);
  });

  it('never picks the same cheer twice in a row', () => {
    let last = randomCheer();
    for (let i = 0; i < 50; i++) {
      const next = randomCheer();
      expect(next).not.toBe(last);
      last = next;
    }
  });

  it('builds URLs under the base path', () => {
    expect(clipUrl('word-3')).toBe(`${import.meta.env.BASE_URL}audio/word-3.mp3`);
  });

  it('falls back to device TTS when Web Audio is unavailable', async () => {
    expect(await sayLetterAndWord(2)).toBe(false);
    expect(speakArabic).toHaveBeenCalledWith('تاء… تفاحة');
    await sayWellDone();
    expect(speakArabic).toHaveBeenLastCalledWith('أحسنت');
  });

  it('stays silent when muted', async () => {
    useGameStore.setState({ isMuted: true });
    expect(await sayLetterAndWord(2)).toBe(false);
    expect(speakArabic).not.toHaveBeenCalled();
  });
});
