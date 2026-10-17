# Browser play-tests

Automated Playwright scripts that drive the real game in Chromium. They use the
development-only hooks `window.__game` (stores) and `window.__phaser` (game),
so run them against the **dev server**, not a production build.

```bash
npm run dev                                  # in one terminal
node scripts/e2e/full-playthrough.cjs        # in another
```

| Script | Checks |
|---|---|
| `full-playthrough.cjs` | Plays Level 1 start→finish: star, block bonk → dot → ب, trampoline, أ + lion, rainbow |
| `photo-and-respawn.cjs` | Photo face on the in-game head; falling floats home with no penalty |
| `keyboard-and-touch.cjs` | Arrow/Space/Esc on desktop; on-screen buttons + multi-touch on a phone |
| `replay.cjs` | Level complete → "play again" rebuilds the level from scratch |
| `engine-lifecycle.cjs` | One canvas (StrictMode), DPR sizing, pause/resume/replay, rotation, teardown |
| `motion-and-pause.cjs` | Idle motion runs, pause freezes it, reduced-motion is respected |

Screenshots land in `scripts/e2e/out/` (override with `E2E_OUT`). Use
`GAME_URL` to point at another server. Headless Chromium uses software
rendering (~8–10 fps); timings in the scripts allow for that.
