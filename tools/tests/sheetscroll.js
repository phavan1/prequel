// v95: while a sheet is open, the page behind it doesn't scroll (on iPhone it used to move with the sheet), and
// closing the sheet puts the page back exactly where it was. Throwaway profile.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/sheetscroll.js
const { chromium, devices } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
  await p.evaluate(async () => { const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    for (let d = 1; d <= 25; d++) { const k = '2026-10-' + String(d).padStart(2, '0'); st.weather.push({ id: 'w' + d, date: k, ts: new Date(k + 'T09:00').getTime(), types: ['Clear sun'] }); }
    S.save(); document.querySelectorAll('.hello').forEach(e => e.remove()); });
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/me'); await p.waitForTimeout(800);
  await p.evaluate(() => window.scrollTo(0, 300)); await p.waitForTimeout(200);
  const y0 = await p.evaluate(() => window.scrollY);
  await p.evaluate(async () => { const N = await import('./js/news.js'); N.openNews(N.NEWS, true); });
  if (!(await p.locator('#sheet').count())) await p.evaluate(async () => { const U = await import('./js/ui.js'); U.openSheet('<h2>Test</h2>' + Array.from({ length: 60 }, (_, i) => '<p>Line ' + i + '</p>').join('') + '<button class="btn" data-close>Done</button>'); });
  await p.waitForTimeout(300);
  const pinned = await p.evaluate(() => [getComputedStyle(document.body).position, document.body.style.top]);
  ok('a sheet pins the page where it was', pinned[0] === 'fixed' && pinned[1] === -y0 + 'px', JSON.stringify(pinned) + ' y0=' + y0);
  const box = await p.locator('#sheet .sheet').boundingBox();
  const before = await p.evaluate(() => document.querySelector('main').getBoundingClientRect().top);
  for (let i = 0; i < 6; i++) { await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.wheel(0, 600); await p.waitForTimeout(80); }
  const after = await p.evaluate(() => document.querySelector('main').getBoundingClientRect().top);
  const inner = await p.evaluate(() => Math.max(...[...document.querySelectorAll('#sheet .sheet, #sheet .sheet *')].map(e => e.scrollTop))); // the sheet, or a list inside it (What's new)
  ok('scrolling inside the sheet doesn\'t move the page behind', before === after, before + ' → ' + after);
  ok('…and the sheet itself scrolls', inner > 0, 'scrolled ' + inner + ' px inside');
  await p.click('#sheet [data-close]').catch(async () => { await p.evaluate(async () => (await import('./js/ui.js')).closeSheet()); }); await p.waitForTimeout(300);
  const y1 = await p.evaluate(() => [window.scrollY, getComputedStyle(document.body).position]);
  ok('closing it puts the page back exactly where it was', y1[0] === y0 && y1[1] !== 'fixed', JSON.stringify(y1));
  // one sheet straight after another keeps the page pinned in the same place
  await p.evaluate(async () => { const U = await import('./js/ui.js'); U.openSheet('<h2>A</h2>'); U.openSheet('<h2>B</h2><button data-close>x</button>'); });
  await p.click('#sheet [data-close]'); await p.waitForTimeout(200);
  ok('swapping sheets still returns to the same spot', await p.evaluate(() => window.scrollY) === y0);
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('sheetscroll: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
