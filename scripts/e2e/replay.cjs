const { chromium } = require('./playwright.cjs');
const { OUT, URL: BASE } = require('./config.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (label, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); if (!ok) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'ابدأ اللعب' }).click({ force: true });
  await page.waitForFunction(() => !document.querySelector('[aria-label="جارٍ التحميل"]') && window.__phaser?.scene.getScene('Level')?.player, null, { timeout: 60000 });
  await sleep(600);
  // Fast-forward: bonk the block and finish the level through the real game objects.
  await page.evaluate(() => window.__phaser.scene.getScene('Level').mysteryBlock.bonk());
  await page.waitForFunction(() => window.__game.game.getState().session.letterDotsCollected === 1, null, { timeout: 20000 });
  await page.evaluate(() => window.__game.game.getState().completeLevel());
  await page.getByRole('button', { name: 'العب مرة أخرى' }).waitFor({ timeout: 5000 });
  check('level complete screen shows', true);
  check('progress saved: level 1 completed', await page.evaluate(() => window.__game.game.getState().levelRecords[1]?.completed === true));
  await sleep(1500);
  await page.getByRole('button', { name: 'العب مرة أخرى' }).click({ force: true });
  await sleep(1500);
  const after = await page.evaluate(() => { const sc = window.__phaser.scene.getScene('Level'); const s = window.__game.game.getState(); return { screen: s.screen, dots: s.session.letterDotsCollected, stars: s.session.starsCollected, blockUsed: sc.mysteryBlock.isUsed, x: Math.round(sc.player.feet.x), canvases: document.querySelectorAll('canvas').length, status: sc.sys.settings.status }; });
  check('play again rebuilds the level from scratch', after.screen === 'playing' && after.dots === 0 && after.stars === 0 && !after.blockUsed && after.x === 180 && after.status === 5, JSON.stringify(after));
  check('still exactly one canvas', after.canvases === 1);
  check('no console errors', errors.length === 0, JSON.stringify(errors));
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
