# Voice clips generator

`generate.py` makes `public/audio/*.mp3` + `manifest.json` (28 letter names,
28 words, 6 cheers, "أحسنت") with Microsoft's neural voice
`ar-EG-SalmaNeural` (edge-tts).

The Claude sandbox can't reach Microsoft's service, so
`.github/workflows/voice.yml` runs it on GitHub whenever this folder changes
(or by hand from the Actions tab), commits the clips and redeploys. Pull
before pushing again afterwards.

Locally (any computer with internet and ffmpeg):

```bash
pip install edge-tts==7.3.1
python3 scripts/voice/generate.py            # or pass another voice, e.g. ar-EG-ShakirNeural
```

To fix a word's pronunciation, add diacritics to it in `TEXTS`.
