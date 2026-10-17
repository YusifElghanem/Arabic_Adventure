const { chromium } = require('./playwright.cjs');
const { OUT, URL: BASE } = require('./config.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (label, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); if (!ok) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'ابدأ اللعب' }).click({ force: true });
    await page.waitForFunction(() => !document.querySelector('[aria-label="جارٍ التحميل"]') && window.__phaser, null, { timeout: 60000 });
    await sleep(1500);
    const snapshot = () => page.evaluate(() => {
      const s = window.__phaser.scene.getScene('Level');
      const flowers = s.children.list.filter((o) => o.texture?.key?.startsWith('flower'));
      const sun = s.children.list.find((o) => o.texture?.key === 'sun-rays');
      const clouds = s.children.list.filter((o) => o.texture?.key?.startsWith('cloud-') && o.texture.key !== 'cloud-sea');
      return { flower: flowers[0]?.angle, sun: sun?.rotation, cloud: clouds[0]?.x, objects: s.children.list.length, flowers: flowers.length, tweens: s.tweens.getTweens().length };
    });
    const a = await snapshot(); await sleep(1200); const b = await snapshot();
    console.log(reducedMotion, JSON.stringify(a));
    if (reducedMotion === 'no-preference') {
      check('flowers sway', a.flower !== b.flower);
      check('sun rays turn', a.sun !== b.sun);
      check('clouds drift', a.cloud !== b.cloud);
      await page.getByRole('button', { name: 'إيقاف مؤقت' }).click();
      await sleep(300);
      const p1 = await snapshot(); await sleep(1200); const p2 = await snapshot();
      check('pause freezes swaying, sun and clouds', p1.flower === p2.flower && p1.sun === p2.sun && p1.cloud === p2.cloud);
      await page.getByRole('button', { name: 'متابعة' }).click({ force: true });
      await sleep(800);
      const r = await snapshot();
      check('resume brings motion back', r.sun !== p2.sun);
    } else {
      check('reduced motion: clouds hold still', a.cloud === b.cloud);
      check('reduced motion: sun does not spin', a.sun === b.sun);
      const sparkles = await page.evaluate(() => window.__phaser.scene.getScene('Level').ambient.sparkles !== undefined);
      check('reduced motion: no ambient sparkle particles', !sparkles);
    }
    check(`${reducedMotion}: no console errors`, errors.length === 0, JSON.stringify(errors));
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
