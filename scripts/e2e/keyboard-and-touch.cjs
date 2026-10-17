const { chromium, devices } = require('./playwright.cjs');
const { OUT, URL: BASE } = require('./config.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (label, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); if (!ok) process.exitCode = 1; };
const ready = (page) => page.waitForFunction(() => !document.querySelector('[aria-label="جارٍ التحميل"]') && window.__phaser?.scene.getScene('Level')?.player, null, { timeout: 60000 });
const pos = (page) => page.evaluate(() => { const p = window.__phaser.scene.getScene('Level').player; return { x: Math.round(p.feet.x), y: Math.round(p.feet.y) }; });
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

  // Keyboard on desktop.
  let page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'ابدأ اللعب' }).click({ force: true });
  await ready(page); await sleep(500);
  check('no touch buttons on a desktop', (await page.getByRole('button', { name: 'اقفز' }).count()) === 0);
  const a = await pos(page);
  await page.keyboard.down('ArrowRight'); await sleep(300);
  check('ArrowRight held → input store right=true', await page.evaluate(() => window.__game.input.getState().right));
  console.log('fps', await page.evaluate(() => window.__phaser.loop.actualFps.toFixed(1)));
  await sleep(2200); await page.keyboard.up('ArrowRight'); await sleep(400);
  check('ArrowRight released → right=false', !(await page.evaluate(() => window.__game.input.getState().right)));
  const b = await pos(page);
  check('ArrowRight walks right', b.x > a.x + 60, `${a.x} → ${b.x}`);
  const presses = await page.evaluate(() => window.__game.input.getState().jumpPresses);
  await page.keyboard.press('Space');
  check('Space registers a jump press', (await page.evaluate(() => window.__game.input.getState().jumpPresses)) === presses + 1);
  let minY = b.y; for (let i = 0; i < 40; i++) { minY = Math.min(minY, (await pos(page)).y); await sleep(30); }
  check('Space jumps', minY < b.y - 60, `lowest y ${minY}`);
  await page.keyboard.press('Escape'); await sleep(300);
  check('Escape pauses', (await page.evaluate(() => window.__game.game.getState().screen)) === 'paused');
  await page.keyboard.press('Escape'); await sleep(300);
  check('Escape resumes', (await page.evaluate(() => window.__game.game.getState().screen)) === 'playing');
  await page.close();

  // Touch on a phone (landscape).
  const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] });
  page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'ابدأ اللعب' }).tap({ force: true });
  await ready(page); await sleep(600);
  check('touch buttons appear on a phone', (await page.getByRole('button', { name: 'اقفز' }).count()) === 1);
  await page.screenshot({ path: OUT + '/i-phone.png' });
  const c = await pos(page);
  const box = await page.getByRole('button', { name: 'يمين' }).boundingBox();
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const rightPt = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
  await touch('touchStart', [rightPt]); await sleep(900);
  // Second finger taps jump while still holding right (multi-touch).
  const jb = await page.getByRole('button', { name: 'اقفز' }).boundingBox();
  const jumpPt = { x: jb.x + jb.width / 2, y: jb.y + jb.height / 2, id: 2 };
  await touch('touchStart', [rightPt, jumpPt]); await sleep(120); await touch('touchEnd', [rightPt]);
  let minY2 = 99999; for (let i = 0; i < 15; i++) { minY2 = Math.min(minY2, (await pos(page)).y); await sleep(30); }
  await touch('touchEnd', []); await sleep(300);
  const d = await pos(page);
  check('holding the right button walks', d.x > c.x + 60, `${c.x} → ${d.x}`);
  check('a second finger can jump while walking', minY2 < 1040, `lowest y ${minY2}`);
  check('releasing stops the walk', !(await page.evaluate(() => window.__game.input.getState().right)));
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
