// Template levels: for a sample of letters, bonk every block, carry the dots to the
// letter, check the letter completes and is discovered, then finish at the rainbow.
const { chromium } = require('./playwright.cjs');
const { OUT, URL: BASE } = require('./config.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (label, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); if (!ok) process.exitCode = 1; };
const SAMPLE = (process.env.LEVELS || '2,4,5,27').split(',').map(Number); // ت ج ح ي

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const id of SAMPLE) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()));
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__game);
    await page.evaluate((n) => window.__game.game.setState({ unlockedLevels: Array.from({ length: n }, (_, i) => i + 1) }), id);
    await page.getByRole('button', { name: 'ابدأ اللعب' }).click({ force: true });
    await page.waitForFunction(() => !document.querySelector('[aria-label="جارٍ التحميل"]') && window.__phaser?.scene.getScene('Level')?.player, null, { timeout: 60000 });
    await sleep(800);
    const info = await page.evaluate(() => {
      const sc = window.__phaser.scene.getScene('Level'); const s = window.__game.game.getState();
      return { level: s.session.levelId, letter: sc.level.letter.letter, blocks: sc.blocks.length, required: s.session.letterDotsRequired, friend: sc.textures.exists(`emoji-${sc.level.letter.emoji}`) };
    });
    check(`level ${id} (${info.letter}): started with ${info.blocks} block(s) = dots required`, info.level === id && info.blocks === info.required && info.required >= 1, JSON.stringify(info));
    check(`level ${id}: word picture loaded`, info.friend);

    // Teleport helper: put the feet at (x, groundY).
    const tp = (x, y) => page.evaluate(([x, y]) => { const p = window.__phaser.scene.getScene('Level').player; p.body.reset(x, y - 64); }, [x, y]);
    const t = await page.evaluate(() => window.__phaser.scene.getScene('Level').level.template);
    await tp(t.letter.x - 260, t.letter.groundY); await sleep(3500);
    await page.screenshot({ path: `${OUT}/tpl-${id}-before.png` });

    // Bonk every block; each dot flies to the child and orbits.
    await tp(180, 1100); await sleep(300);
    await page.evaluate(() => window.__phaser.scene.getScene('Level').blocks.forEach((b) => b.bonk()));
    await page.waitForFunction((n) => window.__phaser.scene.getScene('Level').companions.count === n, info.required, { timeout: 30000 });
    check(`level ${id}: dots are following the child`, true);

    // Walk them to the letter.
    await tp(t.letter.x, t.letter.groundY);
    await page.waitForFunction((L) => window.__game.game.getState().lettersDiscovered.includes(L), info.letter, { timeout: 30000 });
    const s = await page.evaluate(() => window.__game.game.getState().session);
    check(`level ${id}: letter completed and discovered`, s.letterDotsCollected === s.letterDotsRequired, JSON.stringify(s));
    await sleep(1600);
    await page.screenshot({ path: `${OUT}/tpl-${id}-after.png` });

    // Finish at the rainbow.
    await tp(t.goal.x, t.goal.groundY);
    await page.waitForFunction(() => window.__game.game.getState().screen === 'levelComplete', null, { timeout: 30000 });
    check(`level ${id}: rainbow finishes the level, next unlocked`, await page.evaluate((n) => window.__game.game.getState().unlockedLevels.includes(n + 1) || n === 27, id));
    check(`level ${id}: no console errors`, errors.length === 0, JSON.stringify(errors.slice(0, 3)));
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
