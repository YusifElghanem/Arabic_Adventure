# HANDOFF: the complete specification of "مغامرة الحروف" (Arabic Adventure)

> **بالعربي:** الملف ده هو المواصفات الكاملة للمشروع. أي حد (إنسان أو Claude) يكمل الشغل
> لازم يقراه الأول عشان يطلع بنفس النتيجة بالظبط: نفس الشكل، ونفس الأرقام، ونفس طريقة الشغل.
> الخطة والمهام في `PLAN.md`، والملخص السريع في `CLAUDE.md`، والتفاصيل كلها هنا.

This document is written so that a **new session with no memory of previous
conversations** can continue the work and produce results consistent with
what exists: the same art style, the same feel, the same numbers, the same
working process. When this document and the code disagree, **the code is the
source of truth**. Fix this document in the same commit.

Contents
1. How to use this document (session start checklist)
2. Product vision, audience and teaching rules
3. History and decisions (why things are the way they are)
4. Working agreement with the owner (process, language, tokens)
5. Repository layout, file by file
6. Tooling, build, CI and deployment
7. Runtime architecture (React ↔ store ↔ Phaser)
8. Store reference (useGameStore, useInputStore)
9. Rendering, scaling and cameras
10. The art system (SVG-in-code), with a full style guide
11. The world: parallax, platforms, decoration, ambience
12. The player: rig, animation, controller, respawn, face photo
13. Mechanics of Level 1 (block, ب, أ + lion, stars, rainbow)
14. Level 1 exact layout and reachability maths
15. Sound and speech
16. React UI screens
17. Face cropper (photo pipeline)
18. Testing (unit + browser play-tests) and acceptance checklists
19. Gotchas and lessons learned
20. WORK IN PROGRESS: the template level system (Step 1), exact design
21. Roadmap specifications (Steps 2–5) with concrete numbers
22. Conventions (code, comments, commits, branches)
23. Glossary

---

## 1. How to use this document (session start checklist)

Do these in order at the start of every new session:

1. Read `PLAN.md` (Arabic). It lists what is done (✅), what is next (unticked
   boxes, in order), and the progress log.
2. Read this file, at least sections 3, 4, 19, 20 and 22, plus the section
   for the area you will touch.
3. Check the repo state:
   ```bash
   git status --short
   git log --oneline | head -10
   git branch -a
   ```
   Work happens on branch `claude/arabic-toddler-platformer-avmer4`. Never
   push to another branch without explicit permission.
4. Install and verify that the baseline is green **before** changing anything:
   ```bash
   npm install
   npm run typecheck
   npm test            # must be all green
   ```
5. Pick the **first unticked task** in `PLAN.md`. Section 20 or 21 of this
   document specifies it in detail.
6. When the task is done:
   - Run `npm run typecheck && npm test && npm run build` (then delete `dist/`).
   - Run the relevant browser play-tests (section 18) against `npm run dev`.
   - Tick the box in `PLAN.md` and add a dated line to its progress log.
   - Update this document if you changed behaviour, numbers or structure.
   - Commit (section 22 format) and `git push -u origin claude/arabic-toddler-platformer-avmer4`.
   - Check the GitHub Actions run succeeded (the site can't be fetched from the
     cloud sandbox; see section 19).
7. Report to the owner **in Egyptian Arabic**, briefly: what was done, what
   was tested, any limitations, and what comes next.

---

## 2. Product vision, audience and teaching rules

### 2.1 What the game is
A cheerful **2D side-scrolling platformer** in a **candy-pop cartoon vector
style** (bright pastels, glossy highlights, smiling faces on everything),
for **preschoolers aged 3–6**, that teaches the **28 Arabic letters**
written **without diacritics (no tashkeel)**, as taught in kindergarten.

- The child plays **as themselves**: a parent can upload the child's photo,
  which is cropped to an oval and shown as the character's face.
- Each letter has a **"word friend"**: أ → أسد (lion), ب → بطة (duck), etc.
  The friend appears in the letter's level and celebrates.
- Target total play time: **2.5–3 hours**, consumed over many **short
  sessions of 10–20 minutes**. Young children never play two hours straight.
- Live site: https://yusifelghanem.github.io/Arabic_Adventure/

### 2.2 Non-negotiable rules for this audience
1. **No failure, no punishment.** No lives, no death, no game over, no
   timers that end the level, no losing collected items. Falling into the
   cloud sea floats the child back to the start inside a bubble, and
   everything collected is kept.
2. **Action without violence.** Obstacles push the child back gently and
   comically. Enemies are cute and turn into flowers or friends when jumped
   on. A "boss" is tickled, never hit.
3. **Every jump is a full jump.** No variable jump height: small children
   tap buttons rather than hold them. Coyote time 0.2 s, jump buffer 0.16 s.
4. **Gaps are short:** at most 160 px between platforms (a full jump covers
   ~290 px horizontally). Step-ups at most ~120 px (jump apex is ~182 px).
5. **Icon-only interface for the child.** No reading required anywhere the
   child interacts. Text exists only in the parent area (photo dialog), in
   Arabic.
6. **The character always faces the viewer** (three-quarter front view).
   Direction is shown by a lean and a slight head turn. **Never mirror the
   character**, because that would show the child's photo backwards.
7. **Privacy:** the photo never leaves the device. It is cropped in a canvas
   and stored only in `localStorage`. Nothing is uploaded and there are no
   analytics.
8. **Letters are always shown correctly.** Without diacritics, and in
   standard isolated form. When a level builds a letter from parts
   (skeleton + dots), the final state must display the real letter glyph.
9. **Encouragement only.** A wrong choice in a quiz gets a gentle wobble,
   never a buzzer or a red X. Finishing a level always earns at least one
   star.
10. **Accessibility:** `prefers-reduced-motion` reduces ambient motion
    (no drifting clouds, no spinning sun, no sparkle particles, gentler
    sway) without changing the layout.

### 2.3 Teaching design
- Letters are grouped by **shape families**, so children see that ب ت ث
  share a body and differ by dots. The core mechanic is **bringing the dots
  to the letter**: the child bonks Mystery Blocks, each releases a glowing
  dot, and the letter becomes complete when all its dots arrive.
- When a letter completes or is met, the device **speaks** the letter name
  and its word, for example "ألف… أسد" (only if an Arabic voice exists; see
  section 15).
- The level-complete screen shows the **letters learned**, in alphabet
  order.
- The title screen shows a **letter shelf** (learned letters lit up) for
  parents.

---

## 3. History and decisions (why things are the way they are)

Chronological, with the reasoning, so a new session doesn't undo deliberate
choices.

1. **Original brief (owner):** a 2.5D/3D platformer with React Three Fiber,
   Drei, @react-three/rapier and Zustand, built in phases, stopping after
   each phase for approval with the exact question "Ready for the next
   phase?".
2. **3D prototype built** (Phases 1–4 in R3F/Rapier). It worked, but:
   - Rapier collision-enter events were lost when several physics sub-steps
     ran in one frame (slow devices), because `@react-three/rapier` only
     fires `onCollisionEnter` inside `world.contactPair` *at drain time*,
     after the contact had already ended. The Mystery Block's "hit from
     below" was unreliable.
   - React StrictMode broke rapier collider event registration in dev.
   - The owner felt the 3D look was "too rigid for kindergarteners".
