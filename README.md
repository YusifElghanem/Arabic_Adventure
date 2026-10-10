# مغامرة الحروف · Arabic Adventure

A cheerful 2D platformer that helps preschoolers (ages 3–6) learn their first
Arabic letters. Letters are written without diacritics, as taught in
kindergarten. The child plays as themselves: a parent can put the child's
photo on the character's face. The photo never leaves the device.

**Play:** https://yusifelghanem.github.io/Arabic_Adventure/

## Level 1: أ and ب

1. Bonk the glowing **Mystery Block** from below. Its dot flies to the
   letter **ب** and completes it.
2. Bounce on the **ب** bowl, a trampoline, up to the high island.
3. Meet the giant smiling **أ** and its friend the **lion (أسد)**.
4. Collect the stars and walk through the **rainbow** to finish.

Falling never costs anything: a bubble floats the child back to the start.

**Controls:** arrow keys / WASD and Space on a keyboard, big on-screen buttons
on tablets and phones. Esc or P pauses.

## Tech

- **Phaser 3** (Arcade Physics) for the game, lazy-loaded when a level starts
- **React 19 + Tailwind 4** for the screens, HUD and parent photo upload
- **Zustand** for state shared by React and Phaser (saved to localStorage)
- **Vite + TypeScript**, **Vitest** for unit tests
- All art is vector (SVG) generated in code (`src/game/art`), rasterised at
  1× or 2× depending on the screen. Any piece can be replaced by an
  illustrator's file through the asset manifest (`src/game/assets.ts`).

```
src/
  game/          Phaser: scenes, player, mechanics, world, art, level data
  components/ui/ React screens: title, HUD, menus, photo upload, touch controls
  stores/        Zustand stores (game progress, input)
  utils/         face cropping, sound synthesis, Arabic speech
```

## Develop

Requires Node.js 22.12+.

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN, for tablets)
npm test           # unit tests
npm run build      # type-check + production build into dist/
```

Every push runs type-checking and tests in GitHub Actions, then deploys to
GitHub Pages (Settings → Pages → Source: GitHub Actions).
