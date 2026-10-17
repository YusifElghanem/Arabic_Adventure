"""Generate the spoken letter names and words into public/audio/.

Offline neural TTS: Piper with the ar_JO "kareem" voice (downloaded from
the sherpa-onnx GitHub release, since Hugging Face is not reachable from
the sandbox). See scripts/voice/README.md.

The texts below are the LETTERS table (src/game/letters.ts) order, written
WITH diacritics and in pausal form so the voice pronounces them right:
ta marbuta is dropped and the word ends on its fatha (a trailing ة/ه is
read as /t/ or /h/), and shadda goes before its vowel. The game itself shows the words without diacritics.

Usage: python3 -I scripts/voice/generate.py <path/to/ar_JO-kareem-medium.onnx>
"""
import io
import subprocess
import sys
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

# (letter name, word): same order as LETTERS.
TEXTS = [
    ('أَلِف', 'أَسَد'), ('بَاء', 'بَطَّ'), ('تَاء', 'تُفَّاحَ'), ('ثَاء', 'ثَعْلَب'),
    ('جِيم', 'جَمَل'), ('حَاء', 'حِصَان'), ('خَاء', 'خَرُوف'), ('دَال', 'دُبّ'),
    ('ذَال', 'ذُرَ'), ('رَاء', 'رِيشَ'), ('زَاي', 'زَرَافَ'), ('سِين', 'سَمَكَ'),
    ('شِين', 'شَمْس'), ('صَاد', 'صَارُوخ'), ('ضَاد', 'ضِفْدَع'), ('طَاء', 'طَائِرَ'),
    ('ظَاء', 'ظَرْف'), ('عَيْن', 'عِنَب'), ('غَيْن', 'غَيْمَ'), ('فَاء', 'فِيل'),
    ('قَاف', 'قِطَّ'), ('كَاف', 'كَلْب'), ('لَام', 'لَيْمُون'), ('مِيم', 'مَوْز'),
    ('نُون', 'نَحْلَ'), ('هَاء', 'هَدِيَّ'), ('وَاو', 'وَرْدَ'), ('يَاء', 'يَد'),
]
EXTRA = {'well-done': 'أَحْسَنْت'}

OUT = Path(__file__).resolve().parents[2] / 'public' / 'audio'
# A little slower than normal speech, for small children.
CONFIG = SynthesisConfig(length_scale=1.2, noise_scale=0.6, noise_w_scale=0.7)


def synth(voice: PiperVoice, text: str, name: str) -> None:
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wav:
        voice.synthesize_wav(text, wav, syn_config=CONFIG)
    # Trim silence at both ends, then encode a small mono MP3.
    trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.05'
    subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', '-i', 'pipe:0', '-af', trim, '-ac', '1', '-ar', '22050',
         '-codec:a', 'libmp3lame', '-b:a', '48k', str(OUT / f'{name}.mp3')],
        input=buf.getvalue(), check=True)


def main() -> None:
    voice = PiperVoice.load(sys.argv[1])
    voice.use_tashkeel = False  # our texts already carry diacritics
    OUT.mkdir(parents=True, exist_ok=True)
    for i, (name, word) in enumerate(TEXTS):
        synth(voice, name, f'letter-{i}')
        synth(voice, word, f'word-{i}')
    for name, text in EXTRA.items():
        synth(voice, text, name)


if __name__ == '__main__':
    main()
