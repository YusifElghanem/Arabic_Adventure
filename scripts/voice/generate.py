"""Generate the spoken clips into public/audio/ with Microsoft's neural voices.

Uses edge-tts (the Edge "Read aloud" voices). The sandbox can't reach that
service, so this runs in GitHub Actions (.github/workflows/voice.yml), which
commits the result. It also runs on any computer with internet:

    pip install edge-tts==7.3.1   # plus ffmpeg
    python3 scripts/voice/generate.py [voice]

Writes letter-<i>.mp3 / word-<i>.mp3 (i = index in src/game/letters.ts),
cheer-<i>.mp3, well-done.mp3 and manifest.json (the clip names the game may
play; without it the game falls back to the device's own voice).
"""
import asyncio
import json
import subprocess
import sys
from pathlib import Path

import edge_tts

# Egyptian, warm female voice. Alternatives: ar-EG-ShakirNeural (male),
# ar-SA-ZariyahNeural (Saudi, female).
VOICE = sys.argv[1] if len(sys.argv) > 1 else 'ar-EG-SalmaNeural'
# A touch brighter and livelier for small children; not slowed down.
RATE, PITCH = '+0%', '+12Hz'

# (letter name, word): same order as LETTERS. Diacritics only where the
# voice could misread the word.
TEXTS = [
    ('ألف', 'أسد'), ('باء', 'بطة'), ('تاء', 'تُفّاحة'), ('ثاء', 'ثعلب'),
    ('جيم', 'جمل'), ('حاء', 'حصان'), ('خاء', 'خروف'), ('دال', 'دُبّ'),
    ('ذال', 'ذُرة'), ('راء', 'ريشة'), ('زاي', 'زرافة'), ('سين', 'سمكة'),
    ('شين', 'شمس'), ('صاد', 'صاروخ'), ('ضاد', 'ضِفدع'), ('طاء', 'طائرة'),
    ('ظاء', 'ظرف'), ('عين', 'عِنب'), ('غين', 'غيمة'), ('فاء', 'فيل'),
    ('قاف', 'قِطّة'), ('كاف', 'كلب'), ('لام', 'ليمون'), ('ميم', 'موز'),
    ('نون', 'نحلة'), ('هاء', 'هدية'), ('واو', 'وردة'), ('ياء', 'يد'),
]
# Count must match CHEER_COUNT in src/utils/voice.ts.
CHEERS = ['واو!', 'ياي!', 'برافو!', 'شاطر!', 'هايل!', 'جميل!']
EXTRA = {'well-done': 'أحسنت!'}

OUT = Path(__file__).resolve().parents[2] / 'public' / 'audio'
TRIM = ('silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
        'silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.05')


async def synth(text: str, name: str) -> str:
    raw = OUT / f'{name}.raw.mp3'
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH).save(str(raw))
            break
        except Exception:
            if attempt == 3:
                raise
            await asyncio.sleep(2 ** attempt)
    # Trim the leading/trailing silence so the voice starts right on cue.
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', TRIM, '-ac', '1',
                    '-codec:a', 'libmp3lame', '-b:a', '48k', str(OUT / f'{name}.mp3')], check=True)
    raw.unlink()
    return name


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = []
    for i, (name, word) in enumerate(TEXTS):
        jobs += [(name, f'letter-{i}'), (word, f'word-{i}')]
    jobs += [(text, f'cheer-{i}') for i, text in enumerate(CHEERS)]
    jobs += [(text, name) for name, text in EXTRA.items()]
    names = [await synth(text, name) for text, name in jobs]
    (OUT / 'manifest.json').write_text(json.dumps({'voice': VOICE, 'clips': names}, indent=1) + '\n')


if __name__ == '__main__':
    asyncio.run(main())
