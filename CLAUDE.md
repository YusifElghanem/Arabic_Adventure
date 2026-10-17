# CLAUDE.md

Guidance for AI assistants working on this repo. **Read `PLAN.md` first.** It
holds the roadmap, the agreed decisions and what to do next. When you finish
a task, tick it in `PLAN.md` and add a line to its progress log.

## The project
"مغامرة الحروف" (Arabic Adventure): a 2D candy-pop platformer that teaches
preschoolers (3–6) the 28 Arabic letters, written **without diacritics**. The
owner writes in Egyptian Arabic. Reply in Egyptian Arabic and keep code,
comments and commits in English.

Non-negotiables for the audience:
- No failure or punishment: no lives, no death. Falling into the cloud sea
  floats the child home in a bubble, and collected items are kept.
- Every jump is a full jump (no variable height: small kids tap). Generous
  coyote time and jump buffer. Gaps ≤ 160 px (a jump covers ~290 px).
- The game UI is icon-only. Text is only for parents (photo dialog).
- The character faces the viewer. Never mirror it, because that would show
  the child's photo backwards.
- The child's photo stays on the device (localStorage only).
- The owner wants to **save tokens**: reuse systems, generate content from
  data, prefer existing free assets over hand-drawing, and test in batches
  at the end rather than after every step.

## Stack
Vite 6 · TypeScript (strict) · React 19 · Tailwind 4 · Zustand 5 ·
**Phaser 3.90.0** (pinned, Arcade Physics) · Vitest 5 (jsdom). Node ≥ 22.12.

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests (must stay green)
npm run typecheck
npm run build
```

Deploy: every push to `claude/arabic-toddler-platformer-avmer4` runs
type-check + tests + build in GitHub Actions and deploys to GitHub Pages:
https://yusifelghanem.github.io/Arabic_Adventure/ . The old 3D (R3F)
prototype lives on `archive/3d-prototype`. Don't revive it.

## Layout
```
src/
  App.tsx, main.tsx            screens: title ↔ game (PhaserGame lazy-loaded)
  stores/useGameStore.ts       progress, session goals, outfit, face photo (persisted)
  stores/useInputStore.ts      left/right/jump from keyboard + touch (read by Phaser each frame)
  components/ui/               React overlays: TitleScreen, AvatarPreview (CSS puppet),
                               HUD, PauseMenu, LevelCompleteScreen, TouchControls,
                               PhotoUploadModal, ParentGateButton, icons
  game/
    PhaserGame.tsx, createGame.ts   React host + Phaser config (FIT + DPR canvas)
    bridge.ts                  store ↔ scene: pause/resume/restart on runId
    EventBus.ts                Phaser-free typed events (level-ready, preload-progress)
    constants.ts               design height, physics feel (gravity, speeds, coyote…)
    levels.ts                  ENGINE-FREE level data (platforms, mechanic positions, goals)
    assets.ts                  manifest: every SVG art piece → texture at 1×/2×
    art/                       all art as SVG generated in code (palette.ts, svg.ts helpers,
                               hills, clouds, platforms, flora, character, mechanics)
    world/                     ParallaxBackground, Platform, Decorations, Ambient
    player/                    controller.ts (pure, tested), Player.ts, PlayerPuppet.ts
    mechanics/                 MysteryBlock, LetterB, FloatingLetterA, Star, GoalGate
    scenes/                    Boot → Preload → Level
  utils/                       faceCropper (tested), sound (Web Audio synth), speech (ar TTS)
scripts/e2e/                   Playwright play-tests (see its README)
```

Key rules:
- `src/game/levels.ts`, `src/game/art/*` and `EventBus.ts` must **not import
  Phaser**. React imports them, and Phaser has to stay out of the main bundle.
- New art: add a builder in `src/game/art/` and an entry to `ART`
  (`art/index.ts`). `art.test.ts` automatically checks that it is valid SVG
  at its declared size. Colours come from `palette.ts`.
- Mechanics talk to the store directly (`useGameStore.getState()`), and
  subscribe and unsubscribe on scene `SHUTDOWN`.

## Gotchas learned the hard way
- **Phaser loads `data:` URIs with `atob`.** SVG data URIs must be base64
  (`toDataUri` in `art/svg.ts`); percent-encoded ones break loading.
- **TileSprites wrap vertically**, so a solid bottom row bleeds into the top
  edge as a faint line. Strips keep `STRIP_BOTTOM_PADDING` transparent rows
  and a solid fill below.
- **Scale FIT mode:** resize with `game.scale.setGameSize()`, not `resize()`,
  or the aspect ratio never updates on rotation.
- **`fps.panicMax: 20`:** Phaser's default 120 clamps frames to 1/60 s at
  start, so slow devices begin every level in slow motion.
- **Arcade:** detect "hit from below" with `playerBody.touching.up` inside the
  collider callback. It is checked every physics step, so it is reliable.
- **Zoom vs scrollFactor-0 objects:** Phaser zooms around the camera centre.
  Use `world/view.ts#fixedView()` to cover the screen.
- **Camera bounds on tall screens** grow upwards (see `LevelScene.applyZoom`),
  so the extra height becomes sky.
- **Seeded decoration:** always consume the same random numbers regardless of
  settings (reduced motion), or levels change layout.
- **React StrictMode is ON** and the Phaser host is safe with it (one canvas).
- Phaser's keyboard is disabled. Input flows through `useInputStore`
  (`useKeyboardControls` + `TouchControls`).

## Testing
- Unit: `npm test`. Pure logic gets tests: controller, store, bridge,
  scaling, art seams and validity, face cropper.
- Browser: `npm run dev`, then `node scripts/e2e/full-playthrough.cjs` (and the
  others listed in `scripts/e2e/README.md`). They rely on dev-only hooks
  `window.__game` (stores) and `window.__phaser` (game; `scene.getScene('Level')`
  exposes `player`, `letterB`, `mysteryBlock`). These hooks are stripped from
  production builds.
- Headless Chromium here renders in software at ~8–10 fps. Allow generous
  timeouts, and don't mistake it for a game bug.

## Cloud sandbox notes
- `*.github.io` is blocked by the proxy, so the live site can't be fetched from
  the container. Confirm deploys via the GitHub Actions run instead.
- Never `pkill -f vite`: your own shell command line contains "vite" and gets
  killed. Use `pgrep -f "^node .*vite" | xargs -r kill`.
- Playwright: `/opt/node-tools/node_modules/playwright`. Chromium launch args:
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
- Commit with clear messages and push to the branch above. Don't open PRs
  unless asked.
