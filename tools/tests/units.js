// Preserved from the v36 development session (originally tools/units.js). Paths made configurable; test steps unchanged.
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const SAMPLE = path.join(__dirname, 'sample-backup.json'); const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.clock.install({ time: new Date('2026-10-10T15:00:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(700);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(3500);
  await p.goto(BASE + '#/me'); await p.waitForTimeout(500);
  await p.click('[data-newgoal]'); await p.waitForTimeout(200);
  await p.fill('#gName', 'Running'); await p.click('[data-unit="km"]'); await p.waitForTimeout(150); await p.fill('#gTarget', '100');
  await p.screenshot({ path: OUT + '/u-new.png' });
  await p.click('[data-save]'); await p.waitForTimeout(300);
  await p.click('[data-newgoal]'); await p.fill('#gName', 'Guitar'); await p.click('[data-unit="__own"]'); await p.fill('#gUnit', 'songs'); await p.fill('#gTarget', '30'); await p.click('[data-save]'); await p.waitForTimeout(300);
  await p.click('[data-loggoal]'); await p.waitForTimeout(300);
  const id = await p.evaluate(async () => { const m = await import('./js/store.js'); return m.get().goals.find(g => g.name === 'Running').id; });
  await p.fill('#amt-' + id, '5.2'); await p.click('[data-plus="' + id + '"]'); await p.waitForTimeout(200);
  await p.fill('#amt-' + id, '3'); await p.click('[data-plus="' + id + '"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/u-log.png' });
  const gid = await p.evaluate(async () => { const m = await import('./js/store.js'); return m.get().goals.find(g => g.name === 'Guitar').id; });
  await p.click('[data-plus="' + gid + '"]'); await p.waitForTimeout(200); await p.click('[data-close]');
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/me'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/u-me.png' });
  await p.goto(BASE + '#/share?t=mile&m=p' + id); await p.waitForTimeout(1500);
  const d = await p.evaluate(() => document.getElementById('card').toDataURL('image/png')); fs.writeFileSync(OUT + '/u-card.png', Buffer.from(d.split(',')[1], 'base64'));
  await p.goto(BASE + '#/rest'); await p.waitForTimeout(400); await p.click('[data-diary]'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/u-sleep.png' });
  console.log(await p.evaluate(async () => { const g = await import('./js/goals.js'); const m = await import('./js/store.js'); return m.get().goals.filter(x => x.kind === 'own').map(x => x.name + ':' + g.count(x) + ' ' + g.unitOf(x)); }));
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
