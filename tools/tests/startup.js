// v53: the start-up safety net. A normal start never shows it; storage that never answers, or the app's main file
// failing to load, shows "Prequel didn't open properly" (not a blank page), and nothing is saved over real data.
// Throwaway profiles only.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/startup.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);

(async () => {
  const b = await chromium.launch();
  const page = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const p = await ctx.newPage(); await p.clock.install({ time: new Date('2026-10-18T10:00:00') }); return [ctx, p]; };

  // 1. a normal start: the safety net stays hidden
  let [ctx, p] = await page();
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500); await p.clock.runFor(15000); await p.waitForTimeout(200);
  ok('a normal start never shows the recovery screen', await p.locator('#rescue').isHidden() && /Home/.test(await p.locator('nav').innerText().catch(() => '')));
  await ctx.close();

  // 2. storage that never answers (as Chrome on Android sometimes does): a recovery screen, not a blank page
  [ctx, p] = await page();
  await p.addInitScript(() => { const real = indexedDB.open.bind(indexedDB); indexedDB.open = () => ({ set onsuccess(f) {}, set onerror(f) {}, set onupgradeneeded(f) {}, set onblocked(f) {} }); window.__realOpen = real; });
  await p.goto(BASE + '#/home'); await p.waitForTimeout(800); await p.clock.runFor(9000); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/su-rescue.png' });
  ok('stuck storage shows "Prequel didn\'t open properly"', await p.locator('#rescue').isVisible() && /didn't open properly/.test(await p.locator('#rescue').innerText()));
  ok('it says why, in small print', /storage did not open/.test(await p.locator('#rescueWhy').innerText()));
  ok('nothing was saved while storage was stuck', await p.evaluate(() => localStorage.getItem('prequel-state') === null));
  await ctx.close();

  // 3. the app's main file fails to download: the same screen, with a way to fix it
  [ctx, p] = await page();
  await p.route('**/js/app.js', r => r.abort());
  await p.goto(BASE + '#/home'); await p.waitForTimeout(800); await p.clock.runFor(13000); await p.waitForTimeout(300);
  ok('a file that fails to load shows the recovery screen too', await p.locator('#rescue').isVisible());
  await p.unroute('**/js/app.js');
  await p.click('#rescueFix'); await p.waitForTimeout(2500);
  ok('"Fix and reopen" reloads fresh and the app opens', /fresh=/.test(p.url()) && await p.locator('#rescue').isHidden());
  await ctx.close();

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
})();
