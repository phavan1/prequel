// v37: Food usuals (top 5 + "All your usuals" sheet), no logging on future days, and kind report empty states.
// Fictional data only, in a throwaway browser profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/usuals.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const N = (kcal, p) => [kcal, p, 30, 8, 2, 3, 4, 300, 1, 40, null, null];
const FOODS = [['Idli', 'home', 9], ['Masala dosa', 'out', 7], ['Curd rice', 'home', 6], ['Banana', null, 5], ['Oats with milk', 'home', 4], ['Paneer wrap', 'out', 3], ['Protein bar', 'packaged', 2], ['Veg biryani', 'out', 1]];

(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.clock.install({ time: new Date('2026-10-14T10:00:00') });
  const toastText = () => p.locator('.toast').innerText().catch(() => '');
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));

  // 1. a brand-new app: reports explain kindly instead of making an empty PDF
  await p.goto(BASE + '#/food'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(800);
  await p.click('[data-reports]'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/u-food-notyet.png' });
  ok('food report with nothing logged shows the "not yet" sheet', await p.locator('#sheet .notyet').count() === 1);
  await p.click('#sheet [data-close]');
  await p.goto(BASE + '#/rest'); await p.waitForTimeout(500);
  ok('sleep diary card shows no zero', !/\b0 logged/.test(await p.locator('main').innerText()));
  await p.click('[data-diary]'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/u-sleep-notyet.png' });
  ok('sleep diary with nothing logged shows the "not yet" sheet', await p.locator('#sheet .notyet').count() === 1);
  await p.click('#sheet [data-close]');

  // seed fictional foods, one old meal and one old rest
  await p.evaluate(async ({ FOODS }) => {
    const s = await import('./js/store.js'), st = s.get();
    FOODS.forEach(([name, kind, uses], i) => st.myFoods.push({ id: 'f' + i, name, from: 'label', n: [100 + i * 40, 4 + i, 30, 8, 2, 3, 4, 300, 1, 40, null, null], unit: '1 serve', unitG: 100, kind, uses, last: 0, created: 0 }));
    st.meals.push({ id: 'm0', date: '2026-09-20', ts: Date.parse('2026-09-20T08:00:00'), name: 'Idli', foodId: 'f0', n: st.myFoods[0].n, unit: '1 serve', unitG: 100, qty: 1, sure: true, kind: 'home' });
    st.rests.push({ id: 'r0', date: '2026-09-21', start: Date.parse('2026-09-20T23:00:00'), end: Date.parse('2026-09-21T07:00:00'), feel: 'okay' });
    s.save();
  }, { FOODS });

  // 2. data exists, but not in "the last 7 days": that option is greyed, the month is offered
  await p.goto(BASE + '#/food'); await p.waitForTimeout(700);
  await p.click('[data-reports]'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/u-food-ranges.png' });
  ok('"last 7 days" is greyed when empty', await p.locator('#sheet .opt.empty[disabled]').count() === 1);
  ok('September is offered', /September 2026/.test(await p.locator('#sheet').innerText()));
  await p.click('#sheet [data-close]');

  // 3. usuals: five on the page, the rest in the sheet
  await p.screenshot({ path: OUT + '/u-food-page.png', fullPage: true });
  ok('five usuals on the page', await p.locator('.reslist.usuals [data-usual]').count() === 5);
  ok('"All your usuals" button shows', await p.locator('[data-allusuals]').count() === 1);
  await p.click('[data-allusuals]'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/u-all-usuals.png' });
  ok('sheet lists all eight, grouped', await p.locator('#ulist [data-usual]').count() === 8 && /home-cooked/i.test(await p.locator('#ulist').innerText()));
  await p.fill('#uq', 'biry'); await p.waitForTimeout(200); await p.screenshot({ path: OUT + '/u-all-usuals-search.png' });
  ok('search narrows the sheet', await p.locator('#ulist [data-usual]').count() === 1);
  await p.click('#ulist [data-usual]'); await p.waitForTimeout(500);
  const s1 = await st();
  ok('tapping a usual in the sheet logs it today', s1.meals.some(m => m.name === 'Veg biryani' && m.date === '2026-10-14'));
  await p.screenshot({ path: OUT + '/u-logged.png' });

  // 4. no logging on future days
  await p.goto(BASE + '#/food?d=2026-10-20'); await p.waitForTimeout(500);
  ok('a future day in the address goes back to today', /Can't log ahead/.test(await toastText()) && /what you ate today/i.test(await p.locator('main').innerText()));
  await p.screenshot({ path: OUT + '/u-future-address.png' });
  await p.evaluate(() => { const i = document.querySelector('[data-logdate]'); i.value = '2026-10-25'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(400);
  ok('picking a future day in the date chip stays on today', !/d=2026-10-25/.test(p.url()));
  await p.evaluate(() => { const i = document.querySelector('[data-logdate]'); i.value = '2026-10-10'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(400);
  ok('a past day still works', /d=2026-10-10/.test(p.url()) && /what you ate · /i.test(await p.locator('main').innerText()));
  await p.goto(BASE + '#/rest'); await p.waitForTimeout(400);
  await p.click('[data-manual]'); await p.waitForTimeout(300);
  await p.evaluate(() => { const i = document.getElementById('rDate'); i.value = '2026-10-16'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  ok('Rest "add by hand" snaps a future day to today', await p.locator('#rDate').inputValue() === '2026-10-14');
  await p.fill('#rTo', '23:30'); await p.click('[data-add]'); await p.waitForTimeout(300);
  ok('a wake-up later today is refused', /hasn't happened yet/.test(await toastText()) && (await st()).rests.length === 1);
  await p.screenshot({ path: OUT + '/u-rest-future.png' });
  await p.goto(BASE + '#/move?d=2026-11-01'); await p.waitForTimeout(400);
  ok('Move ignores a future day too', !/past/.test(await p.locator('.datechip').getAttribute('class')));

  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
