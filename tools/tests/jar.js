// Preserved from the v36 development session (originally tools/jar4.js). Paths made configurable; test steps unchanged
// (v41: closes the belated jar celebration first).
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const SAMPLE = path.join(__dirname, 'sample-backup.json'); const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-10T15:00:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(700);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(3500);
  await p.goto(BASE + '#/wins'); await p.waitForTimeout(900);
  if (await p.locator('#sheet [data-close]').count()) { await p.click('#sheet [data-close]'); await p.waitForTimeout(200); } // v41: the sample's full jar gets its belated celebration first
  await p.click('[data-win="Showered"]'); await p.fill('#ownWin', 'Called mum'); await p.click('[data-write]'); await p.waitForTimeout(3000);
  await p.click('[data-unwin]'); await p.waitForTimeout(150);
  await p.screenshot({ path: OUT + '/j4.png' });
  await p.click('[data-unwin]'); await p.waitForTimeout(300);
  console.log(await p.locator('.jartoday').innerText());
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
