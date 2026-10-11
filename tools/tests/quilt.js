// Preserved from the v36 development session (originally tools/q2.js). Paths made configurable; test steps unchanged.
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const SAMPLE = path.join(__dirname, 'sample-backup.json'); const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.clock.install({ time: new Date('2026-10-10T15:00:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(700);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(3500);
  await p.evaluate(async () => { const m = await import('./js/store.js'); m.get().heavy['2026-10-03'] = true; m.get().heavy['2026-10-05'] = true; m.save(); });
  await p.goto(BASE + '#/quilt'); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/q2-1.png', fullPage: true });
  const box = await p.locator('#quilt').boundingBox();
  await p.mouse.click(box.x + 22 + 30 + 62, box.y + 34 + 14 + 30); await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/q2-flip.png' });
  await p.click('#flip'); await p.waitForTimeout(600);
  await p.click('[data-care]'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/q2-care.png' }); await p.click('[data-close]');
  await p.click('[data-mstep="-1"]'); await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/q2-sep.png', fullPage: true });
  await p.evaluate(async () => { const m = await import('./js/store.js'); m.get().settings.theme = 'dark'; m.save(); window.dispatchEvent(new Event('prequel-theme')); });
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/quilt'); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/q2-dark.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
