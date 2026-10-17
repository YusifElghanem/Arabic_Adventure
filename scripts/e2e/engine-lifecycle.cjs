const { chromium } = require('./playwright.cjs');
const { OUT, URL: BASE } = require('./config.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (label, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); if (!ok) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const vp of [{ name: 'desktop', width: 1280, height: 720, dpr: 1 }, { name: 'phone-portrait', width: 390, height: 844, dpr: 3 }]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await sleep(800);
    await page.screenshot({ path: `${OUT}/p1-${vp.name}-title.png` });
    await page.getByRole('button', { name: 'ابدأ اللعب' }).click({ force: true });
    await page.waitForFunction(() => !document.querySelector('[aria-label="جارٍ التحميل"]') && window.__phaser, null, { timeout: 30000 });
    await sleep(600);
    const info = await page.evaluate(() => {
      const g = window.__phaser; const lvl = g.scene.getScene('Level');
      const canvases = document.querySelectorAll('canvas');
      const c = canvases[0]; const r = c.getBoundingClientRect();
      return { canvases: canvases.length, renderer: g.renderer.type === 2 ? 'WEBGL' : 'CANVAS', backing: [c.width, c.height], css: [Math.round(r.width), Math.round(r.height)], status: lvl.sys.settings.status, zoom: +lvl.cameras.main.zoom.toFixed(3), goals: window.__game.game.getState().session };
    });
    console.log(vp.name, JSON.stringify(info));
    check(`${vp.name}: exactly one canvas (StrictMode safe)`, info.canvases === 1);
    check(`${vp.name}: canvas fills viewport`, info.css[0] === vp.width && info.css[1] === vp.height);
    check(`${vp.name}: backing store at device pixel ratio (cap 2)`, info.backing[0] === vp.width * Math.min(vp.dpr, 2));
    check(`${vp.name}: level scene running`, info.status === 5);
    check(`${vp.name}: goals registered`, info.goals.totalStars === 3 && info.goals.letterDotsRequired === 1);
    await page.screenshot({ path: `${OUT}/p1-${vp.name}-level.png` });

    await page.getByRole('button', { name: 'إيقاف مؤقت' }).click();
    await sleep(300);
    const paused = await page.evaluate(() => window.__phaser.scene.getScene('Level').sys.settings.status);
    check(`${vp.name}: pause button pauses the scene`, paused === 6, `status=${paused}`);
    await page.getByRole('button', { name: 'متابعة' }).click({ force: true });
    await sleep(300);
    check(`${vp.name}: resume runs it again`, (await page.evaluate(() => window.__phaser.scene.getScene('Level').sys.settings.status)) === 5);

    // Replay from the pause menu restarts the scene with a new run.
    const before = await page.evaluate(() => window.__game.game.getState().session.runId);
    await page.getByRole('button', { name: 'إيقاف مؤقت' }).click();
    await page.getByRole('button', { name: 'إعادة' }).click({ force: true });
    await sleep(800);
    const after = await page.evaluate(() => ({ runId: window.__game.game.getState().session.runId, status: window.__phaser.scene.getScene('Level').sys.settings.status, screen: window.__game.game.getState().screen }));
    check(`${vp.name}: replay restarts with a new run`, after.runId === before + 1 && after.status === 5 && after.screen === 'playing', JSON.stringify(after));

    // Resizing re-fits the canvas.
    await page.setViewportSize({ width: vp.height, height: vp.width });
    await sleep(600);
    const rot = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), +window.__phaser.scene.getScene('Level').cameras.main.zoom.toFixed(3)]; });
    check(`${vp.name}: rotation re-fits canvas and zoom`, rot[0] === vp.height && rot[1] === vp.width, JSON.stringify(rot));

    // Home tears the game down completely.
    await page.getByRole('button', { name: 'إيقاف مؤقت' }).click();
    await page.getByRole('button', { name: 'الرئيسية' }).click({ force: true });
    await sleep(800);
    check(`${vp.name}: going home destroys the canvas`, (await page.evaluate(() => document.querySelectorAll('canvas').length)) === 0);
    check(`${vp.name}: no console errors`, errors.length === 0, JSON.stringify(errors));
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
