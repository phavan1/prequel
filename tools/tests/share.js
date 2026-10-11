// Preserved from the v36 development session (originally tools/share.js). Paths made configurable; test steps unchanged.
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const SAMPLE = path.join(__dirname, 'sample-backup.json'); const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.clock.install({ time: new Date('2026-10-10T14:00:00') });
  const base = BASE;
  await p.goto(base + '#/settings'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(700);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(500);
  await p.evaluate(async () => {
    const m = await import('./js/store.js'); const st = m.get();
    st.goals = st.goals || []; st.goals.push({ id: 'gsw', kind: 'own', name: 'Swimming', target: 20, from: 0, created: 1, finished: Date.now() });
    m.save();
  });
  await p.goto(base + '#/home'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/sh-home.png' });
  await p.goto(base + '#/me'); await p.waitForTimeout(400); await p.locator('.sharecta').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/sh-me.png' });
  await p.click('.sharecta'); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/sh-screen.png', fullPage: true });
  const kinds = await p.locator('[data-kind]').evaluateAll(els => els.map(e => e.dataset.kind));
  console.log('kinds', kinds, 'miles', await p.locator('[data-mile]').allTextContents());
  for (const k of kinds) {
    await p.click('[data-kind="' + k + '"]'); await p.waitForTimeout(300);
    const n = await p.locator('[data-look-i]').count();
    for (let i = 0; i < n; i++) {
      await p.click('[data-look-i="' + i + '"]'); await p.waitForTimeout(250);
      const d = await p.evaluate(() => document.getElementById('card').toDataURL('image/png'));
      fs.writeFileSync(OUT + '/card-' + k + '-' + i + '.png', Buffer.from(d.split(',')[1], 'base64'));
    }
    if (k === 'mile') await p.screenshot({ path: OUT + '/sh-mile.png', fullPage: true });
  }
  console.log(errs.length ? errs.join('\n') : 'no errors'); await b.close();
})();
