const { chromium } = require('./playwright.cjs');
const { OUT, URL: BASE } = require('./config.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (label, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); if (!ok) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__game);
  // A stand-in "photo": a drawn oval face crop, like faceCropper produces.
  await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#c98b5e'; g.beginPath(); g.ellipse(128, 128, 100, 124, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a1a10'; g.beginPath(); g.ellipse(128, 30, 96, 40, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#fff'; for (const x of [90, 166]) { g.beginPath(); g.arc(x, 120, 16, 0, 7); g.fill(); }
    g.fillStyle = '#1b5e20'; for (const x of [90, 166]) { g.beginPath(); g.arc(x, 122, 8, 0, 7); g.fill(); }
    g.strokeStyle = '#8b1a1a'; g.lineWidth = 8; g.beginPath(); g.arc(128, 160, 34, 0.2, Math.PI - 0.2); g.stroke();
    const s = window.__game.game.getState(); s.setFaceTextureUrl(c.toDataURL('image/png')); s.setOutfit('explorer');
  });
  await sleep(500);
  await page.screenshot({ path: OUT + '/f-title.png' });
  await page.getByRole('button', { name: 'ابدأ اللعب' }).click({ force: true });
  await page.waitForFunction(() => !document.querySelector('[aria-label="جارٍ التحميل"]') && window.__phaser?.scene.getScene('Level')?.player, null, { timeout: 60000 });
  await sleep(1500);
  const face = await page.evaluate(() => window.__phaser.scene.getScene('Level').player.puppet.container.list.find((o) => o.texture?.key === 'player-face-photo') !== undefined);
  check('photo face is on the in-game head', face);
  await page.screenshot({ path: OUT + '/f-game.png' });

  // Collect star 1, then walk straight into the first gap.
  const st = () => page.evaluate(() => { const p = window.__phaser.scene.getScene('Level').player; const s = window.__game.game.getState(); return { x: Math.round(p.feet.x), y: Math.round(p.feet.y), resp: p.respawning, stars: s.session.starsCollected }; });
  await page.evaluate(() => window.__game.input.getState().setRight(true));
  let s; const t0 = Date.now();
  while (!(s = await st()).resp && Date.now() - t0 < 30000) await sleep(30);
  check('falling into the gap starts the bubble respawn', s.resp, JSON.stringify(s));
  await sleep(300);
  await page.screenshot({ path: OUT + '/f-bubble.png' });
  const held = await page.evaluate(() => window.__game.input.getState().right);
  check('input is released during the respawn', held === false);
  while ((s = await st()).resp && Date.now() - t0 < 60000) await sleep(50);
  await sleep(600);
  s = await st();
  check('floats back to the start', Math.abs(s.x - 180) < 30 && s.y === 1100, JSON.stringify(s));
  check('no penalty: the collected star is kept', s.stars === 1);
  check('no console errors', errors.length === 0, JSON.stringify(errors));
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