3. **Pivot to 2D (owner's decision):** "2D Smooth Cartoon / Vector Art",
   like Rayman Legends or Hollow Knight's smooth parallax, but candy-pop
   coloured. Engine choice: **Phaser 3** (owner approved; Phaser 3.90.0 was
   the latest 3.x when chosen; Phaser 4 exists but the owner said Phaser 3).
   The 3D code is archived on branch **`archive/3d-prototype`**. Don't
   revive it.
4. **2D Phase 1:** removed the 3D stack, bootstrapped Phaser behind a
   lazily-loaded React host, typed EventBus, store bridge, DPR-aware FIT
   scaling.
5. **2D Phase 2:** all art generated as SVG in TypeScript, plus the parallax
   world.
6. **Owner then asked to finish everything without stopping:** player,
   mechanics and Level 1 were completed in one go, tested and deployed.
7. **Token budget discussion (2026-10-17):** the owner wants to **save
   tokens**. A first full-content plan was estimated at 1.8–2.7M tokens and
   rejected as too expensive. The agreed plan:
   - one **template level** generated from per-letter data (instead of 28
     hand-made levels);
   - letters rendered from a **font** (Baloo Bhaijaan 2, OFL), not hand-drawn;
   - word pictures from **Microsoft Fluent Emoji Flat** (MIT, license
     verified from the official repo);
   - **7 worlds by palette swap** of the existing candy world;
   - **one reusable mini-game** ("pick the picture that starts with the
     letter");
   - **test in batches at the end**, not after every step.
   - Estimate: ~230–350k tokens for the base, plus ~200–280k for the action
     mechanics.
8. **Action ideas approved:** rolling watermelons and candy balls, cute bees
   that turn into flowers, a candy cannon, moving, crumbling and seesaw
   platforms, a squirrel chase, riding the word friend, catching the right
   letter from a letter rain, and a friendly end-of-world "boss" to tickle.
   Section 21 has the specs.
9. **Kenney assets (CC0) evaluated** but NOT used for backgrounds: mixing
   styles would hurt the consistent candy look. They may be used for small
   items if ever needed. **Tiled** was evaluated and not adopted: levels
   are tiny data lists, cheaper to write directly.
10. **Pronunciation audio:** no reliably licensed free set of Arabic letter
    recordings was found. The owner may record them (section 21.6).
    Meanwhile the Web Speech API is used, only when an Arabic voice exists.

---

## 4. Working agreement with the owner

- **Language:** the owner writes in **Egyptian Arabic**. Reply in Egyptian
  Arabic, short and clear, and avoid unexplained jargon. Code, comments,
  commit messages and this document are in English. `PLAN.md` is in Arabic.
- **Process:** work in clearly named steps. Report at the end of each step
  what was done and tested, then ask before starting the next, unless the
  owner has said to continue without stopping. The owner sometimes says
  "كمّل للآخر" (finish everything); then continue through all steps and
  report at the end.
- **No placeholders, no mock code.** Every file must be fully implemented
  and production-ready.
- **Save tokens** (the owner's explicit priority):
  - Reuse existing systems. Generate content from data.
  - Use the existing free assets (section 10.9) instead of drawing new art
    when possible.
  - Don't take screenshots after every small change. Batch the testing.
  - Don't re-read large files unnecessarily. Use `grep` to find what you
    need.
  - Keep progress reports short.
- **Honesty:** if something fails, say so with the output. If something
  couldn't be verified (for example the live site from the sandbox), say so.
- **Always commit and push** at the end of a step. The stop hook in this
  environment complains about uncommitted changes.
- **Never open a pull request** unless the owner asks.

---

## 5. Repository layout, file by file

```
.github/workflows/deploy.yml   CI: typecheck → tests → build → deploy GitHub Pages
index.html                     <html lang="ar" dir="rtl">, viewport no-zoom, #root, /src/main.tsx
vite.config.ts                 base from VITE_BASE, @ alias → src, phaser manual chunk, vitest jsdom
tsconfig.json                  solution file → tsconfig.app.json (src) + tsconfig.node.json (vite.config)
package.json                   scripts: dev, build (tsc -b && vite build), preview, typecheck, test, test:watch
PLAN.md                        Arabic roadmap + progress log (keep updated)
CLAUDE.md                      short auto-loaded guide → points here
README.md                      public readme
docs/HANDOFF.md                this file
public/emoji/*.svg             Fluent Emoji Flat pictures (MIT) + LICENSE-fluentui-emoji.txt
scripts/e2e/*.cjs              Playwright browser play-tests (+ README, config, playwright resolver)

src/
  main.tsx                     createRoot + <StrictMode>; dev-only window.__game hook
  App.tsx                      screen switch (title ↔ game), lazy PhaserGame, loader, overlays,
                               pause on tab hide, Esc/P toggles pause
  index.css                    Tailwind import, @theme tokens, keyframes (star-pop, gentle-pulse,
                               sun-dance, drift, avatar-*), reduced-motion override
  stores/
    useGameStore.ts            Zustand + persist: screens, outfit, face photo, levels, session, letters
    useGameStore.test.ts
    useInputStore.ts           left/right/jumpHeld/jumpPresses (+ horizontalAxis helper)
  hooks/
    useKeyboardControls.ts     window key listeners → useInputStore (enabled while playing)
  utils/
    faceCropper.ts(+test)      photo decode, face detect (FaceDetector → YCbCr skin → fallback), crop
    sound.ts                   Web Audio synthesiser: jump, land, collect, bump, pop, boing, roar, whoosh, win, tap
    speech.ts                  speakArabic(text) only if an Arabic voice exists (fallback)
    voice.ts                   say*(): plays public/audio clips (manifest), falls back to speech.ts
    random.ts                  (legacy helper from 3D era; art uses art/svg.ts createRandom)
  components/ui/
    TitleScreen.tsx            title, AvatarPreview, outfit radio buttons, Play, parent gate, mute, letter shelf
    AvatarPreview.tsx          the character from the same rig, as <img> layers + CSS animation (no Phaser)
    HUD.tsx                    sun progress ring + star icons; mute + pause buttons (icon-only)
    TouchControls.tsx          big left/right/jump buttons on touch devices, multi-touch safe
    PauseMenu.tsx              home / resume / replay (exports MenuButton)
    LevelCompleteScreen.tsx    dancing sun, stars pop in, letters learned (alphabet order), home/replay/next
    PhotoUploadModal.tsx       parent dialog: camera/gallery/drag-drop, auto face oval, pan/zoom, save/remove
    ParentGateButton.tsx       1.2 s press-and-hold to open the parent dialog (Enter works for keyboards)
    LoadingScreen.tsx          dancing sun while Phaser loads
    ErrorBoundary.tsx          friendly Arabic error card (e.g. no WebGL) with retry
    icons.tsx                  inline SVG icons + illustrations (SunIcon with progress ring, StarIcon,
                               OnesieIcon, ExplorerIcon, Play/Pause/Home/Replay/Next/Sound/Arrows/Jump/…)
  game/
    PhaserGame.tsx             React host div; createGame on mount; destroy on unmount; onReady via EventBus
    createGame.ts              Phaser.Game config, ResizeObserver → setGameSize, LevelController, dev __phaser
    bridge.ts(+test)           connectGameToStore(controller): screen→pause/resume, runId→restart
    EventBus.ts(+test)         TypedEventBus (no Phaser import): 'preload-progress', 'level-ready'
    constants.ts               DESIGN_HEIGHT 720, MIN_VISIBLE_WIDTH 960, MAX_PIXEL_RATIO 2, SKY_COLOR,
                               SceneKeys, LevelSceneData, player feel constants
    scaling.ts(+test)          computeCanvasSize(css, dpr), computeCameraZoom(w, h)
    levels.ts                  ENGINE-FREE level catalog (LevelDefinition, PlatformSpec, LevelMechanics)
    letters.ts                 ENGINE-FREE 28-letter table (WIP Step 1; see section 20)
    assets.ts                  manifest from ART, chooseArtResolution, queueAssets, ART_RESOLUTION_KEY
    art/
      palette.ts               PALETTE + SPRINKLES
      svg.ts                   n(), svgDocument, toDataUri (base64), createRandom, range,
                               sampleCurve, periodicCurvePath, curvePath, curveContinue
      sky.ts, sun.ts, clouds.ts, hills.ts, platforms.ts, flora.ts, character.ts, mechanics.ts
      index.ts                 ArtKeys + ART list (incl. CHARACTER_ART, MECHANIC_ART)
      art.test.ts              every piece valid SVG at its size; seams; clouds fit; encoding
    world/
      depths.ts                Depth constants (draw order)
      view.ts(+test)           fixedView(camera), layerLeft, wrap
      ParallaxBackground.ts    sky, sun, far/near clouds, 3 hill strips, cloud sea
      Platform.ts              tile images + static Arcade body (Zone); platformWidth()
      Decorations.ts           seeded scatter of trees/gumdrops/mushrooms/flowers/tufts with tweens
      Ambient.ts               sparkle particles across the view + figure-eight butterflies
    player/
      controller.ts(+test)     pure stepController (accel, coyote, buffer, fall cap)
      Player.ts                Arcade body (Zone), input → controller, launch, respawn bubble, face load
      PlayerPuppet.ts          Container of rig parts, procedural animation, blink, bubble
    mechanics/
      MysteryBlock.ts          bonk from below → glow dot flies along a Bézier → callback
      LetterB.ts               ب bowl trampoline + ghost dot → real dot, celebration
      FloatingLetterA.ts       giant smiling أ + lion; sensor → greet (flip, roar, speech)
      Star.ts                  collectible star with burst
      GoalGate.ts              rainbow; finishes level if letter complete, else wobble + hint
    scenes/
      BootScene.ts             disable context menu → Preload
      PreloadScene.ts          choose art resolution, queue all SVG textures, → Level(current session)
      LevelScene.ts            builds world, mechanics, player, colliders, camera; update loop
```

---

## 6. Tooling, build, CI and deployment

### 6.1 Versions (from package.json / lockfile)
- Node **≥ 22.12** (required by Vitest 5). npm 10.
- `phaser` **3.90.0** (pinned exactly, `--save-exact`).
- `react` / `react-dom` ^19.1 (lockfile resolved 19.3), `zustand` ^5.0.5.
- `@fontsource/baloo-bhaijaan-2` ^5 (OFL-1.1). Installed for Step 1 and not
  yet imported (section 20).
- Dev: `vite` ^6.4 (6.4.x), `@vitejs/plugin-react` ^4.5, `tailwindcss` +
  `@tailwindcss/vite` ^4.1, `typescript` ~5.8.3, `vitest` ^5.0.3, `jsdom` ^26.1,
  `@types/*`.
- Vitest 3 and 4 were rejected: open security advisories, and 4.x also hit an
  npm 10 arborist bug ("Cannot read properties of null (reading 'edgesOut')").
  `npm audit` must report **0 vulnerabilities**.

### 6.2 TypeScript
- `tsconfig.app.json`: strict, `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`,
  `verbatimModuleSyntax` (use `import type`), `moduleResolution: bundler`,
  `jsx: react-jsx`, `types: ["vite/client"]`, paths `@/*` → `src/*`.
- `tsconfig.node.json` covers `vite.config.ts` only (`types: ["node"]`).
- `npm run typecheck` = `tsc -b`. It must pass with zero errors.

### 6.3 Vite
- `base: process.env.VITE_BASE ?? '/'`. CI sets `VITE_BASE=/Arabic_Adventure/`
  (from `actions/configure-pages` output `base_path` + `/`).
- `server.host: true` (LAN testing on tablets), port 5173.
- Build: `target es2022`, sourcemaps on, `manualChunks: { phaser: ['phaser'] }`,
  `chunkSizeWarningLimit: 1600` (Phaser ≈ 1.48 MB minified, ≈ 340 kB gzipped).
- Bundle budget (as of Level 1): main `index` ≈ 284 kB (≈ 90 kB gz), `PhaserGame`
  chunk ≈ 56 kB (≈ 18 kB gz), `phaser` chunk ≈ 340 kB gz, CSS ≈ 7 kB gz.
  **Phaser must never end up in the main bundle.** React-side code may only
  import engine-free modules (`levels.ts`, `letters.ts`, `art/*`,
  `EventBus.ts`).
- Vitest config lives in `vite.config.ts` (`/// <reference types="vitest/config" />`,
  `environment: 'jsdom'`, `include: ['src/**/*.test.{ts,tsx}']`).

### 6.4 CI / deployment (`.github/workflows/deploy.yml`)
- Triggers: push to `main` or `claude/arabic-toddler-platformer-avmer4`,
  pull requests, and manual dispatch.
- Job `build`: checkout → setup-node 22 (npm cache) → `npm ci` →
  `npm run typecheck` → `npm test` → check `src/main.tsx` exists →
  (non-PR) `actions/configure-pages@v5` → `npm run build` with `VITE_BASE` →
  (non-PR) `actions/upload-pages-artifact@v3` (`dist`).
- Job `deploy`: `actions/deploy-pages@v4` to the `github-pages` environment.
- Permissions: `contents: read`, `pages: write`, `id-token: write`.
  Concurrency group `pages-${ref}`, with no cancel-in-progress.
- Repo settings: Settings → Pages → Source = **GitHub Actions** (already set
  by the owner). The branch above is currently the repo's default branch.
- The repo is **public**: `YusifElghanem/Arabic_Adventure`.

---

## 7. Runtime architecture (React ↔ store ↔ Phaser)

### 7.1 The big picture
```
 ┌──────────── React (main bundle) ────────────┐        ┌──── Phaser (lazy chunk) ────┐
 │ App.tsx                                      │        │ createGame(parent)           │
 │  ├─ TitleScreen (AvatarPreview, outfits…)    │        │  Boot → Preload → Level      │
 │  ├─ <Suspense><PhaserGame/></Suspense> ──────┼──────► │  LevelScene.update():        │
 │  ├─ HUD, TouchControls, PauseMenu,           │        │   reads useInputStore        │
 │  │   LevelCompleteScreen, LoadingScreen      │        │   calls useGameStore actions │
 │  └─ PhotoUploadModal                         │        │   emits EventBus events      │
 └──────────────▲───────────────────────────────┘        └──────────────▲───────────────┘
                │ subscribe/select                                       │ getState/subscribe
         ┌──────┴───────────────┐   ┌──────────────────┐                 │
         │ useGameStore (persist)├──►│ bridge.ts         ├── pause/resume/restart LevelScene
         │ useInputStore         │   │ connectGameToStore│
         └───────────────────────┘   └──────────────────┘
```
- **Zustand is the single source of truth** for everything the UI shows:
  screen, session progress (stars, dots), outfit, photo, unlocked levels,
  discovered letters, mute.
- **Phaser reads input** from `useInputStore.getState()` once per frame
  (no React re-render) and **writes progress** through store actions
  (`collectStar`, `collectLetterDot`, `discoverLetter`, `completeLevel`).
- **React reads progress** with selectors (`useGameStore(selector)`); the HUD
  updates automatically.
- **The bridge** (`game/bridge.ts`) watches the store and drives the scene:
  - screen `playing` → `resumeLevel()`;
  - screen `paused` or `levelComplete` → `pauseLevel()` (Phaser pauses update,
    tweens, timers and physics for the scene);
  - a new `session.runId` (Play again, Next) → `startLevel({levelId, runId})`,
    which stops and starts the Level scene so it is rebuilt from scratch.
  - Before the level scene has started (`isLevelStarted() === false`), the
    bridge does nothing; the Preload scene starts the level itself.
- **EventBus** (`game/EventBus.ts`) carries one-way game→React signals that
  are not state: `'level-ready'` (the first frame rendered, so the loader
  hides) and `'preload-progress'` (0..1). It has **no Phaser import**.

### 7.2 Screen state machine (`GameScreen`)
```
title ──startLevel(id)──► playing ⇄ paused        (pauseGame / resumeGame, Esc/P, tab hidden)
  ▲                         │
  │                         └─completeLevel()──► levelComplete
  └──────────exitLevel()────────────────────────────┘ (Home button)
levelComplete ──startLevel(id) (replay or next)──► playing (new runId)
```
`avatarSetup` exists in the type but is unused (the title screen does avatar
setup).

### 7.3 App.tsx behaviour
- `inGame = session !== null && screen ∈ {playing, paused, levelComplete}`.
- In game: an `ErrorBoundary key="game"` (reset → `exitLevel`), the lazy
  `PhaserGame` inside `Suspense fallback={null}`, and `LoadingScreen` until
  `onReady` (from EventBus `level-ready`). After that: `HUD` + `TouchControls`
  while playing, `PauseMenu` while paused, `LevelCompleteScreen` when
  complete.
- Otherwise: `ErrorBoundary key="title"` → `TitleScreen`.
- `PhotoUploadModal` is always mounted (it renders nothing unless open).
- `useKeyboardControls(screen === 'playing')`.
- `visibilitychange` → `pauseGame()` when hidden.
- Esc or P toggles pause (ignored while the photo modal is open).

### 7.4 PhaserGame lifecycle
- `PhaserGame.tsx` renders `<div className="absolute inset-0 touch-none overflow-hidden"/>`
  and in `useEffect` calls `createGame(div)`. Cleanup calls `destroy()`, which
  disconnects the bridge and the ResizeObserver and calls `game.destroy(true)`.
- Safe under **React StrictMode** (mount → unmount → mount): verified by an
  e2e test asserting exactly one `<canvas>`.
- `onReady` is held in a ref, so re-renders don't re-create the game.

### 7.5 Scenes
- **BootScene**: `this.input.mouse?.disableContextMenu()` → start Preload.
- **PreloadScene**:
  - `preload()`: compute `resolution = chooseArtResolution(computeCameraZoom(gameW, gameH))`
    (2 if zoom > 1.15, else 1), store it in the registry under
    `ART_RESOLUTION_KEY = 'artResolution'`, and queue every manifest SVG at
    `width/height × resolution` (pieces with `fixedResolution` use that value).
    Loader progress → EventBus. Load errors → `console.error`.
  - `create()`: emit progress 1, read `currentLevelData()` from the store, and
    start the Level scene with `{levelId, runId}`.
- **LevelScene**: see sections 11–14. `init(data)` resolves the level
  definition (throws for unknown ids). `create()` registers goals (only if
  `session.runId === data.runId`), builds the world, and emits `level-ready`
  on the first `POST_UPDATE`. `update()` calls `player.update`, look-ahead,
  `background.update`, `ambient.update`.

---

## 8. Store reference

### 8.1 `useGameStore` (src/stores/useGameStore.ts)
Zustand store with `persist` middleware, localStorage key
**`arabic-adventure:game`**, version **1**.

**Exports:** `Outfit` ('onesie' | 'explorer'), `OUTFITS`, `GameScreen`,
`ARABIC_LETTERS` (28 letters, in order:
أ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي), `ArabicLetter`,
`LEVEL_COUNT` (**27** = `TOTAL_LEVELS`; a test keeps them in sync),
`MAX_STARS_PER_LEVEL = 3`, `LevelRecord {completed, bestStars}`,
`LevelGoals {totalStars, letterDotsRequired}`,
`LevelSession {levelId, runId, starsCollected, totalStars, letterDotsCollected, letterDotsRequired}`,
`computeAwardedStars(session)`, `useGameStore`, and the selectors
`selectSunProgress`, `selectIsLetterComplete`, `selectIsPlaying`.

**Persisted state:**

| field | default | notes |
|---|---|---|
| `outfit` | 'onesie' | |
| `unlockedLevels` | [1] | always contains 1, sorted, unique, valid ids only |
| `levelRecords` | {} | `{[id]: {completed, bestStars 0..3}}` |
| `faceTextureUrl` | null | only `data:image/…` URLs are persisted (blob URLs never) |
| `lettersDiscovered` | [] | only valid `ARABIC_LETTERS` |
| `isMuted` | false | |

**Transient state:** `screen` ('title'), `isPhotoModalOpen` (false),
`session` (null), `runCounter` (0), `hasHydrated`.

**Actions and their exact semantics:**
- `setScreen(s)`; `openPhotoModal()` and `closePhotoModal()`;
  `pauseGame()` (only from 'playing'); `resumeGame()` (only from 'paused');
  `setMuted(b)`; `toggleMuted()`.
- `setOutfit(o)` (ignores invalid values); `cycleOutfit()`.
- `setFaceTextureUrl(url)`: accepts only `data:image/` or `blob:` URLs, otherwise
  `console.warn` and ignore. A previous `blob:` URL is revoked.
  `clearFaceTexture()` also revokes.
- `isLevelUnlocked(id)`.
- `startLevel(id)`: returns false for invalid ids (`1..LEVEL_COUNT`) or locked
  levels. Otherwise it sets screen 'playing', closes the photo modal,
  increments `runCounter`, and creates a fresh session with
  `runId = runCounter + 1`, zero stars and dots, and zero goals.
- `registerLevelGoals({totalStars, letterDotsRequired})`: sets the session
  goals (floored, ≥ 0) and clamps the collected counts.
- `collectStar()` and `collectLetterDot()`: only while screen === 'playing'
  and below the goal (they are no-ops otherwise; important for paused
  tweens).
- `discoverLetter(letter)`: adds once.
- `completeLevel()`: computes the awarded stars (`round(collected/total × 3)`
  clamped to 1..3; 3 if total is 0), records
  `bestStars = max(previous, awarded)` and `completed: true`, unlocks `id + 1`
  if valid, and sets screen 'levelComplete'. **The session is kept**, so the
  complete screen can read it.
- `exitLevel()`: screen 'title', session null.
- `resetProgress()`: back to defaults (revokes the blob).

**Storage safety:** a custom `StateStorage` wraps localStorage in try/catch.
On a quota error it retries the save **without the photo** and warns.
`merge()` sanitises everything read back: invalid outfits, levels, records
and letters are dropped, `bestStars` is clamped, and non-data photo URLs are
dropped. Corrupt JSON falls back to defaults.

**Selectors:**
- `selectSunProgress` = `(stars + dots) / (totalStars + dotsRequired)`, clamped to 0..1
  (0 without a session). It drives the HUD sun ring.
- `selectIsLetterComplete` = session exists, `dotsRequired > 0`, and
  `dotsCollected ≥ required`.

### 8.2 `useInputStore` (src/stores/useInputStore.ts)
`{left, right, jumpHeld, jumpPresses, setLeft, setRight, pressJump, releaseJump, releaseAll}`.
- `pressJump()` increments **`jumpPresses`** only when not already held, so
  quick taps between frames are never lost. The controller compares the
  counter, not a boolean.
- `horizontalAxis(state)` = `(right?1:0) − (left?1:0)`.
- Sources: `useKeyboardControls` (ArrowLeft/KeyA, ArrowRight/KeyD,
  Space/ArrowUp/KeyW; ignores modifier keys and text inputs; `preventDefault`
  on game keys; releases all on `blur` and when disabled) and `TouchControls`.

---

## 9. Rendering, scaling and cameras

### 9.1 Canvas sizing
- Phaser 3 has no DPR setting. We size the canvas **backing store in device
  pixels** and let **Scale.FIT** shrink it to the container in CSS:
  `computeCanvasSize(cssW, cssH, dpr)` → `{width: round(cssW·r), height: round(cssH·r), pixelRatio: r}`
  with `r = clamp(dpr, 1, MAX_PIXEL_RATIO = 2)`, minimum 1×1.
- A `ResizeObserver` on the host div recomputes the size and calls
  **`game.scale.setGameSize(w, h)`**. `resize()` would NOT update FIT's
  aspect ratio, which breaks rotation.
- Game config essentials: `type AUTO`, `backgroundColor SKY_COLOR (#8fd8ff)`,
  `banner false`, `scale {mode FIT, autoCenter CENTER_BOTH}`,
  `render {antialias true, pixelArt false, roundPixels false, powerPreference high-performance}`,
  `physics arcade {gravity y: GRAVITY 2000}`,
  `fps {target 60, smoothStep true, panicMax 20}`,
  `input {keyboard false, mouse true, touch true, gamepad false}`,
  `audio {noAudio true}`.

### 9.2 Camera zoom
`computeCameraZoom(w, h) = min(h / DESIGN_HEIGHT(720), w / MIN_VISIBLE_WIDTH(960))`
(1 for zero sizes). Every screen sees 720 world px of height, and portrait
phones zoom out further so at least 960 world px of width stay visible.
Examples: 1280×720 → 1; 2560×1440 → 2; a 780×1688 phone → 0.8125.

### 9.3 Camera bounds on tall screens
`LevelScene.applyZoom()` (also on scale RESIZE):
`viewHeight = gameHeight / zoom; top = min(0, level.height − viewHeight)`,
then `camera.setBounds(0, top, level.width, level.height − top)`. When the
view is taller than the world, the bounds grow **upwards**, so the extra
space is sky, never empty space below the world.

### 9.4 Fixed (screen-space) objects under zoom
Phaser zooms around the camera centre. A `scrollFactor(0)` object at x shows
at `(x − W/2)·z + W/2`. `world/view.ts#fixedView(camera)` returns the
rectangle that covers the screen in that space:
`{left: W/2 − W/(2z), top: H/2 − H/(2z), width: W/z, height: H/z}`.
`layerLeft(camera, view, factor) = camera.scrollX·factor + view.left` is the
layer-space x at the screen's left edge for a parallax factor.
`wrap(v, size)` is a positive modulo.

### 9.5 Follow camera (LevelScene)
- `camera.startFollow(player.puppet.container, false, lerpX 0.1, lerpY 0.15, 0, CAMERA_FOLLOW_OFFSET_Y = 120)`.
  The positive y offset keeps the child in the lower part of the screen.
- `camera.setDeadzone(60, 150)`.
- Look-ahead: `target = clamp(−vx · 0.45, −160, 160)`, smoothed with
  `1 − exp(−2.5·dt)`, applied via `setFollowOffset(lookAhead, 120)`.
- On create: `camera.centerOn(spawn.x, spawn.y − 120)`.
- `roundPixels false` (smooth vector motion).

---

## 10. The art system (SVG generated in code), with a full style guide

### 10.1 Principles
- **All original art is SVG markup generated by TypeScript functions** in
  `src/game/art/`. There are no hand-made image files except the Fluent
  Emoji pictures in `public/emoji/` (section 10.9).
- Each piece is a pure function `() => string` returning a full SVG document
  (`svgDocument(w, h, body, defs)`), with a **logical size** in world pixels.
- **Rasterisation:** `assets.ts` turns each piece into a base64 data URI
  (`toDataUri`) and Phaser's loader rasterises it at
  `logical size × resolution`, where `resolution` is 1 or 2 (2 when the
  camera zoom is above 1.15). Game objects then use `setScale(1/resolution)`
  (TileSprites: `setScale(1/r)` and `tilePositionX` in texture pixels, i.e.
  `× r`). The result is crisp on retina without wasting memory on small
  screens.
- **Determinism:** randomness inside art uses `createRandom(seed)`
  (mulberry32) from `art/svg.ts`, never `Math.random`. The same input always
  gives the same picture, which `art.test.ts` asserts.
- **Engine-free:** files in `art/` must not import Phaser. The React title
  screen imports `art/character.ts` and `art/svg.ts`.
- **Every piece must be registered** in `ART` (`art/index.ts`). `art.test.ts`
  checks automatically that it is valid XML (DOMParser, no `parsererror`),
  that the root is `<svg>`, and that its `width` and `height` equal the
  declared logical size. **Add new pieces to `ART` and the tests cover them
  for free.**

### 10.2 Visual style guide (follow this for any new art)
1. **Palette only** from `art/palette.ts` (table below). If a new colour is
   genuinely needed, add it to the palette with a descriptive name.
2. **Shapes:** soft, round, chunky. Rounded caps and joins on strokes. No
   sharp corners on anything the child touches.
3. **Shading:** a vertical `linearGradient` from a lighter top to a deeper
   bottom (for example caramel `#ffd59c → #f08f4c`), or a `radialGradient`
   with its centre offset up and left (`cx≈0.4, cy≈0.35`).
4. **Gloss:** almost every object gets a white glossy highlight: a small
   ellipse at the upper-left, `fill="#fff"`, opacity 0.35–0.8, rotated about
   −20…−35°. This "candy shine" is the signature of the style.
5. **No black outlines.** Use the darker shade of the same hue (for example
   stroke `#f59e0b` on yellow, `#2a8fd6` behind blue letters) or none.
   **Never** stroke a shape that tiles: the stroke would show at every seam.
6. **Faces make things friendly:** eyes are dark ink ellipses
   (`PALETTE.ink #5b3a29`) with 1–2 white highlight dots (top-right bigger);
   pink cheeks (`PALETTE.cheek #ff9ab8`, opacity ~0.7–0.8, a horizontal
   ellipse); a smile drawn as a quadratic curve, either a stroke with a round
   cap, or a filled ink mouth with a pink tongue (`candyPink`). Faces are on
   the sun, the clouds (one), the flowers, the stars, the used Mystery
   Block, the أ, the lion and the default player face.
7. **Seamless tiles:** any horizontally repeating art (hills, cloud sea,
   platform middles) is built from functions that are **periodic over the
   tile width** (whole-number wave counts), and drawn with
   `periodicCurvePath`, so the left and right edges match in height **and**
   slope. Decorations stay away from tile edges (inset ≥ 30–80 px).
8. **Repeating strips need `STRIP_BOTTOM_PADDING = 4`** transparent rows at the
   bottom (section 19).
9. **Sizes:** world units are pixels at a 720 px design height. The
   character is ~146 px tall; a platform tile is 128×200; a star 84×84; the
   Mystery Block 92×92. Keep new objects in proportion.
10. **Arabic letters** must keep their real shapes. Prefer the font (section
    20) over drawing. When drawn (ب bowl, أ), they are chunky candy strokes:
    a darker underlay stroke offset 3–4 px down, the main gradient stroke on
    top, and a white gloss stroke along the top at opacity ~0.45–0.55.

### 10.3 Palette (`PALETTE` in art/palette.ts)

| key | hex | used for |
|---|---|---|
| ink | #5b3a29 | eyes, mouths, outlines of faces |
| white | #ffffff | highlights |
| skyTop / skyMid / skyHorizon | #62bdff / #a6e0ff / #ffe0f0 | sky gradient (top → 55% → bottom) |
| sunCore / sunEdge | #fff07a / #ffc23d | sun face radial gradient |
| sunRay / sunRayTip | #ffd84d / #ffb22e | sun rays radial gradient |
| sunGlow | #fff6c2 | glow behind the sun |
| cheek | #ff9ab8 | cheeks |
| cloud / cloudShade / cloudShadeWarm | #ffffff / #dfe6ff / #ffe3f1 | clouds, cloud sea |
| farHillA / farHillB / farHillLight | #d8b6f7 / #f8b4d6 / #ffd6eb | far hills (lavender + pink) |
| midHill / midHillLight / midHillDeep | #86e0bd / #b9f3da / #5fcca2 | mint mid hills |
| nearHill / nearHillLight / nearHillDeep | #69d872 / #9cef93 / #47bf59 | green near hills |
| frosting / frostingLight / frostingDeep | #7ee36b / #c0f7a4 / #52c556 | platform grass-frosting |
| caramel / caramelLight / caramelDeep | #ffbd70 / #ffd59c / #f08f4c | platform body |
| chocolate / chocolateDeep | #9a5634 / #7a3f25 | platform stripe and underside rocks |
| candyPink / candyPinkLight | #ff6fae / #ffa6cf | accents, tongue, lollipops |
| candyBlue | #5ec8ff | ب, lollipops, butterflies |
| candyPurple | #b07cff | gumdrops, sprinkles |
| candyYellow | #ffd23f | dots, flower centres |
| candyMint | #5fe0b0 | accents |
| candyOrange | #ff9d4d | gumdrops |
| leaf / leafLight | #4fc95c / #86e57a | stems, grass |

`SPRINKLES = [candyPink, candyYellow, candyBlue, candyPurple, white]`.
`SKY_COLOR` (camera background) = `#8fd8ff`.

### 10.4 SVG helper API (art/svg.ts)
- `n(v)`: round to 2 decimals (keeps the markup short).
- `svgDocument(w, h, body, defs = '')`: `<svg xmlns width height viewBox><defs>…</defs>body</svg>`.
- `toDataUri(svg)`: **base64** `data:image/svg+xml;base64,…`, built through
  `TextEncoder` (UTF-8 safe, chunked `String.fromCharCode`).
- `createRandom(seed)` (mulberry32) and `range(random, min, max)`.
- `sampleCurve(width, samples, f)`: `samples + 1` points across [0, width],
  ends included.
- `periodicCurvePath(points, width)`: a Catmull-Rom → cubic Bézier path
  wrapping across the tile, so the tangents match at both edges. Starts
  with `M`.
- `curvePath(points)`: an open Catmull-Rom curve (end tangents clamped).
  `curveContinue(points)` is the same without the leading `M`.

### 10.5 Catalogue of every art piece (key → size → description)

**Sky and sun** (`sky.ts`, `sun.ts`)
- `sky` 16×512, fixedResolution 1: vertical gradient skyTop → skyMid (0.55) →
  skyHorizon. Stretched to the screen.
- `sun-rays` 360×360: a radial glow (sunGlow, opacity 0.95 → 0) plus **14
  rays** alternating long (outer r 168, half-angle 0.16) and short (142,
  0.13), inner radius 92, with soft curved tips. Gradient sunRay → sunRayTip.
- `sun-face` 200×200: a circle r 94, radial gradient (0.42, 0.38) sunCore →
  sunEdge; gloss ellipse; eyes rx10 ry13 with highlight; cheeks at ±52; an
  open smiling mouth with a pink tongue. `sun-face-blink`: the same with
  closed-eye arcs (blink frame).

**Clouds** (`clouds.ts`)
- Clouds are lists of puffs `[cx, cy, r]`, auto-fitted by `fitCloud()`. The
  texture size is computed so no puff or shade is clipped (`SHADE_OFFSET = 9`,
  `MARGIN = 3`). Rendering: shade circles (cloudShade) drawn 9 px lower,
  then white circles, then a gloss ellipse on the largest puff.
- `cloud-small`: puffs [[60,70,34],[105,52,44],[155,68,36],[110,80,30]].
- `cloud-medium`: [[70,96,44],[130,66,60],[200,74,52],[258,100,38],[160,108,40]].
- `cloud-large`: [[80,128,50],[150,90,70],[232,72,82],[318,100,64],[380,134,42],[220,140,48]].
- `cloud-happy`: [[76,110,48],[140,74,64],[212,70,70],[276,108,46],[176,124,44]],
  with a face (eyes r7 and highlight, cheeks, smile) at (w/2, h·0.62).
- `cloud-sea` 1024×256 (seamless; bottom 4 px transparent): a back layer
  edge `cloudSeaEdge(x, 7 bumps, base 92, amp 46, phase π/2)` in cloudShade,
  and a front layer `(9 bumps, base 128, amp 40)` with a white → cloudShadeWarm
  gradient. The scallops come from `base − amp·|sin(π·bumps·x/W + phase)|`.

**Hills** (`hills.ts`), tile 1024×512, seamless, bottom 4 px transparent
- `ridgeHeight(ridge, x) = base + Σ amp·sin(2π·count·x/W + phase)`. Ridges:
  - farBack: base 210, waves (2, 60, 0.4), (5, 14, 1.3)
  - farFront: base 270, waves (3, 52, 2.1), (7, 10, 0.2)
  - mid: base 230, waves (2, 70, 1.1), (4, 22, 2.6)
  - near: base 220, waves (3, 56, 0.6), (6, 14, 1.9)
- Each ridge: a vertical gradient fill, plus a rim highlight (the same curve
  translated 9 px down, stroke-width 9, light colour, butt caps).
- `hills-far`: farBack (farHillA → #c9a4ee, rim farHillLight 0.55) +
  farFront (farHillB → #ef9cc6, rim 0.8).
- `hills-mid`: mid ridge (midHill → midHillDeep, rim midHillLight) with
  decorations at fixed x [150, 330, 560, 720, 880]: even slots are lollipops
  (size 34–46; colours pink, purple, orange, blue), odd slots are gumdrops
  (size 26–34) dusted with sugar dots. Seed 31.
- `hills-near`: near ridge (nearHill → nearHillDeep, rim nearHillLight) and
  34 tiny 5-petal flowers (pink, white, yellow, purple; r 4–7) scattered
  26–150 px below the ridge, x in [30, W−30]. Seed 47.

**Platforms** (`platforms.ts`), tile height 200, middle 128 wide, caps 96 wide
- Tile-local layout: `PLATFORM_SURFACE_Y = 30` (the walking surface),
  frosting top `frostingTop(x) = 30 + 2(1 − cos(2πx/64))` (period 64, even
  function, so mirroring is seamless), drip line at y 60, caramel body
  54–138, chocolate stripe centred at `stripeCentre(x) = 104 + 3 sin(2πx/128)`
  (±6), underside from y 138 with chocolate stalactites down to ~196.
  `PLATFORM_SOLID_DEPTH = 108` (physics depth below the surface).
- `platform-mid-a`: drips at x 38 (len 22, w 18) and 94 (13, 14); one big
  stalactite to y 196 centred at 64; sprinkles [[20,44,30],[52,40,−20],[76,47,70],[108,42,10]].
- `platform-mid-b`: drips at 22 (14, 14), 68 (26, 20), 108 (10, 12); two
  stalactites (36 → y 176, 96 → y 188); different sprinkles.
- `platform-left`: rounded left end (frosting wraps the corner at x≈6,
  caramel rounded r≈28), one drip at x 46, underside tapering to (56, 186).
  Its joint edge x = 96 matches a middle tile's x = 0 (phase-mapped with
  `u(x) = x − 96 + 256`).
- `platform-right`: the left cap **mirrored** (`translate(96 0) scale(−1 1)`).
- Frosting has a light rim stroke (frostingLight, width 4, 5 px below the
  top) and sprinkles (10×3.2 rounded rects in the SPRINKLES colours).

**Flora and FX** (`flora.ts`). All stand on their bottom centre (origin 0.5, 1).
- `flower-pink|purple|blue|white` 44×84: a curved stem, two leaves, 6 petals
  (r 8.5 at distance 11), a yellow centre r 9 **with a tiny face**.
- `lollipop-pink|blue` 96×176: a white stick with pink diagonal stripes
  (plain parallelograms; **don't use `transform-origin`**, Safari ignores it
  in SVG images), a candy disc r 42, a white spiral stroke, a gloss.
- `gumdrop-purple|orange` 84×60: a dome with sugar dots and a gloss.
- `grass-tuft` 56×28: 5 blades in alternating leaf colours.
- `mushroom` 64×64: a cream stem and a pink cap with white dots.
- `sparkle` 32×32: a white 4-point twinkle with a soft radial glow (white,
  so particles can tint it).
- `butterfly-pink|blue` 60×48: mirrored wing halves with spots, an ink body,
  curled antennae.

**Character** (`character.ts`): see section 12.1 (sizes, colours, rig).

**Mechanics** (`mechanics.ts`)
- `mystery-block` 92×92: rounded square rx 18, gradient #ffe066 → #ffad2e,
  stroke #ff9a1f width 4, top gloss bar, 4 white rivets, 8 white rays around
  a white centre dot (it "contains a dot").
  `mystery-block-used`: cream #fff3d6 → #f5d9a8, stroke #e8c48a, **a smiling
  face** instead of the dot.
- `letter-baa` 270×124: the ب bowl. Centre line (texture coordinates, drawn
  right to left as written): [244,26] [240,62] [216,89] [135,96] [60,92]
  [34,82] [22,62]. Stroke 36, underlay #2a8fd6 (width +6, offset 3),
  gradient #8fdcff → candyBlue, white gloss stroke 7 at opacity 0.55 along
  points 1–5 shifted up 9. Exports `BAA_STROKE = 36`,
  `BAA_FLOOR_Y = 96 − 18 + 4 = 82` (the inner floor),
  `BAA_BOTTOM_Y = 114`, `BAA_FLOOR_X = [40, 230]`.
- `letter-dot` 56×56: a yellow candy dot (radial #fff7b0 → candyYellow,
  stroke #f59e0b 3, gloss).
- `letter-dot-ghost` 56×56: dashed white ring with a 35% white fill
  (a "something goes here" hint).
- `glow-dot` 96×96: a radial glow #fff6a8 → transparent, with a bright core
  r 20 (the flying dot).
- `letter-alef` 150×420: the أ. Stem points [70, h−34] [74, 230] [80, 116],
  stroke 68 (underlay #e04848 74 offset 4), horizontal gradient #ff8c8c →
  #ff5c5c, a gloss stroke. Hamza (ء) above: points [100,30] [84,23] [72,34]
  [84,45] [106,46] [64,64], stroke 14 (underlay 18). **A smiling face** on the
  stem at y 210: white eyes rx10 ry12.5 with ink pupils, pink cheeks, an open
  mouth #7f1d1d.
- `lion` 230×214: a sitting front-facing lion: a curled tail with an orange
  tuft, body #f6c04d with a cream belly, paws with toe lines, a **mane of
  14 circles** (r 24, alternating #e8742a / #f08a35, radius 54×52 around the
  head), ears with pink insides, head r 44 #f8c95a, cream muzzle, ink nose,
  eyes, cheeks, a "w" smile. `lion-roar`: closed happy eyes and an open mouth
  with a tongue.
- `star` 84×84: a chubby 5-point star (outer r 38, inner 19), gradient
  #fff07a → #ffc21f, stroke #f59e0b 5, **a smiling face**, a gloss.
- `rainbow` 360×230: 6 arcs (r 150 − 18i, width 19: #ff6b6b #ff9d4d #ffd23f
  #5fe08a #5ec8ff #b07cff) with white cloud feet on both sides.

### 10.6 The asset manifest (assets.ts)
- `getAssetManifest()` builds (once) `ART.map(piece → {type:'svg', key, url: toDataUri(svg()), width, height, fixedResolution})`.
- `queueAssets(loader, entries, resolution)` →
  `loader.svg(key, url, {width: round(w·scale), height: round(h·scale)})`.
- To **replace a piece with an illustrator's file**, change the entry's `url`
  to a file URL (put the file under `public/` and use
  `import.meta.env.BASE_URL + 'path'`), keeping the key and the logical size.

### 10.7 How to add a new art piece (recipe)
1. Write `function myThingSvg(): string` in the right `art/*.ts` file using
   `svgDocument`, palette colours, a gradient and a gloss, plus an exported
   `MY_THING_SIZE = { width, height } as const`.
2. Add its key to the module's keys object (for example `MechanicKeys`) and
   an entry to that module's `*_ART` array, or to `ART` in `index.ts`.
3. `npm test`: `art.test.ts` validates it automatically.
4. Check it visually **once**: bundle the art with esbuild and open a
   contact sheet in Playwright:
   ```bash
   npx esbuild src/game/art/index.ts --bundle --format=esm --outfile=$TMP/art.mjs --alias:@=./src
   # then write a tiny HTML page with <img src="data:image/svg+xml,…"> per piece and screenshot it
   ```

### 10.8 Fonts
- UI font: **"Baloo Bhaijaan 2"** (Arabic and Latin, rounded, child-friendly,
  OFL), **self-hosted** via `@fontsource/baloo-bhaijaan-2` (imported in
  `main.tsx`), so it works offline and inside Phaser text (section 20.6).
- Tailwind token: `--font-display: "Baloo Bhaijaan 2", "Noto Sans Arabic", system-ui, sans-serif`
  (`font-display` class).

### 10.9 Third-party assets (licenses)
- **Microsoft Fluent Emoji (Flat)**: **MIT**, © Microsoft. The license was
  verified from https://github.com/microsoft/fluentui-emoji (LICENSE file).
  28 SVGs (32×32 viewBox, flat style) are downloaded into `public/emoji/`,
  together with `public/emoji/LICENSE-fluentui-emoji.txt`. Source paths follow
  `assets/<Name>/Flat/<name>_flat.svg` (skin-tone emoji:
  `assets/<Name>/Default/Flat/<name>_flat_default.svg`). Download with:
  ```bash
  curl -s -o public/emoji/<file>.svg "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/<Folder%20Name>/Flat/<folder_name>_flat.svg"
  ```
  Files present: lion duck apple fox camel horse sheep bear corn feather
  giraffe fish sun rocket frog airplane envelope grapes cloud elephant cat
  dog lemon banana bee gift rose hand.
  (Folders: Lion, Duck, Red apple, Fox, Two-hump camel, Horse, Ewe, Bear,
  Ear of corn, Feather, Giraffe, Fish, Sun, Rocket, Frog, Airplane,
  Envelope, Grapes, Cloud, Elephant, Cat, Dog, Lemon, Banana, Honeybee,
  Wrapped gift, Rose, Raised hand (Default).)
- **Baloo Bhaijaan 2** font: **OFL-1.1**, via `@fontsource/baloo-bhaijaan-2`.
- A `CREDITS.md` at the repo root must list both (create it in Step 1).
- Kenney (CC0) and Tiled were evaluated and not used (section 3).

---

## 11. The world: parallax, platforms, decoration, ambience

### 11.1 Layers and depths (`world/depths.ts`, back → front)
| Depth | value | what |
|---|---|---|
| sky | −100 | sky gradient, screen-fixed |
| sun | −95 | sun rays + face, screen-fixed |
| farClouds | −90 | drifting clouds, factor 0.08 |
| hillsFar | −80 | TileSprite, factor 0.18 |
| hillsMid | −70 | TileSprite, factor 0.35 |
| hillsNear | −60 | TileSprite, factor 0.55 |
| nearClouds | −50 | drifting clouds, factor 0.7 |
| decorBack | −10 | trees, gumdrops, mushrooms, flowers, أ, lion, rainbow |
| platforms | 0 | platform tiles (Mystery Block +1, ghost dot +1, dot +2) |
| decorFront | 5 | grass tufts |
| player | 10 | the puppet (ب bowl drawn at player + 1, so the child stands *in* it) |
| butterflies | 15 | butterflies and stars |
| cloudSea | 20 | the cloud sea strip (in front of the platforms' undersides) |
| sparkles | 30 | particles and the flying dot |

During the respawn bubble the puppet is raised to `cloudSea + 1` so the child
can watch it float home. It returns to `player` afterwards.

### 11.2 ParallaxBackground (`world/ParallaxBackground.ts`)
Constructed with `(scene, resolution, {groundY, cloudSeaY, reducedMotion, seed})`.
Everything is a **screen-fixed object positioned by hand every frame** from
the camera, using `fixedView`:
- **Sky:** at `(view.left, view.top)`, display size = view size.
- **Sun:** on wide screens at `x = view.right − 270`
  (`view.left + view.width − 200·1.35`), `y = view.top + 210`; on **narrow
  (portrait) screens** at `x = view.left + 0.66·view.width`,
  `y = view.top + 320` (`1.6·200`), so it stays clear of the HUD buttons.
  Both get `−scrollY·0.02 + 8`. The rays rotate at `0.08 rad/s` and pulse
  in scale `±3%` (period ~5.7 s). The face bobs `±4 px`. A blink (face →
  `sun-face-blink`) lasts 160 ms every 2.8–5.4 s. Under reduced motion there
  is no rotation, pulse or bob.
- **Hill strips** (TileSprite, `setScale(1/r)`, width = `ceil(view.width·r)+2`,
  updated only when changed):
  - `hills-far`: factor 0.18, worldTop `groundY − 560`, fill below #ef9cc6
  - `hills-mid`: factor 0.35, worldTop `groundY − 420`, fill midHillDeep
  - `hills-near`: factor 0.55, worldTop `groundY − 290`, fill nearHillDeep
  - screen y = `worldTop − scrollY·factor`; `tilePositionX = layerLeft(…)·r`.
  - A solid Rectangle (the strip's bottom colour) fills from
    `y + height − STRIP_BOTTOM_PADDING − 1` to the bottom of the screen, so
    tall screens never see past the hills.
- **Cloud sea:** the same strip mechanism, factor **1**, worldTop
  `level.cloudSeaY`, fill cloudShadeWarm, depth cloudSea.
- **Drifting clouds:** two layers.
  - Far: factor 0.08, 7 clouds, y between `groundY−900` and `groundY−520`,
    scale 0.55–0.75, speed 6–14 px/s, alpha 0.85, seed `seed·97+11`.
  - Near: factor 0.7, 4 clouds, y between `groundY−760` and `groundY−380`,
    scale 0.85–1.05, speed 14–26 px/s, seed `…+23`. **The near layer's
    second cloud is always `cloud-happy`.**
  - Initial x = `(i/count)·2600 ± 120`. Each frame: `x += speed·dt`;
    `screenX = wrap(x − scrollX·factor, band) − 450` with
    `band = max(2600, view.width + 900)`; bob `sin(t/2400 + phase)·6`.
  - Reduced motion: speed 0 and no bob.

### 11.3 Platforms (`world/Platform.ts`)
- A spec is `{x (left edge), y (walking surface), middles, sparse?}`.
  `platformWidth(m) = 96·2 + 128·m`.
- Images: left cap, then `m` middles alternating
  `(i + floor(x/128)) % 2 === 0 ? mid-a : mid-b`, then the right cap; origin
  (0,0) at `y − 30`, scale `1/r`, depth platforms.
- **Physics:** one static Arcade body (a Zone) at
  `(x + 10, y, width − 20, 108)`: inset 10 px at both ends for the rounded
  caps, top exactly at the walking surface.
- `walkable = {left: x + 30, right: x + width − 30}` (used by decoration).

### 11.4 Decorations (`world/Decorations.ts`): `decoratePlatforms(scene, platforms, seed, r, reducedMotion)`
Random source `createRandom(seed·1013)`. Kinds:
| kind | keys | sway° | scale | depth |
|---|---|---|---|---|
| tree | lollipop-pink/blue | 1.6 | 0.8–1.05 | decorBack (tall) |
| gumdrop | gumdrop-purple/orange | 0 (breathes) | 0.8–1.1 | decorBack |
| mushroom | mushroom | 0 (breathes) | 0.7–0.95 | decorBack |
| flower | flower-pink/purple/blue/white | 7 | 0.8–1.1 | decorBack |
| tuft | grass-tuft | 5 | 0.8–1.2 | decorFront |

Per platform (`left`/`right` = walkable, `y` = surface):
1. Unless `sparse`: one tree at `left + 20..70`, and a second at
   `right − 20..70` if the width is over 600.
2. `max(1, floor(width/380))` gumdrops or mushrooms (50/50) at random x in
   `[left+40, right−40]`.
3. Flower clusters: `max(1, floor(width/260))` clusters spread evenly
   (±50), each with 2–4 flowers within ±40.
4. Tufts: `max(2, floor(width/200))` evenly spaced (±12).

Each image has origin (0.5, 1) at `y + 2`, a random flipX, and scale `s/r`.
**Every item draws the same random numbers whatever the motion setting**
(swayAmount, duration 1300–2400, delay 0–1500). Sway items: angle tween
`−a ↔ +a` (Sine.easeInOut, yoyo, infinite), with `a = sway·swayAmount·(reducedMotion ? 0.35 : 1)`.
Non-sway items "breathe" (scaleY ×0.94, scaleX ×1.04) unless motion is
reduced.

### 11.5 Ambient (`world/Ambient.ts`)
- **Sparkles** (skipped under reduced motion): a particle emitter with the
  `sparkle` texture; lifespan 2600–4200; speedY −26…−10; speedX ±10;
  scale 0.25–0.6 (÷r); rotate 0–360; alpha = `sin(π·t)·0.9`
  (fade in and out); tint candy colours; blend ADD; frequency 220 ms; at most
  36 alive. Its emit zone follows the camera `worldView`, inflated
  (`x−100, y+15%h, w+200, 85%h`). Depth sparkles.
- **Butterflies:** homes above every other platform
  (`(p.x + p.width/2, p.y − 230)`). Path: `x = home + sin(a)·rx`,
  `y = home + sin(2a)·ry + sin(7a)·6`, with `a = t·speed + phase`,
  `rx 90–160`, `ry 30–60`, speed `0.55·(0.8–1.2)` (0.25 under reduced
  motion). Flap: scaleX tween to 0.2/r, 150 ms yoyo (420 ms reduced).
  flipX follows the x direction. Scale 0.85/r.

---

## 12. The player: rig, animation, controller, respawn, face photo

### 12.1 Character art (`art/character.ts`)
Colours: SKIN `#f6c9a5`, SKIN_SHADE `#eba983`.
ONESIE `{base #b79cff, light #e9e0ff, deep #8f73ec, paw #ffb3cf}`.
EXPLORER `{shirt #e8c784, shirtDeep #c9a25c, shorts #9a6a3c, boot #7a4a2b, sole #4e2d18, scarf #ff6b6b, hat #dcaa48, hatDeep #b9862f, band #8a4b2f, hair #4a2e1f, pack #4fc95c, packDeep #36a446}`.

| key | size | description |
|---|---|---|
| char-head | 78×78 | skin circle with radial shading and two little ears |
| char-face / char-face-blink | 58×64 | the drawn default face: big eyes with highlights, cheeks, open smile with tongue / closed-eye arcs |
| char-bubble | 180×180 | translucent bubble (blue → purple rim gradient), white rim, gloss |
| onesie-hood | 108×108 | a disc with an **oval face opening** (even-odd path; hole rx31 ry35 centred 5 px below), light rim ring, two bear ears with pink insides, gloss |
| onesie-body | 62×54 | rounded body with a gradient, a light belly patch, two buttons |
| onesie-arm | 20×38 | sleeve capsule + skin hand |
| onesie-leg | 24×36 | leg capsule + deep foot with a pink paw pad |
| explorer-hat | 118×62 | wide brim + dome crown + leather band + gloss |
| explorer-hair | 84×44 | dark cap of hair with three bangs |
| explorer-body | 62×54 | khaki shirt (pockets, buttons), shorts waist, belt and buckle, backpack straps, red scarf |
| explorer-backpack | 74×46 | green pack peeking out on both sides of the body |
| explorer-arm | 20×38 | skin arm + short khaki sleeve + hand |
| explorer-leg | 24×36 | shorts + skin leg + boot and sole |

**Rig** (`buildRig(outfit)`, positions relative to the **feet**, y negative up;
`JOINTS = {hipY −30, hipX 10, shoulderY −66, shoulderX 25, bodyY −50, headY −108, faceY −104}`).
Order is back → front:
| part | key | origin | position |
|---|---|---|---|
| backpack (explorer only) | explorer-backpack | (0.5, 0.5) | (0, −54) |
| legBack | leg (flipX) | (0.5, 0.14) | (−10, −30) |
| armBack | arm (flipX) | (0.5, 0.14) | (−25, −66) |
| legFront | leg | (0.5, 0.14) | (10, −30) |
| body | onesie-body / explorer-body | (0.5, 0.5) | (0, −50) |
| armFront | arm | (0.5, 0.14) | (25, −66) |
| head | char-head | (0.5, 0.5) | (0, −108) |
| face | photo or char-face | (0.5, 0.5) | (0, −104) |
| hair (explorer) | explorer-hair | (0.5, 0.5) | (0, −132) |
| headwear | onesie-hood (0.5, 0.5) at (0, −111) / explorer-hat (0.5, 0.82) at (0, −130) | | |

`CHARACTER_HEIGHT = 146`. Photo face: the crop is a square image with the
oval filling its height, displayed at **64×64** (`FACE_SIZE.height`).
The drawn face uses `scale 1/r`.

### 12.2 Puppet animation (`player/PlayerPuppet.ts`)
Inputs per frame: `PuppetMotion {speed 0..1, vy, grounded, facing −1/0/1, respawning}`.
`damp(a, b, rate) = a + (b − a)·(1 − e^(−rate·dt))`, with `dt = min(delta, 50 ms)`.
- Landing squash: on a `grounded && !wasGrounded` transition,
  `squash = min(1, 0.35 + |vy|/1600)`, damped to 0 at rate 10.
- `air` damps to 1 when airborne (0 when grounded or respawning) at rate 14.
- Run phase: `phase += dt·(7 + 11·speed)` while grounded.
- `swing = sin(phase)·speed·(1 − air)`; `bob = |sin(phase)|·4·speed·(1 − air)`;
  `breathe = sin(t·2.6)·0.018·(1 − speed)`; `stretch = air·clamp(−vy/9000, −0.06, 0.09)`.
- Container: `rotation = lean`, damped towards `facing·speed·0.09` (rate 10);
  scale `(1 + 0.14·squash − 0.5·stretch, 1 − 0.18·squash + breathe + stretch)`.
- `turn` damps towards `facing·3.5` (rate 8). Head parts shift x by `turn`
  (the face by `1.2·turn`); headTilt `= sin(phase)·0.05·speed + turn·0.008`.
- Legs: front `swing·0.65 − air·0.35`, back `−swing·0.65 + air·0.45`.
- Arms: `raise = air·2.3 (+2.3 while respawning)`; front `−swing·0.8 − raise`,
  back `swing·0.8 + raise` (arms up = "yay!"). Arms, body and backpack bob
  by `−bob`; head parts by `−1.3·bob`.
- Blink (drawn face only): 140 ms every 2.5–5 s.
- Bubble: alpha damps to 1 while respawning (rate 9); wobble
  `1 ± 0.03·sin(6t)` on x/y inversely; visible while alpha > 0.01.
- `setOutfit()` rebuilds the parts (and the bubble) and keeps the face.
  **The character is never mirrored.**

### 12.3 Controller (`player/controller.ts`), pure and unit-tested
Constants (`game/constants.ts`): GRAVITY 2000, MOVE_SPEED 340,
GROUND_ACCEL 2600, AIR_ACCEL 1700, JUMP_SPEED 853 (apex ≈ 182 px), COYOTE_TIME
0.2 s, JUMP_BUFFER 0.16 s, MAX_FALL_SPEED 1300, RESPAWN_DURATION 1.2 s,
PLAYER_BODY 46×128.
```
stepController(state, {axis, jumpPresses}, {vx, vy, grounded, now, dt}):
  if grounded: state.lastGroundedAt = now
  target = clamp(axis, −1, 1)·MOVE_SPEED
  accel = (grounded ? GROUND_ACCEL : AIR_ACCEL)·dt
  vx += clamp(target − vx, −accel, accel); if |vx| < 1: vx = 0
  if jumpPresses ≠ seen: seen = jumpPresses; jumpBufferedAt = now
  vy = min(vy, MAX_FALL_SPEED)
  if now − jumpBufferedAt ≤ JUMP_BUFFER and now − lastGroundedAt ≤ COYOTE_TIME:
      vy = −JUMP_SPEED; jumped = true; clear both timestamps
  return {vx, vy, jumped}
```
Horizontal range of a full jump on flat ground: airtime `2·853/2000 = 0.853 s`
× 340 ≈ **290 px**.

### 12.4 Player (`player/Player.ts`)
- The physics proxy is an invisible Zone (46×128) whose **bottom is the
  feet**. `collideWorldBounds` is on; the world has no bottom bound, so
  falling is possible. maxVelocityY 2400.
- Per frame (unless respawning): `grounded = body.blocked.down || body.touching.down`,
  then `stepController`, then `setVelocity`. Jump → `playSound('jump')` and a
  dust puff of 5. A `pendingLaunch` (from `launch(speed)`) overrides `vy`
  with `−speed`. Landing with `vy > 500` → `playSound('land')` and a puff of 8.
  facing = axis (or 0 when grounded and slow).
- Dust: the sparkle texture, lifespan 420, speed 60–150, angles 200–340°,
  gravityY 300, scale 0.55/r → 0, white and pink tints, emit on demand.
- **Respawn** when `body.bottom > killY` (`level.cloudSeaY + 150`):
  disable the body, release all input, `playSound('whoosh')`, raise the depth,
  then tween `t` 0→1 over 1.2 s (Sine.easeInOut) along a quadratic Bézier
  from the feet to the spawn, with control point `(mid x, min(y) − 320)`.
  On complete: reset the body at the spawn, enable it, `playSound('pop')`, a
  puff of 10, restore the depth. **The session's stars and dots are never
  touched.**
- Face photo: `loadFace(url)` uses `textures.addBase64('player-face-photo', url)`.
  The texture is reused when the URL equals `registry.photoFaceUrl`. It
  subscribes to store changes of outfit and photo (unsubscribed on scene
  SHUTDOWN).

### 12.5 Title-screen avatar (`components/ui/AvatarPreview.tsx`)
The same rig rendered as absolutely positioned `<img>` layers inside a
150×170 logical stage (feet at the bottom centre), as percentages, so it
scales with the container. Data URIs are built once. CSS animations (in
`index.css`): `avatar-breathe` (whole body, 2.6 s), `avatar-wave` (front
arm, rotate −150° ↔ −110°, 1.6 s), `avatar-sway` (back arm, 2.4 s),
`avatar-nod` (head group about the neck, 3 s). Mirrored parts use the
individual `scale: '-1 1'` property so they compose with the rotate
keyframes. A soft shadow ellipse sits under the feet. The photo is used if
present.

---

## 13. Mechanics of Level 1

All mechanics live in `src/game/mechanics/`, take `(scene, …, resolution)`,
create images with `setScale(1/r)`, and create **static Arcade Zones** for
physics. LevelScene wires the colliders and overlaps (section 14.3).

### 13.1 MysteryBlock
- An image (92×92) at the centre `(x, y)`, depth platforms + 1, with an idle
  shimmer (angle −3 ↔ 3, 900 ms yoyo). A static zone of 86×86.
- `handleCollision(playerBody)`: if unused **and `playerBody.touching.up`**,
  call `bonk()`.
- `bonk()`: `used = true`, `playSound('bump')`, stop the shimmer, bump
  tween y −18 (110 ms yoyo, Quad.easeOut, texture → `mystery-block-used` at
  the yoyo point), then release the dot.
- Dot flight: a `glow-dot` (scale 0.9/r) from `(x, y − 55)` to
  `getDotTarget()` along a quadratic Bézier with control
  `(mid x, min(y) − 260)`, a 1500 ms Sine.easeInOut tween, a pulsing scale,
  and a sparkle trail emitter (follow, lifespan 600, frequency 30, ADD,
  yellow and white tints). On complete: stop and destroy the trail
  (+700 ms), destroy the glow, and call `onDotDelivered()`.
- Because it is a scene tween, the flight **pauses with the game**, and
  `collectLetterDot` (playing-only) is never lost.

### 13.2 LetterB (ب trampoline)
- `LIFT = 62` px gap between the ground and the bowl underside (the dot sits
  there). The bowl image has origin `(0.5, BAA_BOTTOM_Y/124)` at
  `(x, groundY − 62)`, depth player + 1.
- Bounce surface zone: `x − 135 + 40` to `+190` wide, top at
  `groundY − 62 − 114 + 82`, height 32.
- `handleCollision(body, launch)`: if `body.touching.down` and 250 ms have
  passed since the last launch → `launch(1400)` (apex ≈ 490 px),
  `playSound('boing')`, squash (scale 1.18×0.72 → elastic back over 520 ms).
- Dot: a ghost at `(x, groundY − 31 − 2)` pulsing (scale 0.9–1.08, alpha
  0.6–1, 800 ms). It subscribes to `selectIsLetterComplete`. On completion:
  hide the ghost, show the real dot (pop from 0.2 with Back.easeOut 500 ms),
  `discoverLetter('ب')`, `playSound('pop')`, `speakArabic('باء')` after
  350 ms, a wiggle (angle ±6, 4×), and a continuous sparkle emitter over the
  bowl.
- `dotPosition` getter = the dot image position (the Mystery Block's target).

### 13.3 FloatingLetterA (أ + lion)
- The أ image at scale 0.78/r, centred at `groundY − 46 − 420·0.78/2`, depth
  decorBack + 1. It floats (y −18, 1700 ms yoyo) and rocks (angle ±3, 2300 ms).
- The lion: origin (0.5, 1) at `(lionX, groundY + 4)`, scale 0.85/r, and
  breathes (scaleY 0.87/r, 1300 ms).
- Sensor zone: from `min(x, lionX) − 140` to `max(x, lionX) + 92`, height 360
  above the ground.
- `greet()` (overlap, debounced 3.5 s): on the first time,
  `discoverLetter('أ')` and a pink and white sparkle emitter around the
  letter. Every time: `playSound('roar')`, `speakArabic('ألف… أسد')` after
  450 ms, a 2D "spin" (scaleX s → −s, 260 ms yoyo ×2), the lion texture →
  `lion-roar` for 900 ms with a puff-up (scaleX ×1.12, 160 ms yoyo ×3).

### 13.4 Star
- An image at `(x, y)`, depth butterflies; bob (y −12, 1100 ms) and rock
  (±10°, 1500 ms). A static zone of 71×71 (85% of 84).
- `collect()` (overlap): disable the zone, `useGameStore.collectStar()`,
  `playSound('collect')`, a burst of 22 sparkles (speed 120–260, ADD),
  then fly up 90 px with scale ×1.6, a 360° spin and a fade (650 ms
  Back.easeIn), then destroy.

### 13.5 GoalGate (rainbow)
- The rainbow (origin 0.5, 1) at `(x, groundY + 6)`, depth decorBack + 1.
  Alpha 0.55 until the letter is complete, then a 600 ms fade to 1 plus a
  rainbow sparkle emitter.
- A ghost-dot hint image above the rainbow (alpha 0).
- Sensor zone 80×200 centred on x.
- `enter()` (overlap): if the letter is complete → `done`,
  `playSound('win')`, `speakArabic('أحسنت')` after 300 ms, a confetti burst
  of 60 (gravity, the rainbow colours), then `completeLevel()` after 450 ms.
  Otherwise (debounced 1.5 s) → `playSound('tap')`, a wobble (angle ±4 ×4),
  and the hint dot floats up and fades in and out. **It never says "no".**

---

## 14. Level 1 exact layout and reachability maths

### 14.1 Definition (`game/levels.ts`, id 1)
```
width 5120, height 1440, spawn (180, 1100), groundY 1100, cloudSeaY 1290, decorSeed 1
platforms (x = left edge, y = surface, middles):
  P1 { x:    0, y: 1100, m: 5 }               → 0 … 832
  P2 { x:  992, y: 1100, m: 7, sparse }       → 992 … 2080      (gap 160)
  P3 { x: 2304, y:  760, m: 5, sparse }       → 2304 … 3136     (reached only via ب)
  P4 { x: 3328, y:  960, m: 3 }               → 3328 … 3904     (drop 200, gap 192)
  P5 { x: 4064, y:  960, m: 5 }               → 4064 … 4896     (gap 160)
mechanics:
  stars:        (560, 1036), (2500, 696), (3620, 896)   → collected by walking through
  mysteryBlock: centre (1340, 846)                       → bottom edge 846 + 43 = 889 (≈ 211 px above ground)
  letterB:      x 1950, groundY 1100
  letterA:      x 2640, groundY 760, lionX 2900
  goal:         x 4620, groundY 960
goals: totalStars 3, letterDotsRequired 1
```

### 14.2 Why it is reachable (check these when editing layouts)
- **Standing body:** feet at the surface, head at surface − 128. A star at
  `surface − 64` overlaps the standing body, so it is collected by walking.
- **Block bonk:** the block bottom at `1100 − 211 = 889` is above the
  standing head (972) and below the jump reach (972 − 182 = 790), so a jump
  under it touches it from below.
- **Gap 160 at equal height:** a jump covers ~290 px, comfortably. Walking
  off the edge still allows a jump for 0.2 s (coyote time).
- **ب launch:** from feet ≈ 1000 on the bowl with `vy = −1400`, g = 2000,
  and the player holding right at 340 px/s: x passes P3's left body edge
  (2281) at t ≈ 0.97 s, with feet y ≈ 583, which is above P3's surface (760).
  The apex is ~490 px above the bowl. Without right input the child just
  bounces on ب again (that's fun, and fine).
- **P3 → P4:** a drop of 200 with a 192 gap. Jumping near P3's edge lands on
  P4.
- A normal jump from P2 cannot reach P3 (340 px higher), so **the ب
  trampoline is the only route up**. This is intentional: every child uses it.

### 14.3 LevelScene wiring (current, classic level)
Order in `create()`: register goals → background/world bounds/zoom →
ParallaxBackground → Platforms → Decorations → Ambient (butterfly homes) →
LetterB → MysteryBlock (target `letterB.dotPosition`, delivered →
`collectLetterDot()`) → FloatingLetterA → Stars → GoalGate → Player
(`killY = cloudSeaY + 150`) → colliders and overlaps:
```
collider(player.zone, platforms.bodies)
collider(player.zone, mysteryBlock.zone, → mysteryBlock.handleCollision(playerBody))
collider(player.zone, letterB.zone,      → letterB.handleCollision(playerBody, v → player.launch(v)))
overlap (player.zone, letterA.sensor,    → letterA.greet())
overlap (player.zone, star.zone,         → star.collect())        // each star
overlap (player.zone, goal.sensor,       → goal.enter())
```
→ camera follow (section 9.5) → resize listener → `level-ready` on the
first POST_UPDATE. LevelScene exposes `player`, `letterB` and `mysteryBlock`
publicly (the play-tests use them).

---

## 15. Sound and speech

### 15.1 Sound (`utils/sound.ts`): synthesised with Web Audio, no files
- `unlockAudio()` must run inside a user gesture (Play, the touch buttons and
  the mute toggle call it). A lazy `AudioContext` with master gain 0.5.
- `playSound(name)` does nothing when `isMuted`. It never throws (errors are
  swallowed). Building blocks: `tone({type, from, to, start, duration, volume})`
  (exponential envelope and pitch ramp) and `noise({duration, volume, filterFrom, filterTo})`
  (lowpass sweep).

| name | recipe | used by |
|---|---|---|
| jump | triangle 330 → 660 Hz, 0.18 s | player jump |
| land | sine 160 → 90, 0.1 s | hard landing |
| tap | sine 880 → 990, 0.07 s | UI buttons, goal hint |
| collect | triangle arpeggio 784, 988, 1175, 1568 (every 70 ms) | star |
| bump | square 220 → 330, then triangle 660 → 880 | Mystery Block bonk |
| pop | sine 500 → 1400, then a triangle 1568 ping | dot arrives, respawn end |
| boing | sine 140 → 520 (0.35 s) + triangle 280 → 1040 | ب trampoline |
| roar | lowpass noise 900 → 250 (0.55 s) + soft saw 180 → 120 | lion (friendly, not scary) |
| whoosh | lowpass noise 300 → 2400 (0.7 s) | respawn start |
| win | triangle melody 523, 659, 784, 1047, 784, 1047 (120 ms apart, the last held) | goal |

New mechanics should reuse these sounds or add a short, soft, high-pitched
recipe of the same kind.

### 15.2 Speech (`utils/speech.ts`)
- `speakArabic(text)` speaks **only if an Arabic voice exists**
  (`ar-SA` preferred, then `ar-EG`, then any `ar*`), with rate 0.8 and pitch
  1.2, after `speechSynthesis.cancel()`. It returns false otherwise. The
  reasoning: a non-Arabic voice would mangle the word, which is worse than
  silence for a child learning.
- The voice list is refreshed on `voiceschanged`. It respects mute.
- Current phrases: `'باء'` (ب complete), `'ألف… أسد'` (meeting أ),
  `'أحسنت'` (goal).
- Since 2026-10-17 `speakArabic` is only the **fallback** of the voice clips
  (15.3). Nothing in the game calls it directly any more.

### 15.3 Voice clips (`utils/voice.ts`, `public/audio/`, `scripts/voice/`)
- 63 MP3s: `letter-<i>.mp3` (letter name), `word-<i>.mp3` (word), i = the
  LETTERS index (0..27); `cheer-0..5.mp3` (واو! ياي! برافو! شاطر! هايل! جميل!);
  `well-done.mp3` ("أحسنت!"); plus `manifest.json` `{voice, clips[]}`.
- **Voice: Microsoft neural `ar-EG-SalmaNeural`** (Egyptian female) via
  `edge-tts` 7.3.1 ("ألف" is written أَلِف, or it reads "alf", thousand), rate −25% (owner: +0% was too fast), pitch +12Hz, silence trimmed with ffmpeg, mono
  48 kbps. The owner chose Microsoft after hearing the alternatives.
- **History (don't repeat):** an offline Piper voice (`ar_JO-kareem`) was
  tried first, since Microsoft's endpoint and Hugging Face are blocked from
  the sandbox. The owner found it slow, scary, flat, and "very bad", even
  when pitched up and given cheers. It was removed.
- **Generation runs in GitHub Actions** (`.github/workflows/voice.yml`):
  on a push touching `scripts/voice/**` (or by hand), it runs
  `scripts/voice/generate.py`, commits `public/audio` as github-actions[bot],
  then starts `deploy.yml` with `gh workflow run` (a GITHUB_TOKEN push
  doesn't trigger workflows). **After it runs, `git pull` before your next
  push**, because the bot added a commit to the branch.
- `generate.py` `TEXTS` mirrors LETTERS order, without diacritics except on
  words the voice could misread (تُفّاحة دُبّ ذُرة ضِفدع عِنب قِطّة).
- Playback: `voice.ts` fetches the manifest once. Only listed clips are
  fetched, then decoded with `decodeAudioData` on the shared Web Audio
  context (`sound.ts#getAudioOutput`, so iOS plays them after the first tap)
  and cached. `say(clips, fallback)` plays clips back to back, `CLIP_GAP`
  0.45 s, gain 1.8. A new phrase stops the previous one, and a slow load
  never plays over a newer phrase (`phraseId`). If any clip is missing (or
  there is no manifest), it calls `speakArabic(fallback)`. Respects mute.
- Helpers: `sayLetter`, `sayWord`, `sayLetterAndWord`, `celebrateLetter`
  (random cheer + name + word), `sayWellDone` (cheer + أحسنت),
  `randomCheer()` (never the same twice), `preloadLetterVoice(i)` (LevelScene
  `create()`). `letterIndex(spec)` lives in `letters.ts`.
- Call sites: LetterB cheer + `letter-1`; FloatingLetterA
  `sayLetterAndWord(0)`; GoalGate `sayWellDone()`; LetterDisplay
  `celebrateLetter`; WordFriend `sayWord` (or `sayLetterAndWord` once the
  letter is complete).
- Human recordings can replace any clip by file name (keep it listed in the
  manifest). `voice.test.ts` checks the manifest and the files match the
  63 names (or that there are none yet).

---

## 16. React UI screens

All screens use the Tailwind theme, the `font-display` font, large round
**icon** buttons (≥ 56 px, child-sized: 80–128 px for primary actions),
`active:scale-90` press feedback, and `playSound('tap')` on press.
Directional UI uses `dir="ltr"` containers (the document is `dir="rtl"`).

### 16.1 TitleScreen
Vertical stack on a sky → mint gradient with drifting SVG clouds (CSS
`drift` animation):
1. Top bar: **ParentGateButton** (left) and the mute toggle (right), size 64.
2. Title "مغامرة الحروف" (white, extra-bold, blue drop shadow).
3. **AvatarPreview** (aspect 150/170, max height 300, flexible).
4. The outfit radiogroup (`aria-label="اختر الملابس"`): two 80 px round
   buttons with `OnesieIcon` and `ExplorerIcon`; the selected one is
   scaled 1.1 with a coloured ring (violet or amber). Labels: "بيجامة الدب",
   "ملابس المستكشف".
5. The **Play** button (`aria-label="ابدأ اللعب"`): a 112–128 px green
   circle, white ring, 3D bottom shadow, gentle-pulse. It calls
   `unlockAudio()` + tap + `startLevel(highest unlocked level)`. (**Step 2 changes this to open
   the world map**, section 21.1.)
6. The letter shelf: the taught letters as tiles, lit (white + amber ring)
   when discovered.
Elements use `shrink-0` so the column never squashes the round buttons
(that bug happened once).

### 16.2 HUD (while playing)
Top bar, `dir="ltr"`, pointer-events only on the buttons. Left: a pill with
the **SunIcon** (60 px) whose orange ring shows `selectSunProgress`
(spinning slowly at 100%), plus `totalStars` StarIcons (filled when
collected, `star-pop` animation). Right: mute and pause (56 px). Safe-area
padding.

### 16.3 TouchControls
Shown only on touch devices (`(pointer: coarse)`, `ontouchstart`, or after
the first touchstart). Bottom-left: ← and → (80–96 px, sky blue).
Bottom-right: jump (96–112 px, amber). Each `HoldButton` captures its own
pointer (multi-touch: walk and jump at once) and releases on
up/cancel/lost-capture and on unmount (through refs, so re-renders don't
release a held button). `touch-none`, context menu prevented.

### 16.4 PauseMenu
A dimmed overlay with three round buttons: Home (`exitLevel`), **Resume**
(large, pulsing) and Replay (`startLevel(levelId)`). It exports
`MenuButton`.

### 16.5 LevelCompleteScreen
A warm gradient overlay; a card with the dancing SunIcon (120), 3 stars
popping in one by one (`star-pop` with 300 + i·350 ms delays; the middle one
larger), filled per `computeAwardedStars`; the **letters learned in alphabet
order** as tiles; buttons Home, Replay, and **Next** (only if
`isLevelAvailable(id + 1) && isLevelUnlocked(id + 1)`).

### 16.6 PhotoUploadModal (parents)
Opened from ParentGateButton (a 1.2 s hold with a progress ring;
Enter or Space opens it directly for keyboard users). `role="dialog"`,
`aria-modal`, focus trap, Esc closes, click-outside closes. Arabic texts:
title "صورة طفلك في اللعبة" and a privacy note "الصورة تبقى على هذا الجهاز
فقط ولا تُرفع إلى أي مكان".
Phases: pick → processing ("نبحث عن الوجه…") → adjust → save. Error
messages in Arabic for each `FaceCropError` code (not-an-image, too-large
(> 20 MB), decode-failed, encode-failed).
- Pick: buttons "التقط صورة" (`capture="user"`) and "من المعرض"; drag and drop;
  the current photo with "إزالة الصورة الحالية".
- Adjust: a 280 px canvas showing the photo moving under a fixed dashed oval
  (the oval's height is 40% of the view), dimmed outside (even-odd fill).
  Drag to pan (pointer capture), a zoom slider (0 = widest, 1 = tightest) or
  the mouse wheel, and a live 160 px preview of the final crop. The detection
  message says whether the face was found or the parent should position it.
- Save → `renderFaceCrop` (384 px) → `setFaceTextureUrl` → close.

### 16.7 LoadingScreen and ErrorBoundary
Loading: the sky gradient with a dancing SunIcon (120), `role="status"`,
`aria-label="جارٍ التحميل"` (the play-tests wait for it to disappear).
ErrorBoundary: an Arabic card ("عذرًا، حدثت مشكلة", WebGL hint) and a
"حاول مرة أخرى" button calling `onReset`.

### 16.8 CSS keyframes (index.css)
`star-pop`, `gentle-pulse` (scale 1 ↔ 1.06), `sun-dance` (±8° and scale),
`drift` (translate 24 px), `avatar-breathe`, `avatar-wave`, `avatar-sway`,
`avatar-nod`. Under `prefers-reduced-motion: reduce`, all animations are cut
to a single 0.01 ms iteration. The body is non-selectable and `touch-action: none`,
with no tap highlight.

---

## 17. Face cropper (`utils/faceCropper.ts`)
1. `loadPhoto(file)`: rejects non-images (`not-an-image`) and files over 20 MB
   (`too-large`). Decodes with `createImageBitmap(file, {imageOrientation: 'from-image'})`
   (honours EXIF), falling back to `<img>.decode()`. Downscales to a longest
   edge of **1600** onto a canvas.
2. `detectFace(photo)`, best first:
   - the native `FaceDetector` (`fastMode`, at most 5 faces; picks the largest);
   - **skin-tone segmentation:** downscale to 160 px; a pixel is skin if
     luma Y ≥ 35 and YCbCr chroma `77 ≤ Cb ≤ 127` and `133 ≤ Cr ≤ 173`
     (works across light to dark skin; transparent pixels ignored). Find the
     4-connected components (iterative stack). Skip blobs under 1.5% of the
     image or with fill under 0.3. Score = `area·(0.35 + 0.65·centrality)·(0.6 + 0.4·fill)`,
     where centrality is measured from (0.5, 0.4). If the best blob is
     taller than 1.35× its width, trim it from the bottom (neck);
   - fallback: a centred portrait region (`cy = 0.42·h`, `ry = 0.32·short edge`,
     `rx = ry/1.25`).
   - `regionFromFaceBox`: `rx = w/2·1.2`; `ry = h/2·1.3`, clamped to
     `[1.1, 1.4]·rx`; `cy = y + 0.46·h`. `clampRegion` keeps ry within
     `[0.08, 0.75]·short edge` and the centre inside the image.
3. `renderFaceCrop(photo, region, {size = 384, feather = 0.025})`: draws at
   2× (768), with the oval height filling the canvas minus a 2% margin. A
   feathered oval mask uses the **shadow-blur trick** (fill an ellipse far
   off-canvas and shift only its blurred shadow into view; works in every
   browser, unlike `ctx.filter`), composited with `destination-in`, then
   downsampled to 384 for anti-aliasing. It encodes WebP at 0.9 and falls
   back to PNG.
The pure functions are unit-tested (skin tones, blobs, regions,
validation).

---

## 18. Testing and acceptance checklists

### 18.1 Unit tests (`npm test`, Vitest + jsdom): 260 tests in 9 files after Step 1
| file | covers |
|---|---|
| stores/useGameStore.test.ts | UI state, outfits, photo validation and blob revoke, level flow, star rules, persistence, sanitising corrupt saves, quota fallback, reset, runIds |
| utils/faceCropper.test.ts | skin classifier (6 tones accepted, 6 colours rejected), blob finding, detection on painted images, regions, validation |
| game/EventBus.test.ts | delivery, unsubscribe, once, throwing listeners, self-unsubscribe |
| game/scaling.test.ts | canvas size and DPR cap, zoom for landscape/portrait/zero |
| game/bridge.test.ts | pause/resume mapping, restart on runId, preloader-owned start, unrelated changes ignored, level catalog sanity |
| game/art/art.test.ts | every ART piece is valid SVG at its declared size and deterministic; hill, cloud sea and platform seams (value and slope); clouds fit; base64 round-trip; resolution choice |
| game/world/view.test.ts | fixedView, layerLeft, wrap |
| game/player/controller.test.ts | acceleration, braking, single jump per press, coyote time, buffer, fall cap, stale presses |
| game/levelGenerator.test.ts | letter table (28, alphabet order, emoji files exist, worlds, dots), LEVEL_COUNT sync, catalog (classic 1 + template 2..27), and for each of the 26 template levels: determinism, gap/step safety, block count/height/position, letter/friend/stars/goal placement |

Rule: **pure logic must get unit tests** (generators, controllers, data
validators). Phaser display code is verified with the browser play-tests.

### 18.2 Browser play-tests (`scripts/e2e/`, Playwright)
Run `npm run dev`, then `node scripts/e2e/<script>.cjs`. `GAME_URL` overrides
the URL and `E2E_OUT` the screenshot folder (default `scripts/e2e/out/`,
git-ignored). Scripts print `PASS`/`FAIL` lines, and the exit code is 1 on
failure.
- `full-playthrough.cjs`: drives `window.__game.input` (setRight,
  pressJump) and reads `window.__phaser.scene.getScene('Level').player.feet`:
  walk → jump gap 1 → walk under the block → jump (bonk) → wait for
  `dots === 1` → jump into ب → wait until launched (y < 700) → land on P3 →
  `letters` includes أ → jump to P4 → jump to P5 → `screen === 'levelComplete'`.
  It throws if the player falls (`respawning`).
- `photo-and-respawn.cjs`: injects a canvas-drawn "photo" with
  `setFaceTextureUrl`, sets the explorer outfit, asserts the in-game head
  uses `player-face-photo`, walks into gap 1, and asserts the respawn
  starts, input is released, the player returns to (180, 1100) and stars
  are kept.
- `keyboard-and-touch.cjs`: real keyboard (ArrowRight held, Space, Esc
  pause/resume; no touch buttons on desktop) and an iPhone 13 landscape with
  CDP multi-touch (hold → while holding, a second finger taps jump; release
  stops).
- `replay.cjs`: `mysteryBlock.bonk()` → dot → `completeLevel()` → "العب مرة
  أخرى" → the level is rebuilt (dots 0, stars 0, block unused, x = 180, one
  canvas).
- `engine-lifecycle.cjs`: desktop 1280×720 dpr 1 and phone 390×844 dpr 3:
  one canvas, fills the viewport, backing store = css × min(dpr, 2), Level
  status 5 (RUNNING), goals registered, pause → 6, resume → 5, replay →
  new runId, rotation re-fits, Home destroys the canvas, no console errors.
- `template-level.cjs` (`LEVELS=2,4,5,27` by default): unlocks and starts each
  sampled template level, checks the block count = required dots and that the
  word picture loaded, screenshots the letter (before), bonks all blocks, waits
  for the companions, teleports (`player.body.reset`) to the letter, waits for
  the letter to be discovered, screenshots (after), teleports to the rainbow,
  and checks the level completes and the next level unlocks.
- `motion-and-pause.cjs`: flowers sway, sun rays turn, clouds drift; pause
  freezes all three; resume restores them; reduced motion → clouds still,
  sun still, no ambient sparkles; no console errors.
- Headless Chromium uses **software rendering at ~8–10 fps**. Timeouts are
  generous (up to 40 s per wait) and the scripts poll via
  `page.evaluate`. Slow motion there is **not** a game bug (but see
  `panicMax`, section 19).

### 18.3 Acceptance checklist for ANY new level or mechanic
- [ ] `npm run typecheck`, `npm test` and `npm run build` are green; `npm audit` reports 0.
- [ ] The level is completable from the spawn by an automated play-through
      (add or extend a script) with no falls needed.
- [ ] Every gap ≤ 160 px, every step-up ≤ 120 px, the Mystery Blocks'
      bottoms between `surface − 230` and `surface − 180`.
- [ ] Falling anywhere respawns with no loss.
- [ ] Pause freezes everything (tweens, particles, flights); resume continues.
- [ ] Play again rebuilds from scratch (no leftover used blocks or collected stars).
- [ ] No console errors or warnings (except Phaser's own WebGL info).
- [ ] Reduced motion keeps the same layout.
- [ ] A screenshot on desktop and on a portrait phone looks right: nothing
      under the HUD, sun clear of the buttons, the character visible.
- [ ] Phaser is still only in the lazy chunk (check `npm run build` output:
      the main `index-*.js` stays ≈ 90 kB gz plus any new React-side code).

---

## 19. Gotchas and lessons learned

1. **Phaser decodes every `data:` URI with `atob`.** SVG data URIs must be
   **base64** (`toDataUri`). Percent-encoded URIs throw
   `InvalidCharacterError` and the loader hangs at the Preload scene.
2. **TileSprites wrap vertically too.** A solid bottom row bleeds into the
   top row as a faint horizontal line across the screen. The fix: the bottom
   `STRIP_BOTTOM_PADDING = 4` rows of every strip texture are transparent,
   and a solid Rectangle fill starts 5 px above the strip bottom. (The
   cloud-sea SVG once declared the padded height as its document height;
   `art.test.ts` caught it.)
3. **Scale.FIT + manual DPR:** call `game.scale.setGameSize()` on resize.
   `game.scale.resize()` doesn't update the FIT aspect, which breaks rotation.
4. **`fps.panicMax`** defaults to 120 frames during which Phaser clamps each
   delta to 1/60 s. On a 30 fps tablet that is 4 s of slow motion at the
   start of every level (and ~15 s in headless). It is set to **20**.
5. **Hit from below:** use `playerBody.touching.up` inside the Arcade
   collider callback. Arcade resolves every fixed physics step, so it is
   reliable at any frame rate (unlike the old Rapier events).
6. **Zoom and scrollFactor 0:** Phaser zooms around the camera centre. Use
   `fixedView()` for anything screen-fixed.
7. **Tall screens:** let the camera bounds grow upwards (section 9.3).
   Otherwise portrait phones show a big empty area under the world.
8. **The sun vs the HUD:** on portrait screens the sun moves down and in
   (section 11.2).
9. **Seeded layout and settings:** consume the same random numbers whatever
   the motion setting. Otherwise reduced motion changes the level's look.
10. **React StrictMode is on** and safe (one canvas, verified). It broke
    rapier events in the 3D era; that problem doesn't apply to Phaser.
11. **Phaser's keyboard is disabled** (`input.keyboard: false`). All input
    goes through `useInputStore`, and `pressJump` counts presses so taps
    between frames are never lost.
12. **Round buttons in flex columns** must be `shrink-0`, or they become
    ovals on short screens.
13. **SVG in `<img>` / Phaser** can't use page web fonts or `transform-origin`
    reliably (Safari). Keep the art font-free and draw parallelograms
    directly. **Text that needs the game font must be Phaser Text** (or
    React), rendered after `document.fonts.load()` (section 20.6).
14. **Fluent Emoji SVGs have a 32×32 viewBox:** load them with
    `loader.svg(key, url, {width, height})` at the wanted size × resolution.
15. **Cloud sandbox:** `*.github.io` (the live site) and some hosts
    (opengameart, iconify) are blocked by the proxy (403/ENOTFOUND).
    `raw.githubusercontent.com`, `registry.npmjs.org` and `fonts.googleapis.com`
    work. Verify deploys via the GitHub Actions run (GitHub MCP tools), not by
    fetching the site.
16. **Never `pkill -f vite`** (or any pattern that appears in your own
    command line): it kills your own shell (exit 144). Use
    `pgrep -f "^node .*vite" | xargs -r kill`.
17. **Foreground `sleep` is blocked** in the sandbox. To wait for something,
    use a background command with an `until` loop, or the Monitor tool.
18. **Playwright** lives at `/opt/node-tools/node_modules/playwright` in the
    sandbox (`scripts/e2e/playwright.cjs` resolves it). Don't run
    `playwright install`. Chromium args:
    `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
    Pulsing buttons need `click({ force: true })` (Playwright waits for
    "stable" elements).
19. **Kids overshoot:** test scripts (and children) react late. Keep the
    targets generous (block width 92, wide platforms) and gaps short.
20. **Letters order:** `lettersDiscovered` is in discovery order. Display
    sorted by `ARABIC_LETTERS` order.

---

## 20. WORK IN PROGRESS: the template level system (Step 1), exact design

> **Status: ✅ DONE (2026-10-17).** Implemented as designed below, with these
> as-built details (they override the design text where different):
> - Files: `game/letters.ts`, `game/levelGenerator.ts` (+ `levelGenerator.test.ts`,
>   which also tests the letter table and the catalog), `player/DotCompanions.ts`,
>   `mechanics/LetterDisplay.ts`, `mechanics/WordFriend.ts`; `LevelScene` has
>   `preload()` (word picture) and `buildClassicMechanics` / `buildTemplateMechanics`;
>   `levels.ts` has `kind`, `world`, `template`, `letter`, and a cached
>   `getLevelDefinition`; `LEVEL_COUNT = 27`; `CREDITS.md`;
>   `scripts/e2e/template-level.cjs` (LEVELS env, default `2,4,5,27`).
> - `DotCompanions.add(from)` takes the point where the dot appears (the
>   child's head); `releaseTo(targets, onEach)` flies 650 ms with 200 ms
>   stagger and a control point 140 px above.
> - LetterDisplay: font size 300, padding 24, `resolution = r`, `rtl: true`;
>   0-dot letters are drawn in **grey `#b9c1ce`** and switch to `spec.color`
>   with `setColor` (a tint multiplies with the colour, so it can't grey a
>   letter). Slots are computed from the glyph's **ink bounds** (scanning the
>   text canvas alpha > 140, step 2 px): above → `inkTop − 28`; below →
>   `inkBottom + 30`; inside → `inkTop + 0.7·h`; 0 dots → ink centre; x =
>   centre, ±28 for 2 dots, and a third dot 44 px above for 3. Ghost dots are
>   scale 0.85/r, **tinted with the letter colour** (white dashed rings were
>   invisible on the sky). The sensor is 340×400 centred on the letter.
>   Completion: ghosts and filled dots fade, the text becomes `spec.letter`
>   with an elastic pop from 0.8, sparkles, `discoverLetter`, `playSound('win')`,
>   then speech after 400 ms.
> - WordFriend: loaded at `160·1.4·r` px, shown 160×160, sensor 240×260; it
>   says the word, or `name… word` once the letter is complete.
> - `DISPLAY_FONT` lives in `constants.ts`. `PreloadScene` waits for
>   `document.fonts.load('800 64px "Baloo Bhaijaan 2"', …)` (max 2.5 s) before
>   starting the level. The Google Fonts links were removed from `index.html`;
>   `main.tsx` imports the Fontsource CSS (arabic and latin, weights 700 and 800).
> - Title Play starts `max(unlockedLevels)` (filtered by `isLevelAvailable`).
> - Verified: the dotless glyphs ٮ (ت ث) and ح render correctly in the font;
>   the full letters replace them on completion.

### 20.1 Goals
- **One template** turns a `LetterSpec` into a full, varied, completable
  level, so each new letter costs data rather than code.
- Level 1 (أ and ب) **stays the hand-made "classic" level** (it has the
  special ب trampoline and the أ + lion art). Template levels start at ت.
- Level ids: **1 = classic (أ, ب)**, **2..27 = template levels for
  `LETTERS[2..27]`** (ت … ي). That's 27 levels in total
  (`TOTAL_LEVELS = LETTERS.length − 1 = 27`).

### 20.2 The letter table (`src/game/letters.ts`), the authoritative content
`LetterSpec = {letter, name, word, emoji, dots: 0|1|2|3, dotPlace: 'above'|'below'|'inside', dotless, world: 1..7, color}`.

| # | letter | name | word | emoji file | dots | place | dotless | world | color |
|---|---|---|---|---|---|---|---|---|---|
| 0 | أ | ألف | أسد | lion | 0 | above | ا | 1 | #ff6b6b |
| 1 | ب | باء | بطة | duck | 1 | below | ٮ | 1 | #3fb5ff |
| 2 | ت | تاء | تفاحة | apple | 2 | above | ٮ | 1 | #ff5c8a |
| 3 | ث | ثاء | ثعلب | fox | 3 | above | ٮ | 1 | #ff9d2e |
| 4 | ج | جيم | جمل | camel | 1 | inside | ح | 2 | #e8a33d |
| 5 | ح | حاء | حصان | horse | 0 | above | ح | 2 | #c77dff |
| 6 | خ | خاء | خروف | sheep | 1 | above | ح | 2 | #36c98e |
| 7 | د | دال | دب | bear | 0 | above | د | 2 | #ff7a45 |
| 8 | ذ | ذال | ذرة | corn | 1 | above | د | 3 | #f5b70a |
| 9 | ر | راء | ريشة | feather | 0 | above | ر | 3 | #4cc2ff |
| 10 | ز | زاي | زرافة | giraffe | 1 | above | ر | 3 | #ff9d2e |
| 11 | س | سين | سمكة | fish | 0 | above | س | 3 | #2fb8e8 |
| 12 | ش | شين | شمس | sun | 3 | above | س | 4 | #ffb000 |
| 13 | ص | صاد | صاروخ | rocket | 0 | above | ص | 4 | #7c6cff |
| 14 | ض | ضاد | ضفدع | frog | 1 | above | ص | 4 | #3cc96b |
| 15 | ط | طاء | طائرة | airplane | 0 | above | ط | 4 | #4a90ff |
| 16 | ظ | ظاء | ظرف | envelope | 1 | above | ط | 5 | #e86ad8 |
| 17 | ع | عين | عنب | grapes | 0 | above | ع | 5 | #9b5cff |
| 18 | غ | غين | غيمة | cloud | 1 | above | ع | 5 | #5aa9ff |
| 19 | ف | فاء | فيل | elephant | 1 | above | ڡ | 5 | #8a9bb0 |
| 20 | ق | قاف | قطة | cat | 2 | above | ٯ | 6 | #ff8a3d |
| 21 | ك | كاف | كلب | dog | 0 | above | ك | 6 | #c48a4a |
| 22 | ل | لام | ليمون | lemon | 0 | above | ل | 6 | #f2c200 |
| 23 | م | ميم | موز | banana | 0 | above | م | 6 | #f5a623 |
| 24 | ن | نون | نحلة | bee | 1 | above | ں | 7 | #f7b500 |
| 25 | ه | هاء | هدية | gift | 0 | above | ه | 7 | #ff4d6d |
| 26 | و | واو | وردة | rose | 0 | above | و | 7 | #ff3d77 |
| 27 | ي | ياء | يد | hand | 2 | below | ى | 7 | #ffb347 |

Notes:
- The world grouping in the table (4 letters per world, in alphabet order:
  1 = أ ب ت ث, 2 = ج ح خ د, 3 = ذ ر ز س, 4 = ش ص ض ط, 5 = ظ ع غ ف,
  6 = ق ك ل م, 7 = ن ه و ي) is the agreed grouping, and matches PLAN.md.
- Dotless forms use Unicode letters: U+066E `ٮ` (dotless beh), U+066F `ٯ`
  (dotless qaf), U+06A1 `ڡ` (dotless feh), U+06BA `ں` (dotless noon), U+0649
  `ى` (alef maksura = dotless yeh), and the base letters ح د ر س ص ط ع.
  **Verify in the browser** that the font renders each one (Baloo Bhaijaan 2
  covers Arabic; if a glyph is missing, fall back to showing the full letter
  greyed out with ghost dots overlaid).
- `requiredDots(spec) = max(1, dots)`. Letters with **0 dots still need one
  "sparkle"**: the letter starts grey and "wakes up" (gets its colour) when
  the sparkle arrives. This keeps one rule for every level: bring the light
  to the letter.
- Word choices are simple, concrete and picturable for kindergarten, without
  diacritics. The owner may ask to change any. Keep the emoji file names in
  sync.

### 20.3 Level definition changes (`src/game/levels.ts`)
Extend `LevelDefinition` (engine-free):
```ts
type LevelKind = 'classic' | 'template';
interface TemplateMechanics {
  stars: { x: number; y: number }[];        // 3 stars
  blocks: { x: number; y: number }[];       // requiredDots(spec) Mystery Blocks (centres)
  letter: { x: number; groundY: number };   // where the big letter stands
  friend: { x: number; groundY: number };   // where the word picture stands
  goal: { x: number; groundY: number };
}
interface LevelDefinition {
  id; kind: LevelKind; width; height; spawn; groundY; cloudSeaY; platforms; goals; decorSeed;
  mechanics?: LevelMechanics;    // classic only (Level 1)
  template?: TemplateMechanics;  // template only
  letter?: LetterSpec;           // template only
  world: number;                 // 1..7 (Level 1 → 1)
}
```
- `LEVEL_DEFINITIONS[1]` = the current classic level (`kind: 'classic'`,
  `world: 1`).
- `getLevelDefinition(id)`: for `id ≥ 2`, build the definition (and cache
  it) with `generateTemplateLevel(LETTERS[id], id)`. `isLevelAvailable(id)` =
  `1 ≤ id ≤ 27`.
- **Store:** change `LEVEL_COUNT` in `useGameStore.ts` from 5 to **27** (keep
  it in sync with `TOTAL_LEVELS`; add a unit test asserting
  `LEVEL_COUNT === TOTAL_LEVELS`).
- `goals = { totalStars: 3, letterDotsRequired: requiredDots(spec) }`.

### 20.4 The generator (`src/game/levelGenerator.ts`, engine-free and unit-tested)
`generateTemplateLevel(spec, levelId): LevelDefinition`, deterministic with
`createRandom(levelId · 7919 + 13)`. Constants (world pixels):
```
PLATFORM_COUNT = 6
GROUND_Y_MAX = 1100      (lowest surface; also groundY for the parallax)
GROUND_Y_MIN = 780       (highest surface)
GAP = 110..160           (horizontal gap between platform edges)
STEP_UP_MAX = 110        (next surface at most 110 px higher)
STEP_DOWN_MAX = 200      (next surface at most 200 px lower)
MIDDLES: first platform 4, others 2..5 (the letter platform ≥ 4, the goal platform ≥ 4)
BLOCK_CENTRE = surface − 254   (block bottom 211 px above the surface, as in Level 1)
STAR_Y = surface − 64          (collected by walking through)
CLOUD_SEA_Y = 1290, height 1440
```
Algorithm:
1. `P0 = {x: 0, y: 1100, middles: 4}`.
2. For i = 1..5: `x = prevRight + randInt(110, 160)`;
   `y = clamp(prevY + randInt(−110, +200), 780, 1100)`; if
   `y < prevY − STEP_UP_MAX`, set `y = prevY − STEP_UP_MAX`. `middles` as
   above. The platforms holding blocks, the letter and the friend are
   `sparse: true`.
3. **Blocks:** `requiredDots(spec)` blocks, one each on platforms 1, 2, 3 (in
   order), at x = that platform's centre, `y = surface − 254`.
4. **Letter:** on platform 4, at x = its centre − 60. **Friend** on platform 4
   at the letter x + 230.
5. **Stars:** platforms 1, 3 and 5 at `(left + 0.3·width, surface − 64)`. If
   a star would overlap a block's x within 120 px, move it to `0.7·width`.
6. **Goal:** platform 5 at `right − 200`.
7. **Spawn:** `(180, 1100)`. **Width:** P5's right edge + 224. `groundY` = 1100.
   `decorSeed = levelId`. `world = spec.world`.

Unit tests (`levelGenerator.test.ts`) for **all 26 template letters**:
deterministic output; every gap within 110..160; every step-up ≤ 110 and
step-down ≤ 200; surfaces within 780..1100; the block count equals
`requiredDots`; each block bottom is 180–230 px above its platform surface
and horizontally inside the platform; the letter, friend and goal sit on
platforms 4–5; stars inside their platforms; the level width covers the
goal.

### 20.5 New mechanics for template levels
**DotCompanions** (`player/DotCompanions.ts`): the dots the child is carrying.
- `add()`: a new `glow-dot` (scale 0.5/r) joins and orbits the child's head
  (radius 46, angular speed 2.2 rad/s, evenly spaced, bobbing 4 px).
- `count`. `releaseTo(targets, onEach)`: each carried dot flies (the
  MysteryBlock-style Bézier, 600 ms, staggered by 180 ms) to the next free
  slot, and `onEach(i)` is called on arrival.
- The MysteryBlock is reused unchanged: `getDotTarget = () => playerHead`
  (feet − 150), and `onDotDelivered = () => companions.add()`. (The dot flies
  from the block to the child and then follows them.)

**LetterDisplay** (`mechanics/LetterDisplay.ts`): the big candy letter.
- A Phaser **Text** with `spec.dotless`, fontFamily
  `'"Baloo Bhaijaan 2", "Noto Sans Arabic", sans-serif'`, fontStyle `'800'`,
  fontSize 300 (world px), colour `spec.color`, stroke `#ffffff` width 14, and
  shadow `(0, 8, 'rgba(0,0,0,0.18)', blur 0, stroke true, fill true)`.
  Origin (0.5, 1), placed with its bottom at `groundY − 20`. A gentle float
  (y −14, 1700 ms yoyo) and rock (±2°). Depth decorBack + 1.
- Letters with 0 dots start **greyed** (`setTint(0xbfc7d5)` or a grey fill)
  and get their colour back on completion.
- **Slots:** `requiredDots` ghost dots (`letter-dot-ghost`, scale 0.8/r)
  positioned from the text's bounds `b`:
  - above: `y = b.top + 0.18·b.height`; below: `y = b.bottom − 0.16·b.height`;
    inside: `y = b.centerY + 0.12·b.height`; 0 dots: the centre of the bounds.
  - x: 1 dot → `b.centerX`; 2 → `centerX ± 26`; 3 → bottom pair `± 26` plus
    one 38 px above the centre.
  - These are approximate. **The final state swaps the text to the real
    letter (`spec.letter`)**, which shows the dots correctly, so small slot
    misplacement never shows in the end.
- A sensor zone covering the letter and its platform area (from the letter's
  x − 160 to x + 160, 380 px tall). On overlap, if `companions.count > 0`,
  release them into the next empty slots; each arrival →
  `useGameStore.collectLetterDot()`, a filled `letter-dot` pop (Back.easeOut),
  and `playSound('pop')`.
- On `selectIsLetterComplete` becoming true: hide the ghost and filled dots,
  set the text to `spec.letter` (full letter) with a pop (scale 0.8 → 1.12 → 1),
  clear the tint, a sparkle emitter, `discoverLetter(spec.letter)`,
  `speakArabic(`${spec.name}… ${spec.word}`)` after 350 ms, and a wiggle.

**WordFriend** (`mechanics/WordFriend.ts`): the word picture.
- The emoji image (key `emoji-<name>`), loaded **per level** in
  `LevelScene.preload()` with
  `this.load.svg(key, import.meta.env.BASE_URL + 'emoji/' + name + '.svg', {width: 220·r, height: 220·r})`
  (skip if the texture already exists). Displayed at 160×160 world px,
  origin (0.5, 1), standing at `groundY + 2`, depth decorBack + 2.
- Idle: a gentle bounce (y −10, 900 ms yoyo) and a squash-breathe.
- Sensor: on overlap (debounced 3.5 s) → a happy jump (y −60, 300 ms yoyo,
  Back.easeOut), a spin flip (scaleX → −1 → 1), sparkles, and
  `speakArabic(spec.word)`. Once the letter is complete, its greeting also
  speaks the letter: `${name}… ${word}`.
- The friend replaces the lion for template levels. Level 1 keeps the lion.

The **GoalGate**, **Star** and **Platform** classes are reused unchanged.

### 20.6 Font loading for Phaser text
- `main.tsx`: `import '@fontsource/baloo-bhaijaan-2/arabic-800.css'` and
  `'@fontsource/baloo-bhaijaan-2/800.css'` (Latin), plus 700 if the UI needs
  it. **Remove the Google Fonts `<link>`s from `index.html`** (self-hosted
  works offline and avoids flashes).
- `PreloadScene.create()`: before starting the level, `await Promise.race([
  document.fonts.load('800 64px "Baloo Bhaijaan 2"', 'أبتثجحخ'), timeout(2500)])`
  (Phaser `create` can't be async: wrap it in a promise and start the level in
  `.then`). A canvas Text drawn before the font loads would cache the
  fallback font.

### 20.7 LevelScene branching
```
create():
  if (level.kind === 'classic') buildClassicMechanics()   // current code (LetterB, MysteryBlock→ب, أ+lion)
  else buildTemplateMechanics()                           // Blocks→DotCompanions, LetterDisplay, WordFriend
  common: stars, goal, player, platforms, decorations, ambient, camera
```
Template colliders:
```
collider(player.zone, block.zone, → block.handleCollision(playerBody))      // each block
overlap (player.zone, letterDisplay.sensor, → letterDisplay.receive(companions))
overlap (player.zone, friend.sensor, → friend.greet())
```
`DotCompanions.update(delta, playerFeet)` runs from `LevelScene.update`.

### 20.8 Title "Play" behaviour (until the map exists in Step 2)
Play starts the **highest unlocked available level** (`max(unlockedLevels)`
capped at 27), so the child continues where they left off.

### 20.9 Credits
Create `CREDITS.md`: Fluent Emoji (MIT, © Microsoft Corporation, link,
"pictures in public/emoji"), Baloo Bhaijaan 2 (OFL-1.1, Ek Type, via
Fontsource), and a note that all other art is original and generated in
code.

### 20.10 Step 1 acceptance
- Unit: the generator tests (20.4), `LEVEL_COUNT === TOTAL_LEVELS`, the
  letters table (28 entries, unique letters in `ARABIC_LETTERS` order, an
  emoji file exists for each: test with `fs.existsSync` against
  `public/emoji`).
- Browser: a new script `scripts/e2e/template-level.cjs` that, for a sample of
  levels (ت = id 2, ج = 4, ح = 5 (0 dots), ي = 27), sets the level unlocked
  (`useGameStore.setState({unlockedLevels: [...]})`), starts it, bonks every
  block (`scene.blocks[i].bonk()`), walks or teleports to the letter (or
  calls the receive API), waits for completion, checks
  `lettersDiscovered` includes the letter, walks to the goal (or calls
  `completeLevel`), and screenshots the letter before and after.
- Visual: a screenshot of the letter screen for ت and ث shows the dotless
  body + ghost dots, then the real letter after completion. Check the dotless
  glyphs render (not boxes).
- Level 1 still passes `full-playthrough.cjs` unchanged.

---

## 21. Roadmap specifications (Steps 2–5), with concrete numbers

Order (from PLAN.md): Step 2 = map + world palettes, Step 3 = picture quiz,
Step 4 = action mechanics, Step 5 = voice + final QA. Each spec below is
detailed enough to implement without further design decisions. If the owner
asks for changes, the owner wins. Update this section to match.

### 21.1 World map and level select (Step 2a)
- **As built 2026-10-20 (first part):** `components/ui/LevelSelect.tsx`, a
  full-screen grid of all 27 levels (the letter glyph in its colour, with
  "أ ب" for Level 1, plus best stars). The next level pulses. It opens from the
  amber grid button beside Play. **All levels are open** (owner request:
  progress is per device, so other devices only had أ ب):
  `isLevelUnlocked = isValidLevelId`, and `unlockedLevels` only drives
  "Play → continue". The old 2-letter shelf on the title screen was
  removed. `FullscreenButton` (`utils/fullscreen.ts`, webkit-prefixed, locks
  landscape when possible, hidden where unsupported, e.g. iPhone) sits on
  the title top bar and the pause menu. The world-map styling below is
  still to do.
- A new React screen `WorldMap.tsx` (no Phaser). `GameScreen` gains `'map'`
  (add it to the store type; `startLevel` still returns to `'playing'`;
  `exitLevel` goes to `'map'` instead of `'title'`).
- Title Play → `setScreen('map')`.
- Layout: a horizontally scrolling (snap) strip of **7 world "islands"**, each
  a big rounded card drawn in its palette (section 21.2) with the world
  number as dots (●●●), 4 letter stones in a path (world 1 shows **أب, ت, ث**:
  Level 1 covers أ and ب together), and the world's friend emoji as a mascot
  (world 1 lion, 2 camel, 3 giraffe, 4 fish, 5 cloud, 6 cat, 7 gift).
- A letter stone shows the letter in the display font. States: **locked**
  (grey, a small lock icon, not clickable, wobbles on tap), **open** (colour
  `spec.color`, pulsing), **done** (colour plus 1–3 small stars from
  `levelRecords[id].bestStars`).
- Tapping an open stone → `unlockAudio(); startLevel(id)`.
- Auto-scroll to the world of the highest unlocked level.
- A back button (HomeIcon) → title. Icon-only, child-sized (stones 72–88 px).
- Unlocking stays linear (completing level n unlocks n + 1). A world unlocks
  when its first level does.
- LevelCompleteScreen "Next" stays. Its Home → map.
- Unit test: a pure helper `mapModel(unlockedLevels, levelRecords)` → the
  world and stone states.
- Cost estimate ~40–60k tokens.

### 21.2 World palettes (Step 2b)
Implement as `art/themes.ts`: `WORLD_THEMES: Record<1..7, Partial<typeof PALETTE> & {skyColor, hillsFarFill, …}>`.
The art builders must take a palette **parameter** (`palette = PALETTE`)
instead of importing `PALETTE` directly. Hills, platforms, sky, cloud sea,
flora tints and the sky colour then render per world. Texture keys get a
world suffix (`hills-far@3`) and are queued **lazily** for the current world
only (in `LevelScene.preload`), so memory doesn't grow sevenfold.

| world | name | skyTop | skyMid | skyHorizon | farHillA | farHillB | midHill / Deep | nearHill / Deep | frosting / Deep | caramel / Deep | chocolate |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | جزر الحلوى (candy) | #62bdff | #a6e0ff | #ffe0f0 | #d8b6f7 | #f8b4d6 | #86e0bd / #5fcca2 | #69d872 / #47bf59 | #7ee36b / #52c556 | #ffbd70 / #f08f4c | #9a5634 |
| 2 | الصحرا (desert) | #ffb35c | #ffd9a0 | #fff1d6 | #f2b48a | #f7c99b | #e9b26b / #cf8f45 | #f0c36d / #d9a24a | #ffe08a / #f2b84b | #e8955a / #c96f35 | #8a4a2b |
| 3 | الغابة (forest) | #4fb7a5 | #9fe0c8 | #e6fff2 | #7cc9a0 | #a6dcb0 | #4fbf7f / #35975f | #3fae5a / #2b8a45 | #5ccf5c / #3aa53f | #c9925a / #a06a35 | #6b4226 |
| 4 | البحر (sea) | #2f8fe8 | #79c8ff | #d9f3ff | #8ad1ff | #a7e3f5 | #54c6d9 / #2fa3b8 | #3db8c9 / #2394a6 | #7ff0e0 / #3fcab5 | #ffd6a0 / #e9a868 | #b07a4a |
| 5 | السما (sky night-pastel) | #6b5bd6 | #a99bff | #ffd9f5 | #c6a8ff | #f3b2e8 | #9c8cf0 / #7766d6 | #8ec5ff / #5f9be6 | #c6b8ff / #9a86f0 | #ffd1e8 / #f2a2cc | #8a5aa8 |
| 6 | المزرعة (farm) | #7fd4ff | #c4ecff | #fff8d6 | #b9e08a | #e8e48c | #9ad86a / #6fb845 | #7ccf4f / #57ad32 | #a3e05a / #78c03a | #f5c46a / #d99a3d | #8a5a2b |
| 7 | القلعة (castle) | #ff8fc8 | #ffc4e6 | #fff3c4 | #ffb3d9 | #ffd59c | #c9a8ff / #a07ff0 | #ffd166 / #f0b23a | #ffe680 / #f5c842 | #ff9ed2 / #f070ae | #b0558a |

- Light and rim variants: derive them by mixing with white at 45% (add a
  `lighten(hex, amount)` helper in `art/svg.ts` with a unit test).
- The candy accents (sprinkles, lollipop colours) stay the same in every
  world. They are the brand.
- Decorations per world (optional, cheap): reuse the flora, re-tinted. In
  world 4 hide the butterflies and use bubbles (sparkle texture, a blue tint,
  rising) instead.
- Cost estimate ~20–30k tokens (+10k for lazy per-world loading).

### 21.3 Picture quiz mini-game (Step 3): "اختار الصورة اللي بتبدأ بالحرف"
- A React screen `PictureQuiz.tsx` (no Phaser; cheap). It is shown **after
  LevelCompleteScreen → Next** for template levels (and after Level 1, for ب),
  before the next level starts. A skip arrow is available after 3 s.
- The big letter (the display font, `spec.color`, ~180 px) at the top. Below
  it, **3 picture cards** (Fluent Emoji `<img src={BASE_URL + 'emoji/x.svg'}>`,
  140 px): one is `spec.emoji`, two are other letters' pictures, chosen
  deterministically (`createRandom(levelId)`) from letters **already
  discovered** if possible, never with the same first letter.
- Tap the correct one → the card bounces, a confetti burst (CSS), "win" sound,
  `speakArabic(`${spec.word}`)`. After 1.5 s continue.
- Tap a wrong one → the card wobbles gently and fades to 60% (stays tappable),
  with `playSound('tap')`. No buzzer and no red. After 2 wrong taps the
  correct card glows as a hint.
- Rounds: 3 per quiz. Round 1 is the current letter; rounds 2–3 are other
  discovered letters (or the current letter again if fewer exist).
- Rewards: none needed. Optional: a sticker in a future album.
- A pure helper `buildQuizRounds(levelId, discovered, LETTERS)` with unit
  tests (the correct answer is always present, no duplicate pictures,
  deterministic).
- Cost estimate ~40–60k tokens.

### 21.4 Action mechanics (Step 4)
General rules: **no damage**. "Hit" = a gentle knock-back
(`vx = ±260`, `vy = −380`, a 0.5 s input lock, and the puppet does a dizzy
spin: head tilt plus stars, sound 'bump'). Everything is added through the
level data, so the generator can place it (`TemplateMechanics.hazards`,
`movers`, …). Each mechanic is a class in `src/game/mechanics/` with its
art in `art/mechanics.ts` (or a new `art/action.ts`), registered in `ART`.
Build the cheapest four first.

**A. Rolling watermelon / candy ball** (`Roller.ts`), worlds 2 and 6 (first ones)
- Art: `watermelon` 96×96 (a green striped circle with a pink-slice gloss and
  a smiling face) and `candy-ball` 80×80 (a swirl).
- A dynamic Arcade body (a circle, r 40), spawned every 3.5 s from a spawner
  at the right end of a downhill platform, rolling left at 220 px/s; angular
  rotation = vx/r. It bounces once on landing and despawns off-platform or in
  the cloud sea.
- Overlap with the player: if the player is above it and falling
  (`body.velocity.y > 0` and feet < roller centre) → **bounce the player**
  (`launch(700)`, 'boing'), the roller squashes and continues. Otherwise →
  knock-back.
- Generator placement: at most 1 spawner per level, on a platform at least
  5 middles wide, not on the letter or block platforms.
- ~15–20k tokens.

**B. Cute bees / bugs** (`Bee.ts`), worlds 3 and 7
- Art: `bee` 64×56 (yellow and brown stripes, little wings, a smile) and
  `ladybug` 60×48.
- Patrol: a sine path, horizontal range ±160 px at 70 px/s, vertical bob ±18.
  No gravity.
- Stomp (the player falling onto it from above) → it turns into a flower:
  swap to `flower-*` with a pop, sparkles, 'pop', and a small player bounce
  (`launch(600)`). Side contact → knock-back.
- At most 2 per level, never within 220 px of a block or the letter.
- ~15–20k tokens.

**C. Candy cannon** (`Cannon.ts`), world 1 template levels and world 5
- Art: `cannon` 140×110 (a pink barrel with sprinkles on a cupcake base).
- A sensor at the mouth. On enter: hide the puppet, a 0.4 s rumble, then
  launch along a fixed arc (`vx = 520`, `vy = −1250`), puppet visible, arms
  up, sparkle trail, 'boing' + 'whoosh'. Input is restored on landing.
- Use it to reach a high platform with bonus stars (the generator: if
  `levelId % 3 === 0`, add a high bonus island reachable only by the
  cannon, holding a 4th star that doesn't count for the goal; keep
  `totalStars = 3` and award the bonus as an extra sparkle).
- ~15–20k tokens.

**D. Moving and crumbling platforms** (`MovingPlatform.ts`, `CrumblePlatform.ts`, `Seesaw.ts`)
- Moving cloud platform: art `cloud-platform` (a 3-middle-wide cloud) whose
  body is immovable, `allowGravity false`, moving horizontally ±180 px
  (period 4 s, Sine). **Carry the player**: add the platform's delta to the
  player when `touching.down` on it.
- Crumbling cookie: art `cookie-platform` (2 middles, a chocolate-chip
  cookie). 0.8 s after the player lands it shakes, then falls (disable the
  body, tween down and fade). It **respawns after 3 s** (it must never strand
  a child).
- Seesaw (optional): a pivoting plank; skip if time or tokens are short.
- The generator may replace one gap with a moving cloud (horizontal span
  160 → 360 px allowed because the cloud carries the child).
- ~20–30k tokens for moving + crumbling.

**E. Squirrel chase** (`ThiefSquirrel.ts`), world 3
- After the first block is bonked, a squirrel (art `squirrel` 96×96) grabs
  the dot and runs ahead along the platforms (it ignores gaps; it hops with
  a scripted arc) at 0.9 × the player speed, stopping to wait if the
  player is more than 500 px behind. When the player touches it: it giggles,
  drops the dot (the dot joins the companions), and runs off-screen.
- ~25–35k tokens.

**F. Ride the word friend** (`RideSection.ts`), worlds 2 (camel) and 6 (horse)
- A trigger zone. The player mounts the friend sprite (the emoji scaled up
  to 200 px, bobbing), then **auto-runs right at 420 px/s for ~8 s** across a
  generated flat corridor with low hurdles (`candy-ball` static, 60 px tall)
  and gaps ≤ 140. **Jump is the only input.** A hit on a hurdle = a short
  stumble (no knock-back off the mount). At the end the friend stops and
  the player dismounts.
- ~30–40k tokens.

**G. Letter rain** (`LetterRain.ts`), world 5
- A sky section: letters (Phaser Text, the display font, random candy
  colours) fall slowly (60–90 px/s) in 3 columns. **Catch the current
  letter** (overlap) → +sparkle and 'collect'. Wrong letters just pass
  through (no penalty). Catching 3 correct ones opens the path (a cloud
  bridge appears).
- ~25–35k tokens.

**H. End-of-world friendly "boss"** (`TickleBoss.ts`), the last level of each world
- Art: `grumpy-cloud` (a big cloud with a pouty face; the happy version for
  the end), recoloured per world.
- An arena platform. The boss floats and puffs **wind** (pushes the player
  sideways gently, `vx ±120`, no damage). There are **3 big buttons**
  (`tickle-button`, a feather icon) on low platforms. Jumping on a button →
  a feather flies to the boss, it giggles (squash, a laugh sound: the 'win'
  arpeggio fast), and after the 3rd press it laughs and turns happy,
  releasing the world's 4 letters as a celebration (sparkles, speech of the
  4 letters' names).
- First boss ~40–60k tokens; each recolour ~10–15k.

### 21.5 Mechanic placement table per world (guideline for the generator)
| world | mandatory | optional |
|---|---|---|
| 1 candy | blocks + letter | cannon (ث level) |
| 2 desert | rollers (watermelon) | ride camel (ج level) |
| 3 forest | bees | squirrel chase (ر level) |
| 4 sea | moving bubbles (moving platforms, recoloured) | fish (bee variant) |
| 5 sky | moving clouds | letter rain (ع level) |
| 6 farm | crumbling cookies | ride horse (ك level) |
| 7 castle | a mix | the final boss (ي level) |

### 21.6 Recorded voice (✅ done 2026-10-17 with Microsoft's neural voice, see 15.3; human recordings optional)
- Files: `public/audio/letter-<index>.mp3` (the letter name, for example
  "باء") and `public/audio/word-<index>.mp3` (the word, for example "بطة"),
  with index = the LETTERS index (0..27). Mono, 44.1 kHz, ~64–96 kbps,
  trimmed, with peaks normalised to −1 dB. Plus `well-done.mp3` ("أحسنت").
- `utils/speech.ts` gains `speakLetter(index)` / `speakWord(index)`, which
  play the recording if present (`fetch(..., {method: 'HEAD'})` cached, or
  a static manifest `public/audio/manifest.json` listing the available
  files) and **fall back** to `speakArabic` TTS.
- The owner records with a phone voice memo, one file per item, saying it
  slowly and clearly. Give the owner a checklist of the 57 items.
- ~20–40k tokens.

### 21.7 Final QA and performance (Step 5b)
- Run every play-test, plus `template-level.cjs` for all 26 template levels
  (a loop) checking that each completes via the API path.
- Performance targets: 60 fps on a mid tablet; texture memory per level under
  ~60 MB at 2× (current Level 1 ≈ 35 textures). Use per-world lazy loading
  (21.2).
- Check portrait and landscape phones, a tablet at 2×, and a desktop.
- Update `PLAN.md`, this file and README; tag a release (`git tag v1.0`,
  only if the owner agrees).

---

## 21.8 As built 2026-10-20: double jump, coins, shop, letter thieves

### Double jump (`controller.ts`, `constants.ts`)
- `AIR_JUMPS = 1` and `DOUBLE_JUMP_SPEED = 900` (apex ≈ 202 px, a bit higher
  than the ground jump's 182, at the owner's request). Only a *fresh* press in
  the air double-jumps, so a press buffered just before landing still becomes
  a ground jump once the double jump is spent. Landing resets it. The output
  has `doubleJumped` (Player plays `boing` and a bigger puff). Level layouts
  never *require* it.

### Coins (`game/coins.ts`, `mechanics/Coin.ts`, art `coin`)
- `placeCoins(level)` is engine-free and deterministic. It puts an arc of 3
  coins over every gap ≥ 60 px (heights 88/128/88 above the lower surface),
  and a row of 3 (64 px apart, 62 px up) on even-index, non-sparse platforms
  after the first. Coins within 80 px of a star are dropped. Thieves arenas
  return none.
- On touch, `collectCoin()` adds straight to the persisted `coins` purse and
  to `session.coinsCollected`, so leaving mid-level loses nothing. Replaying
  pays again, which is fine for this audience.
- The coin shows in the HUD (purse total), on level-complete (+N), and on the
  title's shop button. React uses `CoinIcon` (same SVG as the game).
- The magnet tool: coins within 260 px of the child glide in
  (`Coin.pullTowards`).

### Shop (`game/shop.ts`, `components/ui/ShopScreen.tsx`)
- Catalogue (engine-free):
  - Costumes: animal onesies, i.e. an ear style plus colours. bear 0 (default),
    bunny 30, cat 40, dino 60, panda 80.
  - Skins: colour sets that recolour any costume. natural 0 (the costume's
    own colours), pink, mint and sky 25 each, gold 70, night 90.
  - Tools: bubble 50, magnet 80.
- Item ids are `kind:name`, and `STARTER_ITEMS` are owned from the start.
- Store (persisted, validated in `mergeShop`): `coins`, `ownedItems`,
  `costume`, `skin`, `tool`.
  - `buyItem(id)` checks price and ownership, then equips the item.
  - `equipItem(id)`: a costume or skin also sets `outfit: 'onesie'`. Tapping
    the equipped tool again puts it away.
- Art: `character.ts` has `OnesieLook {ears, colors}` and `onesieArt(look)`,
  which returns the 4 onesie textures with the same keys. The dino spikes are
  drawn on top of the hood, since there's no room above it.
  - `LevelScene.preload` rebuilds those textures only when `lookId` changes
    (registry key `onesieLook`).
  - `AvatarPreview` takes `outfit`/`costume`/`skin` overrides, which the shop
    uses for its previews.
- UI is icon-only.
  - Tabs: bear emoji, a colour swatch, bubbles emoji.
  - Tapping a tile previews it. The big button shows coin + price (buy) or a
    tick (wear). If the child can't afford it: a grey button, a soft wiggle
    and a `bump` sound, never a buzzer.

### Letter thieves mode ("سارقين الحروف")
- Entry: the level-select screen has 2 tabs (grid = adventure, thief face =
  thieves) showing all 28 letters. `startLevel(id, 'thieves')`, where id is
  the letter index + 1 (1..28, `THIEF_LEVEL_COUNT`). The session carries
  `mode`, `thievesTotal` and `thievesBefriended`.
- Arena: `generateGuardLevel` in `levelGenerator.ts`, looked up with
  `getGuardLevel(id)`.
  - Platforms: a centre island (6 middles) at y 1000, side islands 100 px
    higher, and two small steps 120 px up. All gaps are 140.
  - The complete letter stands in the centre (`GuardedLetter`).
  - Thieves: `5 + floor((world-1)/2)`, at most 2 at once (3 from world 5).
  - Thieves enter from both edges at y 740. The loop:
    `roam = {cx, halfWidth 620, y ground-170, bob 80}`.
- `Thief` (Phaser):
  - enter: flies at 170 px/s to the letter's grab point. On arrival it grabs
    a copy of the letter (`giggle`), and the big letter fades and shrinks a
    step.
  - roam: loops at `ROAM_RATE` 0.24 rad/s (~150 px/s, slower than the child
    runs) and **never leaves**.
  - Catch: touching it within 85 px of the child's centre, or a bubble. The
    thief giggles, the copy flies home (`restore`), the mask comes off
    (`thief-friend` texture), and it flies away. Catching one on its way in
    also counts.
  - There is no losing state.
- Each friend pays 3 coins. When all are friends: `GuardedLetter.celebrate()`,
  `win`, `celebrateLetter(i)`, then `completeLevel()` after 3.6 s.
  `completeLevel` in thieves mode only sets the screen (no records or
  unlocks). Next and replay keep the mode.
- HUD: the sun fills with befriended/total, plus a row of thief faces that
  turn into friend faces.
- Bubble wand (`BubbleShot`, any mode when `tool === 'bubble'`):
  - Fired by the cyan touch button (`pressAction`, `actionPresses` in
    `useInputStore`) or the X/Z/Enter/Shift keys. Cooldown 0.45 s.
  - It homes in on the nearest active thief within 900 px. With no thief, it
    floats and pops after 1.8 s.

## 21.9 As built 2026-10-20: challenge mode (🔥), harder thieves, unique maps

The owner's younger brother found the thieves mode too easy and wanted
"every letter in a different map", harder. It's a third tab in the level
select (Fluent `fire` emoji). The easy modes stay failure-free.

- **Store:** `GameMode 'challenge'`, `CHALLENGE_HEARTS = 3`, `session.hearts`.
  - `loseHeart()` (challenge + playing only) goes to screen `'tryAgain'` at 0.
    `TryAgainScreen` shows a giggling thief, empty hearts, and home + a big
    pulsing replay. No words.
  - Stars = hearts kept (`computeAwardedStars`). The best per letter goes in
    the persisted `challengeRecords` (1..28), shown on the challenge tiles.
- **Maps:** `generateChallengeLevel(spec, id)`, seed `id*4241+77`, cached in
  `getChallengeLevel`. All 28 layouts differ (tested).
  - 4–5 islands, y 780–1080, steps ±140, ordinary gaps 130–200. The letter
    stands on the middle island (4–5 middles).
  - Small floating steps 150–200 up over every other gap.
  - From world 2, one gap is 320–360 wide with a platform swinging across it
    (`move.dx = gap/2 − 70`, period 4.2 − 0.15·world). It can also be crossed
    with the double jump.
  - From world 4, the first step becomes a lift (`dy` 70, period 3.6).
- **Moving platforms** (`PlatformSpec.move {dx, dy, period, phase?}`): a
  dynamic, immovable, gravity-free body. Each frame `Platform.update` sets
  velocity = (target − pos)/dt, so it never drifts and Arcade carries the
  rider. Tiles follow the body. No scenery on movers.
- **Cast** (`CHALLENGE_CAST` per world, shuffled per letter; `guard.cast`):
  - Kinds: looper, dasher, armored, blinker, splitter, and the king, who
    comes last on the 4th letter of each world and on ي.
  - `thiefCount` counts a splitter as 3.
  - Max at once: 3, or 4 from world 4. Spawns every 2.2 s.
  - `guard.speed` = 1.25 + 0.08·world.
  - Kind table in `Thief.ts`:
    - dasher: tint peach, darts away 460 px/s for 0.5 s when the child is
      within 240 px, cooldown 2.2 s.
    - armored: 2 hits; the candy helmet flies off on the first.
    - blinker: tint cyan, poofs to another spot on its loop every 2.4 s.
    - splitter: tint green; when caught it bursts into 2 small, faster
      loopers that rush to steal again.
    - king: ×1.55 size, crown, 3 hits, throws twice as often.
  - Any extra hit gives 0.8 s of grace and a bounce away.
- **Candy** (`CandyShot`, art `thief-candy`):
  - Roaming thieves within 900 px of the child toss one every
    `throwEvery = max(2, 3.4 − 0.2·world)` s (±20%). It flies straight at
    where the child was, at 240 + 15·world px/s, for up to 4 s.
  - A hit within 52 px: `Player.hurt` (knock-back 300/−420, 0.25 s without
    control, 1.6 s of blinking during which nothing hits) and `loseHeart`.
  - Bubbles pop candies.
  - Falling into the cloud sea also costs a heart (`PlayerOptions.onFall`),
    and the bubble still floats the child home.
- Rewards: 5 coins per friend (3 in the easy mode). HUD: hearts, plus one
  thief face with a "left" count when there are more than 8 thieves.

## 22. Conventions

### 22.1 Code
- TypeScript strict and English identifiers. Prefer small classes per
  mechanic (Phaser) and pure functions for logic (tested).
- **Comment density:** every file starts with a short doc comment explaining
  its purpose and any non-obvious design. Explain *why*, not *what*. Match the
  existing style: block comments `/** … */` above exports, and short `//`
  comments for subtle lines.
- Formatting follows the existing files (2 spaces, single quotes,
  semicolons, trailing commas, ~120-column lines). There is no linter
  configured; match the surroundings.
- Engine boundaries (section 6.3): only `game/PhaserGame.tsx` (lazy) may
  import Phaser-dependent modules from React code.
- New colours → `palette.ts`. New tuning numbers → `constants.ts` or a
  named const at the top of the mechanic file.
- Store changes: update `useGameStore.test.ts`, keep the persisted version
  bump rules (if the persisted shape changes incompatibly, bump `version`
  and add a `migrate`).

### 22.2 Commits and pushing
- Branch: **`claude/arabic-toddler-platformer-avmer4`** (`git push -u origin <branch>`;
  on network failure retry up to 4 times with 2/4/8/16 s backoff).
- Message: a short imperative title (≤ ~72 chars), a blank line, then bullet
  points of what changed and why, then the attribution lines that the current
  session's system instructions specify. At the time of writing:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01DXitfzJMNy1JCdJyYP2Wdt
  ```
  (A new session uses **its own** attribution lines from its system
  instructions. Don't copy the session URL above into new commits.)
- Don't put model identifiers anywhere else (code, docs, PR text).
- Don't create pull requests unless the owner asks.
- Commit at the end of every step. Don't leave uncommitted work at the end
  of a turn.

### 22.3 Reporting to the owner
- Egyptian Arabic, concise: what was done, what was tested (and what
  couldn't be), anything that needs their action (for example recordings),
  and what comes next, as a question.
- Include the live link when something new is deployed.
- Never claim something was verified when it wasn't.

---

## 23. Glossary
| term | meaning |
|---|---|
| classic level | the hand-made Level 1 (أ, ب) with the ب trampoline and the أ + lion |
| template level | a level generated from a `LetterSpec` (ت … ي) |
| dotless / skeleton | the letter without its dots (ٮ for ب ت ث, ح for ج خ, …) |
| dot / sparkle | what the child brings to the letter; "sparkle" for 0-dot letters |
| companions | the dots orbiting the child's head while carried |
| word friend | the picture of the letter's word (أسد, بطة, …): a Fluent Emoji, or the drawn lion in Level 1 |
| Mystery Block | the glowing gift block, bonked from below to release a dot |
| cloud sea | the scalloped clouds at the bottom of the world; falling into it → bubble respawn |
| bubble respawn | the no-penalty return to the spawn after a fall |
| world | one of 7 themed groups of 4 letters (a palette swap of the candy world) |
| r / resolution | the art rasterisation factor (1 or 2) |
| factor | the parallax scroll factor of a background layer |
| design height | the 720 world px of height that every screen shows |
| runId | the session counter; a new runId rebuilds the level scene |
| sun progress | the HUD ring = (stars + dots) / (total stars + dots required) |

---

# Appendices

## Appendix A. The owner's requests, in order (the "why" behind the product)
A faithful summary of what the owner asked for, so new work stays aligned.

1. **Original brief:** "Lead Game Architect & Senior R3F Developer". Build a
   production-ready, modular 2.5D/3D web platformer for preschoolers
   learning Arabic (kindergarten level, no diacritics). **Do not generate
   the whole codebase at once**: follow phases, and at the end of each phase
   ask "Ready for the next phase?". No placeholders or mock code.
   - Phase 1: package.json, vite and tsconfig, the Zustand store (UI state,
     selected outfit, unlocked levels, uploaded face texture URL).
   - Phase 2: PhotoUploadModal (parents upload a photo), faceCropper
     (detect/centre the face, anti-aliased oval/circle crop, base64 data URL),
     Player (face texture on the head mesh; Onesie vs Explorer outfits from
     the store).
   - Phase 3: LetterB (a bouncing bowl), MysteryBlock (hit from below → a
     glowing dot snaps onto the B bowl), FloatingLetterA (a giant smiling
     'أ' with idle floating and a low-poly 'أسد' lion), and fail-safe bounds
     (falling resets smoothly to the start without penalty).
   - Phase 4: LevelOne (floor, floating islands, ambient + directional
     lighting with soft shadows, the A and B mechanics), HUD (icon-only
     progress: a smiling sun and stars), App and main.
   - The owner shared a reference image of **low-poly floating island tiles
     in an isometric style**. The 2D platforms' "floating diorama" look
     (grass top, earth body, rocks hanging underneath) descends from it.
2. Asked how to open the game, then chose **GitHub Pages**, and set Pages →
   Source → GitHub Actions themselves.
3. Asked to **keep working until the whole project is done** (Phases 2–4
   were then completed without stopping).
4. **Pivot:** the 3D look felt too rigid. Switch to "2D Smooth Cartoon /
   Vector Art" (Rayman Legends or Hollow Knight-like smooth 2D parallax, but
   bright cheerful candy-pop colours). Abandon R3F. Same mechanics (no
   diacritics, jumping on the ب bowl, the mystery block, photo face upload).
   Smooth sprite animations and parallax backgrounds. Revised phase plan
   first.
5. Approved: archive 3D on `archive/3d-prototype`; **Phaser 3**. Phase 1
   (clean-up and engine) → approved → Phase 2 (art and parallax: "vibrant,
   candy-colored SVG art (sky gradient, smiling sun, clouds, rolling hills,
   floating platforms)", "smooth and magical") → approved → Phase 3 (the
   player). During it: "when the character is done, finish the whole game
   so we can try it completely".
6. Asked for next-level ideas and token costs. Said ~30 min of gameplay is
   not enough; **wants 2–3 hours**. Asked "why so many tokens? we want to
   save". Suggested **using existing assets instead of reinventing the
   wheel**, and said easier solutions surely exist. Then asked for **more
   action ideas**.
7. Asked for **a plan file in the project so work can continue if the
   assistant forgets**, then asked for **this detailed document**: "give it
   every possible detail".

## Appendix B. API reference of the main classes (signatures)
```ts
// game/createGame.ts
createGame(parent: HTMLElement): { game: Phaser.Game; destroy(): void }

// game/bridge.ts
interface LevelController { isLevelStarted(): boolean; startLevel(d: LevelSceneData): void; pauseLevel(): void; resumeLevel(): void }
connectGameToStore(controller, store = useGameStore): () => void   // returns unsubscribe
currentLevelData(store = useGameStore): LevelSceneData | null

// game/EventBus.ts
EventBus.on(event, fn) → off();  EventBus.once(event, fn);  EventBus.emit(event, ...args);  EventBus.off(event, fn)
events: 'preload-progress' [progress: number], 'level-ready' [levelId: number]

// game/scaling.ts
computeCanvasSize(cssW, cssH, dpr): { width, height, pixelRatio }
computeCameraZoom(canvasW, canvasH): number

// game/assets.ts
getAssetManifest(): readonly SvgAsset[]; chooseArtResolution(zoom): 1 | 2; queueAssets(loader, entries, resolution)
ART_RESOLUTION_KEY = 'artResolution'

// game/levels.ts
LEVEL_DEFINITIONS: Record<number, LevelDefinition>; isLevelAvailable(id); getLevelDefinition(id)

// game/letters.ts
LETTERS: readonly LetterSpec[]; requiredDots(spec); FIRST_TEMPLATE_LETTER = 2; letterForLevel(id); TOTAL_LEVELS = 27

// world
new ParallaxBackground(scene, resolution, { groundY, cloudSeaY, reducedMotion, seed? }).update(deltaMs)
new Platform(scene, spec: PlatformSpec, resolution)   → .body (Zone, static), .images, .width, .walkable
platformWidth(middles)
decoratePlatforms(scene, platforms, seed, resolution, reducedMotion): Image[]
new Ambient(scene, resolution, homes: {x,y}[], reducedMotion, seed = 1).update(deltaMs)
fixedView(camera): FixedView; layerLeft(camera, view, factor); wrap(value, size)

// player
stepController(state, input, body): { vx, vy, jumped }; createControllerState(jumpPresses = 0)
new Player(scene, { spawn: {x,y}, killY, resolution })
   .zone .body .puppet .feet .respawning .velocity  .launch(verticalSpeed)  .update(time, delta)
new PlayerPuppet(scene, x, y, outfit, resolution)
   .container .setOutfit(o) .setPhotoFace(bool) .setPosition(x,y) .update(deltaMs, motion) .destroy()
PHOTO_FACE_KEY = 'player-face-photo'

// mechanics
new MysteryBlock(scene, x, y, resolution, getDotTarget: () => {x,y}, onDotDelivered: () => void)
   .zone .isUsed .handleCollision(playerBody) .bonk()
new LetterB(scene, x, groundY, resolution)   .zone .dotPosition .handleCollision(playerBody, launch) .destroy()
LETTER_B_LAUNCH_SPEED = 1400
new FloatingLetterA(scene, x, groundY, lionX, resolution)   .sensor .greet()
new Star(scene, x, y, resolution)   .zone .isCollected .collect()
new GoalGate(scene, x, groundY, resolution)   .sensor .enter()

// scenes/LevelScene (public for tests): player, letterB, mysteryBlock

// utils
playSound(name: SoundName); unlockAudio()
speakArabic(text): boolean; canSpeakArabic(): boolean
loadPhoto(file); detectFace(photo); renderFaceCrop(photo, region, {size?, feather?}); cropFaceFromFile(file)
```

## Appendix C. Recipes

### C.0 Add or change a letter
Edit its row in `src/game/letters.ts` (word, emoji file, dots, place, dotless,
world, colour). Download the emoji if it is new (C.4). `npm test` checks the
table and regenerates and validates its level. Run
`LEVELS=<id> node scripts/e2e/template-level.cjs` to see it.

### C.1 Add a new mechanic (template)
```ts
// src/game/mechanics/Thing.ts
import Phaser from 'phaser';
import { useGameStore } from '@/stores/useGameStore';
import { playSound } from '@/utils/sound';
import { ThingKeys, THING_SIZE } from '../art/action';
import { Depth } from '../world/depths';

/** One-paragraph description: what the child sees and does, and why it is safe and fun. */
export default class Thing {
  readonly zone: Phaser.GameObjects.Zone;
  private readonly image: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, private readonly resolution: number) {
    this.image = scene.add.image(x, y, ThingKeys.thing).setScale(1 / resolution).setDepth(Depth.decorBack + 1);
    this.zone = scene.add.zone(x, y, THING_SIZE.width * 0.8, THING_SIZE.height * 0.8);
    scene.physics.add.existing(this.zone, true); // static
    scene.tweens.add({ targets: this.image, y: y - 10, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Called from LevelScene's overlap/collider callback. */
  handlePlayer(playerBody: Phaser.Physics.Arcade.Body): void {
    playSound('pop');
    void playerBody;
  }
}
```
Then: add its art (10.7) → wire it in `LevelScene` (create the instance and
add `physics.add.overlap/collider(player.zone, thing.zone, …)`) → if it is
placed by data, add fields to `LevelMechanics`/`TemplateMechanics` and the
generator → unit-test the generator change → add a play-test step →
acceptance (18.3).

Moving or dynamic bodies: `scene.physics.add.existing(zone)` (dynamic), then
`body.setAllowGravity(false)` and `setImmovable(true)` for platforms, and
move them with `body.setVelocity` (not by setting the position directly, or
the carried player desyncs).

### C.2 Add a store field
Add it to `PersistedState` or `TransientState` → the initial state →
actions → `partialize` (if persisted) → `merge` sanitisation (if persisted) →
tests in `useGameStore.test.ts` (default, action, persistence, corrupt-save
handling).

### C.3 Add a sound
Add a name to `SoundName` and a recipe to `SOUNDS` in `utils/sound.ts`
(short, soft, ≤ 0.6 s, volume ≤ 0.3).

### C.4 Add a word picture
Download the Fluent Emoji Flat SVG (10.9) into `public/emoji/<name>.svg` and
reference it from `letters.ts`. Template levels load it per level.

### C.5 Add a React screen
Create `components/ui/X.tsx`, icon-only for children, using `MenuButton`/
icons, `playSound('tap')` on taps and `dir="ltr"` for directional rows; add
the screen to `GameScreen` and the `App.tsx` switch; test the flow with
Playwright.

### C.6 Change level-1 layout numbers
Edit `LEVEL_DEFINITIONS[1]` in `levels.ts`, re-check the reachability maths
(14.2), and run `scripts/e2e/full-playthrough.cjs` (adjust its x thresholds
if the platforms moved).

### C.7 Take a quick contact sheet of all art (visual check)
```bash
npx esbuild src/game/art/index.ts --bundle --format=esm --outfile=/tmp/art/art.mjs --alias:@=./src
node -e "
import('/tmp/art/art.mjs').then(({ART}) => {
  const uri = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  require('fs').writeFileSync('/tmp/art/sheet.html', '<body style=\"background:#8ad\">' +
    ART.map(a => '<img title=\"'+a.key+'\" src=\"'+uri(a.svg())+'\" width='+a.width+' height='+a.height+'>').join('') + '</body>');
})"
# screenshot /tmp/art/sheet.html with Playwright (file:// URL)
```

## Appendix D. Troubleshooting (symptom → cause → fix)
| symptom | likely cause | fix |
|---|---|---|
| Loader never disappears; `InvalidCharacterError: atob` | a percent-encoded SVG data URI | use `toDataUri` (base64) |
| A faint horizontal line across the screen at a hill's top | TileSprite vertical wrap bleed | keep `STRIP_BOTTOM_PADDING` transparent rows and a fill below |
| Canvas wrong size after rotating | `scale.resize` used in FIT mode | `scale.setGameSize` |
| The game runs in slow motion for the first seconds | Phaser `panicMax` clamps deltas | `fps.panicMax: 20` (already set) |
| Big empty area below the world on phones | camera bounds not grown upwards | `applyZoom` bounds logic (9.3) |
| Two canvases / double game in dev | effect not cleaning up | `PhaserGame` cleanup must call `destroy()` |
| The block sometimes doesn't react | not using `touching.up` in the collider callback (or Rapier legacy) | Arcade collider + `touching.up` |
| Decoration layout differs with reduced motion | random numbers drawn conditionally | draw them all up front |
| Pause doesn't stop a mechanic | it uses `setTimeout`/`requestAnimationFrame` | use scene tweens or `scene.time` (they pause with the scene) |
| A dot or star counted twice | the callback ran twice before state changed | guard with a flag (`used`, `collected`, `delivered`) set before side effects |
| The photo doesn't show in game | the texture isn't loaded yet, or the URL isn't a data URL | `loadFace` listens to `Textures.Events.ADD`; the store accepts data/blob only |
| Phaser Text shows the fallback font | text created before the web font loaded | `document.fonts.load` before starting the level (20.6) |
| `npm install` fails with "edgesOut" | npm 10 bug with vitest 4 peers | keep vitest ^5 |
| The live site can't be fetched from the sandbox | proxy blocks github.io | check GitHub Actions instead |
| The shell dies with exit 144 | `pkill -f` matched your own command | `pgrep -f "^node .*vite" \| xargs -r kill` |
| Playwright click times out on Play | the element is "not stable" (pulse animation) | `click({ force: true })` |
| Main bundle suddenly grows by ~340 kB gz | Phaser imported from React-side code | keep React importing only engine-free modules |

## Appendix E. Numbers cheat-sheet
```
Design height 720 · min visible width 960 · DPR cap 2 · art res 2 if zoom > 1.15
Gravity 2000 · speed 340 · accel 2600 ground / 1700 air · jump 853 (apex ≈182, range ≈290)
Coyote 0.2 s · buffer 0.16 s · max fall 1300 · respawn 1.2 s · body 46×128 · char height 146
Gap ≤ 160 · step-up ≤ 110–120 · block bottom ≈ surface − 211 · star y = surface − 64
ب launch 1400 (apex ≈ 490) · ب lift 62 · trampoline debounce 250 ms
Camera: lerp 0.1/0.15, offsetY 120, deadzone 60×150, look-ahead −vx·0.45 clamp ±160
Parallax factors: far clouds 0.08 · hills 0.18 / 0.35 / 0.55 · near clouds 0.7 · cloud sea 1
Hill tops: groundY − 560 / −420 / −290 · cloud sea at level.cloudSeaY (1290) · killY = cloudSeaY + 150
Platform tile 128×200 (caps 96) · surface y 30 in the tile · solid depth 108 · body inset 10
Stars per level 3 · awarded = clamp(round(collected/total·3), 1, 3)
Level 1: width 5120 · spawn (180,1100) · platforms x 0/992/2304/3328/4064 · y 1100/1100/760/960/960
```

## Appendix F. Definition of done for the whole game (v1.0)
- 27 levels (1 classic + 26 template) covering all 28 letters, each
  completable, each teaching its letter with a word friend and speech.
- 7 worlds with distinct palettes and their action mechanics (21.5), and a
  friendly boss at the end of each world.
- The world map with progress, stars and locks; the picture quiz after each
  level.
- Optional recorded voice with TTS fallback.
- Play time measured at 2.5–3 h for a first full playthrough including
  quizzes (count ~3–4 min per level + ~1.5 min per quiz + bosses).
- All tests green, all play-tests passing, deployed, docs updated.

## Appendix G. Writing a new browser play-test (helpers to copy)
Every script follows the same skeleton (see `scripts/e2e/full-playthrough.cjs`):
```js
const { chromium } = require('./playwright.cjs');
const { OUT, URL: BASE } = require('./config.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (label, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); if (!ok) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // Optional: prepare the state before playing, e.g. unlock a level:
  // await page.evaluate(() => window.__game.game.setState({ unlockedLevels: [1, 2, 3] }));
  await page.getByRole('button', { name: 'ابدأ اللعب' }).click({ force: true });
  await page.waitForFunction(() => !document.querySelector('[aria-label="جارٍ التحميل"]')
    && window.__phaser?.scene.getScene('Level')?.player, null, { timeout: 60000 });
  // Read the state:
  const st = () => page.evaluate(() => {
    const sc = window.__phaser.scene.getScene('Level'); const p = sc.player; const s = window.__game.game.getState();
    return { x: Math.round(p.feet.x), y: Math.round(p.feet.y), g: p.body.blocked.down || p.body.touching.down,
             resp: p.respawning, screen: s.screen, stars: s.session?.starsCollected, dots: s.session?.letterDotsCollected };
  });
  // Drive input through the store (exactly what the keyboard and touch controls do):
  const right = (on) => page.evaluate((v) => window.__game.input.getState().setRight(v), on);
  const jump = async () => { await page.evaluate(() => window.__game.input.getState().pressJump()); await sleep(120);
                             await page.evaluate(() => window.__game.input.getState().releaseJump()); };
  // Wait for a condition with a generous timeout (headless runs at ~8–10 fps):
  const until = async (pred, label, timeout = 40000) => { const t0 = Date.now();
    while (Date.now() - t0 < timeout) { const s = await st(); if (pred(s)) return s; await sleep(25); }
    throw new Error(`timeout: ${label} ${JSON.stringify(await st())}`); };
  // … steps, check(...) calls, page.screenshot({ path: `${OUT}/name.png` }) …
  check('no console errors', errors.length === 0, JSON.stringify(errors));
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
```
Tips:
- Trigger mechanics directly when you only need the outcome:
  `scene.mysteryBlock.bonk()`, `useGameStore.getState().completeLevel()`.
- Jump a little **before** the edge (the scripts use about 110 px early),
  because polling adds latency.
- For touch, use `browser.newContext({...devices['iPhone 13 landscape']})` and CDP
  `Input.dispatchTouchEvent` for true multi-touch.
- Screenshots cost tokens to look at. Take few, and look only at the ones
  that matter.

## Appendix H. Unit test inventory (generated from `vitest --reporter=verbose`)
Every test that existed when this was last regenerated (after Step 1). Keep them all passing; add new ones for new pure logic.

```
src/stores/useGameStore.test.ts > initial state > starts on the title screen with only level 1 unlocked
src/stores/useGameStore.test.ts > UI state > opens and closes the photo modal
src/stores/useGameStore.test.ts > UI state > only pauses while playing and only resumes while paused
src/stores/useGameStore.test.ts > UI state > toggles mute
src/stores/useGameStore.test.ts > outfits > sets and cycles outfits
src/stores/useGameStore.test.ts > face texture > accepts data:image URLs and rejects anything else
src/stores/useGameStore.test.ts > face texture > revokes a previous blob URL when replaced or cleared
src/stores/useGameStore.test.ts > face texture > persists data URLs but never blob URLs
src/stores/useGameStore.test.ts > level flow > refuses to start locked or invalid levels
src/stores/useGameStore.test.ts > level flow > caps collectibles at the registered goals
src/stores/useGameStore.test.ts > level flow > ignores collectibles while paused
src/stores/useGameStore.test.ts > level flow > completing a level unlocks the next and keeps the best star score
src/stores/useGameStore.test.ts > level flow > always awards at least one star for finishing
src/stores/useGameStore.test.ts > level flow > does not unlock beyond the last level
src/stores/useGameStore.test.ts > level flow > exitLevel clears the session
src/stores/useGameStore.test.ts > level flow > records discovered letters once
src/stores/useGameStore.test.ts > persistence > saves progress but not the transient UI state
src/stores/useGameStore.test.ts > persistence > restores saved progress on reload
src/stores/useGameStore.test.ts > persistence > sanitises corrupted or tampered save data
src/stores/useGameStore.test.ts > persistence > survives unparseable storage
src/stores/useGameStore.test.ts > persistence > drops the face photo and still saves progress when the quota is exceeded
src/stores/useGameStore.test.ts > persistence > resetProgress wipes everything back to defaults
src/stores/useGameStore.test.ts > run ids > gives every level start a new runId, including replays after exiting
src/game/levelGenerator.test.ts > letter table > has all 28 letters in alphabet order
src/game/levelGenerator.test.ts > letter table > has a picture file for every letter
src/game/levelGenerator.test.ts > letter table > uses valid worlds and dot counts
src/game/levelGenerator.test.ts > letter table > keeps the store level count in sync
src/game/levelGenerator.test.ts > level catalog > serves the classic level 1 and generated levels 2..27
src/game/levelGenerator.test.ts > generated level for ت > is deterministic
src/game/levelGenerator.test.ts > generated level for ت > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ت > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ت > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ث > is deterministic
src/game/levelGenerator.test.ts > generated level for ث > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ث > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ث > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ج > is deterministic
src/game/levelGenerator.test.ts > generated level for ج > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ج > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ج > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ح > is deterministic
src/game/levelGenerator.test.ts > generated level for ح > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ح > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ح > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for خ > is deterministic
src/game/levelGenerator.test.ts > generated level for خ > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for خ > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for خ > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for د > is deterministic
src/game/levelGenerator.test.ts > generated level for د > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for د > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for د > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ذ > is deterministic
src/game/levelGenerator.test.ts > generated level for ذ > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ذ > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ذ > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ر > is deterministic
src/game/levelGenerator.test.ts > generated level for ر > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ر > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ر > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ز > is deterministic
src/game/levelGenerator.test.ts > generated level for ز > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ز > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ز > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for س > is deterministic
src/game/levelGenerator.test.ts > generated level for س > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for س > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for س > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ش > is deterministic
src/game/levelGenerator.test.ts > generated level for ش > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ش > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ش > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ص > is deterministic
src/game/levelGenerator.test.ts > generated level for ص > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ص > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ص > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ض > is deterministic
src/game/levelGenerator.test.ts > generated level for ض > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ض > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ض > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ط > is deterministic
src/game/levelGenerator.test.ts > generated level for ط > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ط > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ط > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ظ > is deterministic
src/game/levelGenerator.test.ts > generated level for ظ > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ظ > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ظ > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ع > is deterministic
src/game/levelGenerator.test.ts > generated level for ع > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ع > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ع > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for غ > is deterministic
src/game/levelGenerator.test.ts > generated level for غ > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for غ > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for غ > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ف > is deterministic
src/game/levelGenerator.test.ts > generated level for ف > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ف > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ف > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ق > is deterministic
src/game/levelGenerator.test.ts > generated level for ق > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ق > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ق > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ك > is deterministic
src/game/levelGenerator.test.ts > generated level for ك > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ك > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ك > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ل > is deterministic
src/game/levelGenerator.test.ts > generated level for ل > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ل > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ل > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for م > is deterministic
src/game/levelGenerator.test.ts > generated level for م > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for م > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for م > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ن > is deterministic
src/game/levelGenerator.test.ts > generated level for ن > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ن > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ن > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ه > is deterministic
src/game/levelGenerator.test.ts > generated level for ه > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ه > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ه > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for و > is deterministic
src/game/levelGenerator.test.ts > generated level for و > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for و > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for و > places the letter, friend, stars and goal on their platforms
src/game/levelGenerator.test.ts > generated level for ي > is deterministic
src/game/levelGenerator.test.ts > generated level for ي > keeps every gap and step toddler-safe
src/game/levelGenerator.test.ts > generated level for ي > has one reachable block per needed dot
src/game/levelGenerator.test.ts > generated level for ي > places the letter, friend, stars and goal on their platforms
src/game/art/art.test.ts > art manifest > has unique keys
src/game/art/art.test.ts > art manifest > sky is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > sun-rays is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > sun-face is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > sun-face-blink is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > cloud-small is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > cloud-medium is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > cloud-large is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > cloud-happy is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > cloud-sea is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > hills-far is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > hills-mid is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > hills-near is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > platform-left is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > platform-mid-a is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > platform-mid-b is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > platform-right is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > flower-pink is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > flower-purple is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > flower-blue is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > flower-white is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > lollipop-pink is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > lollipop-blue is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > gumdrop-purple is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > gumdrop-orange is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > grass-tuft is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > mushroom is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > sparkle is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > butterfly-pink is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > butterfly-blue is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > char-head is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > char-face is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > char-face-blink is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > char-bubble is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > onesie-hood is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > onesie-body is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > onesie-arm is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > onesie-leg is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > explorer-hat is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > explorer-hair is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > explorer-body is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > explorer-backpack is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > explorer-arm is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > explorer-leg is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > mystery-block is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > mystery-block-used is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > letter-baa is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > letter-dot is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > letter-dot-ghost is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > glow-dot is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > letter-alef is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > lion is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > lion-roar is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > star is valid SVG at its declared size
src/game/art/art.test.ts > art manifest > rainbow is valid SVG at its declared size
src/game/art/art.test.ts > seamless tiles > hill ridge "farBack" matches height and slope at both edges
src/game/art/art.test.ts > seamless tiles > hill ridge "farFront" matches height and slope at both edges
src/game/art/art.test.ts > seamless tiles > hill ridge "mid" matches height and slope at both edges
src/game/art/art.test.ts > seamless tiles > hill ridge "near" matches height and slope at both edges
src/game/art/art.test.ts > seamless tiles > hill ridges stay inside the tile
src/game/art/art.test.ts > seamless tiles > cloud sea edge repeats
src/game/art/art.test.ts > seamless tiles > platform features repeat across a middle tile, and the frosting mirrors cleanly
src/game/art/art.test.ts > seamless tiles > periodic curves start and end on the sampled edge points
src/game/art/art.test.ts > clouds > cloudSmall fits every puff (and its shade) inside the texture
src/game/art/art.test.ts > clouds > cloudMedium fits every puff (and its shade) inside the texture
src/game/art/art.test.ts > clouds > cloudLarge fits every puff (and its shade) inside the texture
src/game/art/art.test.ts > clouds > cloudHappy fits every puff (and its shade) inside the texture
src/game/art/art.test.ts > clouds > fitCloud normalises any puff layout
src/game/art/art.test.ts > encoding and resolution > toDataUri produces base64 that decodes back to the original, including non-ASCII
src/game/art/art.test.ts > encoding and resolution > uses 2x art only when the camera zooms in noticeably
src/utils/faceCropper.test.ts > isSkinPixel > accepts very light skin
src/utils/faceCropper.test.ts > isSkinPixel > accepts light skin
src/utils/faceCropper.test.ts > isSkinPixel > accepts medium skin
src/utils/faceCropper.test.ts > isSkinPixel > accepts tan skin
src/utils/faceCropper.test.ts > isSkinPixel > accepts brown skin
src/utils/faceCropper.test.ts > isSkinPixel > accepts dark skin
src/utils/faceCropper.test.ts > isSkinPixel > rejects white wall
src/utils/faceCropper.test.ts > isSkinPixel > rejects black
src/utils/faceCropper.test.ts > isSkinPixel > rejects sky blue
src/utils/faceCropper.test.ts > isSkinPixel > rejects grass green
src/utils/faceCropper.test.ts > isSkinPixel > rejects grey
src/utils/faceCropper.test.ts > isSkinPixel > rejects purple
src/utils/faceCropper.test.ts > findFaceBlob > returns null for an empty mask
src/utils/faceCropper.test.ts > findFaceBlob > ignores specks smaller than the minimum share
src/utils/faceCropper.test.ts > findFaceBlob > prefers the large central blob over a small corner blob
src/utils/faceCropper.test.ts > findFaceBlob > rejects thin, sparse streaks such as furniture edges
src/utils/faceCropper.test.ts > findFaceBlob > trims a face blob that runs down into the neck and body
src/utils/faceCropper.test.ts > detectFaceBoxFromPixels > finds a light-skinned face on a blue background
src/utils/faceCropper.test.ts > detectFaceBoxFromPixels > finds a dark-skinned face on a blue background
src/utils/faceCropper.test.ts > detectFaceBoxFromPixels > returns null when the photo has no skin
src/utils/faceCropper.test.ts > detectFaceBoxFromPixels > ignores transparent pixels
src/utils/faceCropper.test.ts > regions > pads the face box into a taller-than-wide oval
src/utils/faceCropper.test.ts > regions > keeps the oval ratio sane even for odd boxes
src/utils/faceCropper.test.ts > regions > default region is centred in the upper part of the frame
src/utils/faceCropper.test.ts > regions > clamps size and position to the image
src/utils/faceCropper.test.ts > regions > scales about the centre
src/utils/faceCropper.test.ts > loadPhoto validation > rejects non-image files
src/utils/faceCropper.test.ts > loadPhoto validation > rejects files over the size limit
src/game/bridge.test.ts > connectGameToStore > pauses and resumes the level with the screen state
src/game/bridge.test.ts > connectGameToStore > restarts the level scene when a new run begins
src/game/bridge.test.ts > connectGameToStore > leaves starting to the preloader while the level scene has not started yet
src/game/bridge.test.ts > connectGameToStore > ignores unrelated store changes and stops listening after disconnect
src/game/bridge.test.ts > connectGameToStore > currentLevelData reflects the active session
src/game/bridge.test.ts > level catalog > defines a playable level 1 with valid goals and size
src/game/scaling.test.ts > computeCanvasSize > scales CSS pixels by the device pixel ratio
src/game/scaling.test.ts > computeCanvasSize > caps very high pixel ratios
src/game/scaling.test.ts > computeCanvasSize > treats missing or sub-1 ratios as 1 and never returns zero size
src/game/scaling.test.ts > computeCameraZoom > fits the design height on landscape screens
src/game/scaling.test.ts > computeCameraZoom > zooms out on portrait phones to keep enough width visible
src/game/scaling.test.ts > computeCameraZoom > is safe for zero-sized canvases
src/game/player/controller.test.ts > stepController > accelerates smoothly up to the move speed
src/game/player/controller.test.ts > stepController > brakes to a stop without input
src/game/player/controller.test.ts > stepController > jumps on a fresh press while grounded, and only once per press
src/game/player/controller.test.ts > stepController > allows a jump shortly after walking off a ledge (coyote time)
src/game/player/controller.test.ts > stepController > refuses a mid-air jump after coyote time runs out
src/game/player/controller.test.ts > stepController > remembers a press made just before landing (jump buffer)
src/game/player/controller.test.ts > stepController > forgets a press made long before landing
src/game/player/controller.test.ts > stepController > caps the fall speed
src/game/player/controller.test.ts > stepController > ignores presses that happened before the controller was created
src/game/EventBus.test.ts > TypedEventBus > delivers arguments to every listener
src/game/EventBus.test.ts > TypedEventBus > unsubscribes via the returned function and via off()
src/game/EventBus.test.ts > TypedEventBus > once() fires a single time
src/game/EventBus.test.ts > TypedEventBus > keeps notifying other listeners when one throws
src/game/EventBus.test.ts > TypedEventBus > lets a listener unsubscribe itself during emit
src/game/world/view.test.ts > fixedView > is the whole canvas at zoom 1
src/game/world/view.test.ts > fixedView > grows around the centre when zoomed out and shrinks when zoomed in
src/game/world/view.test.ts > layerLeft > scrolls slower for distant layers
src/game/world/view.test.ts > wrap > wraps positive and negative values into range
```

## Appendix I. Source tree with line counts (generated)
```
81 .github/workflows/deploy.yml
14 index.html
37 package.json
23 scripts/e2e/README.md
8 scripts/e2e/config.cjs
63 scripts/e2e/engine-lifecycle.cjs
60 scripts/e2e/full-playthrough.cjs
60 scripts/e2e/keyboard-and-touch.cjs
47 scripts/e2e/motion-and-pause.cjs
47 scripts/e2e/photo-and-respawn.cjs
6 scripts/e2e/playwright.cjs
28 scripts/e2e/replay.cjs
87 src/App.tsx
80 src/components/ui/AvatarPreview.tsx
55 src/components/ui/ErrorBoundary.tsx
78 src/components/ui/HUD.tsx
67 src/components/ui/LevelCompleteScreen.tsx
10 src/components/ui/LoadingScreen.tsx
80 src/components/ui/ParentGateButton.tsx
43 src/components/ui/PauseMenu.tsx
439 src/components/ui/PhotoUploadModal.tsx
153 src/components/ui/TitleScreen.tsx
111 src/components/ui/TouchControls.tsx
240 src/components/ui/icons.tsx
62 src/game/EventBus.test.ts
66 src/game/EventBus.ts
33 src/game/PhaserGame.tsx
96 src/game/art/art.test.ts
347 src/game/art/character.ts
102 src/game/art/clouds.ts
142 src/game/art/flora.ts
135 src/game/art/hills.ts
114 src/game/art/index.ts
284 src/game/art/mechanics.ts
54 src/game/art/palette.ts
148 src/game/art/platforms.ts
16 src/game/art/sky.ts
67 src/game/art/sun.ts
95 src/game/art/svg.ts
52 src/game/assets.ts
93 src/game/bridge.test.ts
58 src/game/bridge.ts
43 src/game/constants.ts
91 src/game/createGame.ts
86 src/game/letters.ts
123 src/game/levels.ts
87 src/game/mechanics/FloatingLetterA.ts
101 src/game/mechanics/GoalGate.ts
123 src/game/mechanics/LetterB.ts
112 src/game/mechanics/MysteryBlock.ts
65 src/game/mechanics/Star.ts
214 src/game/player/Player.ts
171 src/game/player/PlayerPuppet.ts
73 src/game/player/controller.test.ts
72 src/game/player/controller.ts
35 src/game/scaling.test.ts
34 src/game/scaling.ts
18 src/game/scenes/BootScene.ts
209 src/game/scenes/LevelScene.ts
48 src/game/scenes/PreloadScene.ts
107 src/game/world/Ambient.ts
118 src/game/world/Decorations.ts
206 src/game/world/ParallaxBackground.ts
50 src/game/world/Platform.ts
17 src/game/world/depths.ts
35 src/game/world/view.test.ts
30 src/game/world/view.ts
50 src/hooks/useKeyboardControls.ts
71 src/index.css
32 src/main.tsx
322 src/stores/useGameStore.test.ts
429 src/stores/useGameStore.ts
36 src/stores/useInputStore.ts
191 src/utils/faceCropper.test.ts
423 src/utils/faceCropper.ts
13 src/utils/random.ts
126 src/utils/sound.ts
52 src/utils/speech.ts
7994 total
32 tsconfig.app.json
7 tsconfig.json
22 tsconfig.node.json
39 vite.config.ts
```

## Appendix J. Step 1 task breakdown (✅ completed 2026-10-17; kept as a model for later steps)
1. **Data and generator** (pure, no Phaser):
   a. Finish `letters.ts` (done), add `letters.test.ts` (28 entries, order
      equals `ARABIC_LETTERS`, emoji files exist, `requiredDots`).
   b. `levelGenerator.ts` + `levelGenerator.test.ts` (20.4).
   c. Extend `levels.ts` (20.3): `kind`, `world`, `template`, `letter`; the cached
      generated definitions for ids 2..27; `isLevelAvailable`.
   d. Store: `LEVEL_COUNT = 27` (+ a test against `TOTAL_LEVELS`).
   → `npm test` green → commit "Add letter table and template level generator".
2. **Font:** import Fontsource CSS in `main.tsx`, remove the Google Fonts
   links, add the `document.fonts.load` gate in PreloadScene (20.6) → commit.
3. **Phaser mechanics:** `DotCompanions`, `LetterDisplay`, `WordFriend`
   (20.5), per-level emoji loading in `LevelScene.preload`, and the
   classic/template branch in `LevelScene.create` (20.7) → typecheck → commit.
4. **Title Play** → highest unlocked level (20.8). Add `CREDITS.md` (20.9) → commit.
5. **Verification:** add `scripts/e2e/template-level.cjs` (20.10) and run it,
   plus `full-playthrough.cjs` (Level 1 regression). Take screenshots of ت
   (before and after) and of a 0-dot letter (ح) → fix issues → commit.
6. Tick Step 1 in `PLAN.md`, add a log line, update this file if anything
   changed → commit and push → check the Actions run → report to the owner.
