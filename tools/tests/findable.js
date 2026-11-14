// v96: On repeat and Cycle are easier to find. On repeat has its own page, linked from Me next to Your sky and Your
// quilt; Days' "+" says "More"; Settings has "Extra tabs on Days" switches (Cycle, Weather, Tiny wins, On repeat).
// Throwaway profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/findable.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
  await p.evaluate(async () => { const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    st.tapes.push({ id: 't1', date: '2026-10-02', start: '2026-10-02', end: null, title: 'Golden Hour', artist: 'JVKE' });
    S.save(); document.querySelectorAll('.hello').forEach(e => e.remove()); });
  // Me → On repeat
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/me'); await p.waitForTimeout(600);
  const row = await p.locator('.tiles').innerText().catch(() => '');
  ok('Me: Your sky, Your quilt and On repeat side by side', /Your sky/.test(row) && /Your quilt/.test(row) && /On repeat/.test(row), row.replace(/\n/g, ' '));
  await p.locator('.tiles').scrollIntoViewIfNeeded(); await p.locator('.tiles').screenshot({ path: OUT + '/fd-me-row.png' });
  await p.click('.tiles a[href^="#/repeat"]'); await p.waitForTimeout(700);
  ok('On repeat opens as its own page, with the song on the cassette', /On repeat/.test(await p.locator('main h1').innerText()) && await p.locator('.ontape .cassette').count() >= 1 && /Golden Hour/.test(await p.locator('.ontape').innerText()));
  ok('it keeps Me lit, and Back goes to Me', await p.locator('.tabbar a[aria-current="page"][href="#/me"]').count() === 1 && /Me/.test(await p.locator('.back').innerText()));
  await p.screenshot({ path: OUT + '/fd-repeat.png' });
  // Days: "+ More"
  await p.goto(BASE + '#/days'); await p.waitForTimeout(500);
  ok('Days: the + says "More"', /More/.test(await p.locator('[data-addtab]').innerText()));
  await p.screenshot({ path: OUT + '/fd-days.png', clip: { x: 0, y: 0, width: 390, height: 120 } });
  // Settings: switches
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(500);
  const names = await p.locator('[data-dtab]').allInnerTexts();
  ok('Settings lists the extra Days tabs, and says what Cycle is', names.length === 4 && names.some(n => /Cycle/.test(n)) && names.some(n => /On repeat/.test(n)) && /private period tracker/.test(await p.locator('main').innerText()), names.join(', '));
  await p.click('[data-dtab="cycle"]'); await p.waitForTimeout(300);
  const st1 = await p.evaluate(async () => (await import('./js/store.js')).get().settings.dayTabs);
  ok('turning Cycle on adds its tab', st1.includes('cycle') && (await p.locator('[data-dtab="cycle"]').getAttribute('aria-pressed')) === 'true' && /✓/.test(await p.locator('[data-dtab="cycle"]').innerText()));
  await p.locator('.tchips').scrollIntoViewIfNeeded(); await p.locator('.tchips').screenshot({ path: OUT + '/fd-settings.png' });
  await p.goto(BASE + '#/days'); await p.waitForTimeout(400);
  ok('…and Days shows the Cycle tab', await p.locator('[data-tab="cycle"]').count() === 1);
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(300); await p.click('[data-dtab="cycle"]'); await p.waitForTimeout(300);
  await p.goto(BASE + '#/days'); await p.waitForTimeout(400);
  ok('turning it off takes the tab away again', await p.locator('[data-tab="cycle"]').count() === 0);
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('findable: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
