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

## Voice: Piper TTS, "kareem" Arabic voice
The spoken letter names and words in `public/audio/` were generated offline
with [Piper](https://github.com/rhasspy/piper) (MIT) using the
`ar_JO-kareem-medium` voice (rhasspy/piper-voices, listed as MIT; trained on
the dataset at https://github.com/AliMokhammad/arabicttstrain/, whose
licence its model card says to "see URL"). Generator:
`scripts/voice/generate.py`. They can be replaced by human recordings with
the same file names.

## Everything else
All other art (sky, sun, clouds, hills, candy platforms, flowers, the
character, letters, Mystery Block, lion, stars, rainbow) is original and
generated in code (`src/game/art/`). Sounds are synthesised at runtime
(`src/utils/sound.ts`).
