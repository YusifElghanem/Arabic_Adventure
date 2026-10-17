# Credits

## Word pictures: Microsoft Fluent Emoji (Flat)
The pictures in `public/emoji/` are from **Fluent Emoji** by Microsoft
Corporation, used under the **MIT License**.
Source: https://github.com/microsoft/fluentui-emoji ·
License: `public/emoji/LICENSE-fluentui-emoji.txt`

## Font: Baloo Bhaijaan 2
**Baloo Bhaijaan 2** by Ek Type, licensed under the **SIL Open Font License
1.1**, bundled via [Fontsource](https://fontsource.org/fonts/baloo-bhaijaan-2)
(`@fontsource/baloo-bhaijaan-2`).

## Voice: Microsoft neural TTS
The spoken letter names, words and cheers in `public/audio/` were generated
with Microsoft's neural voice `ar-EG-SalmaNeural` through the Edge "Read
aloud" service ([edge-tts](https://github.com/rany2/edge-tts)), by
`scripts/voice/generate.py`. Microsoft's terms for this free service don't
clearly cover redistribution in a published project; for a commercial
release, regenerate with an Azure Speech subscription or replace the clips
with human recordings (same file names).

## Everything else
All other art (sky, sun, clouds, hills, candy platforms, flowers, the
character, letters, Mystery Block, lion, stars, rainbow) is original and
generated in code (`src/game/art/`). Sounds are synthesised at runtime
(`src/utils/sound.ts`).
