import type { ArabicLetter } from '@/stores/useGameStore';

/**
 * The 28 letters as data. Template levels are generated from these, so a
 * new letter level costs one line here. Engine-free, so React can read it.
 *
 * - `dotless`: the letter's skeleton without dots (Unicode dotless forms).
 *   The level shows it first; the child brings the dots, then the real
 *   letter appears.
 * - `dots` / `dotPlace`: how many dots the child collects and where they go.
 *   Letters without dots still need one "sparkle" that wakes the letter up.
 * - `emoji`: a Fluent Emoji Flat file in /public/emoji (MIT, Microsoft).
 */

export type DotPlace = 'above' | 'below' | 'inside';

export interface LetterSpec {
  letter: ArabicLetter;
  /** Spoken letter name. */
  name: string;
  /** A first word for the letter (no diacritics). */
  word: string;
  /** File name (without .svg) in /public/emoji. */
  emoji: string;
  dots: 0 | 1 | 2 | 3;
  dotPlace: DotPlace;
  dotless: string;
  /** Which of the 7 worlds the letter belongs to (1-based). */
  world: number;
  color: string;
}

const L = (
  letter: ArabicLetter,
  name: string,
  word: string,
  emoji: string,
  dots: LetterSpec['dots'],
  dotPlace: DotPlace,
  dotless: string,
  world: number,
  color: string,
): LetterSpec => ({ letter, name, word, emoji, dots, dotPlace, dotless, world, color });

export const LETTERS: readonly LetterSpec[] = [
  L('أ', 'ألف', 'أسد', 'lion', 0, 'above', 'ا', 1, '#ff6b6b'),
  L('ب', 'باء', 'بطة', 'duck', 1, 'below', 'ٮ', 1, '#3fb5ff'),
  L('ت', 'تاء', 'تفاحة', 'apple', 2, 'above', 'ٮ', 1, '#ff5c8a'),
  L('ث', 'ثاء', 'ثعلب', 'fox', 3, 'above', 'ٮ', 1, '#ff9d2e'),
  L('ج', 'جيم', 'جمل', 'camel', 1, 'inside', 'ح', 2, '#e8a33d'),
  L('ح', 'حاء', 'حصان', 'horse', 0, 'above', 'ح', 2, '#c77dff'),
  L('خ', 'خاء', 'خروف', 'sheep', 1, 'above', 'ح', 2, '#36c98e'),
  L('د', 'دال', 'دب', 'bear', 0, 'above', 'د', 2, '#ff7a45'),
  L('ذ', 'ذال', 'ذرة', 'corn', 1, 'above', 'د', 3, '#f5b70a'),
  L('ر', 'راء', 'ريشة', 'feather', 0, 'above', 'ر', 3, '#4cc2ff'),
  L('ز', 'زاي', 'زرافة', 'giraffe', 1, 'above', 'ر', 3, '#ff9d2e'),
  L('س', 'سين', 'سمكة', 'fish', 0, 'above', 'س', 3, '#2fb8e8'),
  L('ش', 'شين', 'شمس', 'sun', 3, 'above', 'س', 4, '#ffb000'),
  L('ص', 'صاد', 'صاروخ', 'rocket', 0, 'above', 'ص', 4, '#7c6cff'),
  L('ض', 'ضاد', 'ضفدع', 'frog', 1, 'above', 'ص', 4, '#3cc96b'),
  L('ط', 'طاء', 'طائرة', 'airplane', 0, 'above', 'ط', 4, '#4a90ff'),
  L('ظ', 'ظاء', 'ظرف', 'envelope', 1, 'above', 'ط', 5, '#e86ad8'),
  L('ع', 'عين', 'عنب', 'grapes', 0, 'above', 'ع', 5, '#9b5cff'),
  L('غ', 'غين', 'غيمة', 'cloud', 1, 'above', 'ع', 5, '#5aa9ff'),
  L('ف', 'فاء', 'فيل', 'elephant', 1, 'above', 'ڡ', 5, '#8a9bb0'),
  L('ق', 'قاف', 'قطة', 'cat', 2, 'above', 'ٯ', 6, '#ff8a3d'),
  L('ك', 'كاف', 'كلب', 'dog', 0, 'above', 'ك', 6, '#c48a4a'),
  L('ل', 'لام', 'ليمون', 'lemon', 0, 'above', 'ل', 6, '#f2c200'),
  L('م', 'ميم', 'موز', 'banana', 0, 'above', 'م', 6, '#f5a623'),
  L('ن', 'نون', 'نحلة', 'bee', 1, 'above', 'ں', 7, '#f7b500'),
  L('ه', 'هاء', 'هدية', 'gift', 0, 'above', 'ه', 7, '#ff4d6d'),
  L('و', 'واو', 'وردة', 'rose', 0, 'above', 'و', 7, '#ff3d77'),
  L('ي', 'ياء', 'يد', 'hand', 2, 'below', 'ى', 7, '#ffb347'),
];

/** Sparkles/dots the child must bring to complete the letter (at least one). */
export const requiredDots = (spec: LetterSpec): number => Math.max(1, spec.dots);

/**
 * Level ids: level 1 is the hand-made "أ and ب" level. Every later letter
 * (from ت) gets its own generated level: level id = index in LETTERS.
 */
export const FIRST_TEMPLATE_LETTER = 2;
export const letterForLevel = (levelId: number): LetterSpec | undefined =>
  levelId >= FIRST_TEMPLATE_LETTER ? LETTERS[levelId] : undefined;
/** Index in LETTERS (also the voice clip number). */
export const letterIndex = (spec: LetterSpec): number => LETTERS.indexOf(spec);
export const TOTAL_LEVELS = LETTERS.length - 1;
