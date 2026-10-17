"""Generate the spoken letter names and words into public/audio/.

Offline neural TTS: Piper with the ar_JO "kareem" voice (downloaded from
the sherpa-onnx GitHub release, since Hugging Face is not reachable from
the sandbox). See scripts/voice/README.md.

The texts below are the LETTERS table (src/game/letters.ts) order, written
WITH diacritics and in pausal form so the voice pronounces them right:
ta marbuta is dropped and the word ends on its fatha (a trailing ة/ه is
read as /t/ or /h/), and shadda goes before its vowel. The game itself shows the words without diacritics.

Usage: python3 -I scripts/voice/generate.py <path/to/ar_JO-kareem-medium.onnx> [style] [out_dir]
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
EXTRA = {'well-done': 'أَحْسَنْت!'}
# Short cheers played before the big moments (picked at random in the game,
# so it never sounds the same twice). Count must match CHEER_COUNT in
# src/utils/voice.ts. Said a bit higher than the rest: excited.
CHEERS = ['وَاو!', 'يَاي!', 'بُرَافُو!', 'شَاطِر!', 'هَايِل!', 'جَمِيل!']
CHEER_PITCH = 2  # extra semitones on top of the style

OUT = Path(__file__).resolve().parents[2] / 'public' / 'audio'

# Voice styles. The raw voice is a deep adult male, which sounds slow and a
# bit scary to small children, so the default is quicker and pitched up
# with shifted formants: a smaller, friendlier, cartoon-like voice.
# (length_scale < 1 = faster; pitch in semitones.)
STYLES = {
    'gentle': dict(length=1.0, pitch=3, formant='preserved'),
    'cartoon': dict(length=0.92, pitch=5, formant='shifted'),
    'chipmunk': dict(length=0.88, pitch=7, formant='shifted'),
}
DEFAULT_STYLE = 'cartoon'


def synth(voice: PiperVoice, text: str, path: Path, style: dict, extra_pitch: float = 0) -> None:
    # Higher noise = livelier, less monotone prosody. Every text ends in "!"
    # (a real token for this voice), which lifts the intonation.
    config = SynthesisConfig(length_scale=style['length'], noise_scale=0.8, noise_w_scale=1.0)
    if not text.endswith('!'):
        text += '!'
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wav:
        voice.synthesize_wav(text, wav, syn_config=config)
    ratio = 2 ** ((style['pitch'] + extra_pitch) / 12)
    trim = 'silenceremove=start_periods=1:start_threshold=-45dB'
    chain = ','.join([
        trim, 'areverse', trim, 'areverse',
        f"rubberband=pitch={ratio:.4f}:formant={style['formant']}",
        'treble=g=3:f=3000',  # brighter, less boomy
        'loudnorm=I=-16:TP=-1.5:LRA=7',
        'apad=pad_dur=0.05',
    ])
    subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', '-i', 'pipe:0', '-af', chain, '-ac', '1', '-ar', '22050',
         '-codec:a', 'libmp3lame', '-b:a', '48k', str(path)],
        input=buf.getvalue(), check=True)


def main() -> None:
    """generate.py MODEL [STYLE] [OUT_DIR]"""
    voice = PiperVoice.load(sys.argv[1])
    voice.use_tashkeel = False  # our texts already carry diacritics
    style = STYLES[sys.argv[2] if len(sys.argv) > 2 else DEFAULT_STYLE]
    out = Path(sys.argv[3]) if len(sys.argv) > 3 else OUT
    out.mkdir(parents=True, exist_ok=True)
    for i, (name, word) in enumerate(TEXTS):
        synth(voice, name, out / f'letter-{i}.mp3', style)
        synth(voice, word, out / f'word-{i}.mp3', style)
    for name, text in EXTRA.items():
        synth(voice, text, out / f'{name}.mp3', style)
    for i, text in enumerate(CHEERS):
        synth(voice, text, out / f'cheer-{i}.mp3', style, CHEER_PITCH)


if __name__ == '__main__':
    main()
