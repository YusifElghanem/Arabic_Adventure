# Voice clips generator

Regenerates `public/audio/*.mp3` (28 letter names, 28 words, "أحسنت") with
the offline neural TTS **Piper** and its Arabic voice `ar_JO-kareem-medium`.

```bash
pip install piper-tts            # needs ffmpeg with libmp3lame
curl -sSLO https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-ar_JO-kareem-medium.tar.bz2
tar xjf vits-piper-ar_JO-kareem-medium.tar.bz2
python3 -I scripts/voice/generate.py vits-piper-ar_JO-kareem-medium/ar_JO-kareem-medium.onnx
```

The texts live in `generate.py` (`TEXTS`, same order as `src/game/letters.ts`),
with diacritics and in pausal form. To fix a word's pronunciation, change its
diacritics there and check with `voice.phonemize(text)`. Don't commit the
voice model (~60 MB).
