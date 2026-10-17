const { chromium } = require('./playwright.cjs');
const { OUT, URL: BASE } = require('./config.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'ابدأ اللعب' }).click({ force: true });
  await page.waitForFunction(() => !document.querySelector('[aria-label="جارٍ التحميل"]') && window.__phaser?.scene.getScene('Level')?.player, null, { timeout: 60000 });
  await sleep(800);
  const st = () => page.evaluate(() => {
    const sc = window.__phaser.scene.getScene('Level'); const p = sc.player; const s = window.__game.game.getState();
    return { x: Math.round(p.feet.x), y: Math.round(p.feet.y), g: p.body.blocked.down || p.body.touching.down, resp: p.respawning, screen: s.screen, stars: s.session?.starsCollected, dots: s.session?.letterDotsCollected, letters: s.lettersDiscovered.join('') };
  });
  const inp = (code) => page.evaluate(code);
  const right = (on) => inp(`window.__game.input.getState().setRight(${on})`);
  const jump = async () => { await inp('window.__game.input.getState().pressJump()'); await sleep(120); await inp('window.__game.input.getState().releaseJump()'); };
  const until = async (pred, label, timeout = 40000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { const s = await st(); if (s.resp) throw new Error(`fell (${label}): ${JSON.stringify(s)}`); if (pred(s)) return s; await sleep(25); }
    throw new Error(`timeout waiting for ${label}: ${JSON.stringify(await st())}`);
  };
  const log = async (l) => console.log(l.padEnd(24), JSON.stringify(await st()));
  await log('start');
  await page.screenshot({ path: `${OUT}/g-01-start.png` });

  await right(true);
  await until((s) => s.x >= 720, 'gap 1 edge'); await jump();
  await until((s) => s.x >= 1060 && s.g, 'landed P2');
  await log('landed P2 (star 1?)');
  await until((s) => s.x >= 1230, 'under block');
  await right(false); await until((s) => s.g, 'settle'); await sleep(400); await log('under block');
  await jump(); await sleep(250);
  await page.screenshot({ path: `${OUT}/g-02-bonk.png` });
  await until((s) => s.dots === 1, 'dot delivered');
  await sleep(500); await log('dot delivered');
  await page.screenshot({ path: `${OUT}/g-03-dot.png` });

  await right(true);
  await until((s) => s.x >= 1700, 'before B'); await jump();
  await until((s) => s.y < 700, 'launched by B'); await log('launched');
  await page.screenshot({ path: `${OUT}/g-04-launch.png` });
  await until((s) => s.g && s.y <= 762 && s.x > 2300, 'landed high island'); await log('high island');
  await until((s) => s.letters.includes('أ'), 'met alef'); await sleep(400); await log('met alef');
  await page.screenshot({ path: `${OUT}/g-05-alef.png` });
  await until((s) => s.x >= 3040, 'P3 edge'); await jump();
  await until((s) => s.g && s.x > 3330, 'landed P4'); await log('P4');
  await until((s) => s.x >= 3780, 'P4 edge'); await jump();
  await until((s) => s.g && s.x > 4070, 'landed P5'); await log('P5');
  await page.screenshot({ path: `${OUT}/g-06-goal.png` });
  await until((s) => s.screen === 'levelComplete', 'level complete'); await right(false);
  await log('complete');
  await sleep(2500);
  await page.screenshot({ path: `${OUT}/g-07-complete.png` });
  console.log('ERRORS', JSON.stringify(errors));
  await browser.close();
})().catch(async (e) => { console.error('FAILED', e.message); process.exit(1); });
