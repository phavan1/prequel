// v73: (1) Your moving journey has no "minutes of moving" card and the cards never leave a gap; a gym session's
// length is kept but shown nowhere (not in the copied text, the Fix sheet or the Move report).
// (2) The Home tab always goes to the regular home page, even from the soft page; the day stays a soft day.
// Throwaway profile, made-up data only. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/hometab.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999; st.moveSetup = { picked: ['gym', 'walk'], custom: {} };
    const t = S.today();
    for (let i = 0; i < 4; i++) { const d = new Date(); d.setDate(d.getDate() - i * 2); st.sessions.push({ id: 'g' + i, date: S.dateKey(d), ts: i, workoutId: 'fbA', workoutName: 'Full Body A', mins: 55, exercises: [{ key: 'chest', name: 'Chest press', swap: null, sets: [{ a: '20', b: '10' }] }] }); }
    st.activities.push({ id: 'a1', date: t, ts: 9, type: 'walk', mins: 30, f: {} });
    S.save(); document.querySelectorAll('.hello').forEach(e => e.remove());
  });

  // 1. the journey
  await p.goto(BASE + '#/journey?from=me'); await p.waitForTimeout(600);
  let txt = await p.locator('main').innerText();
  ok('no "minutes of moving" card', !/where timed/.test(txt));
  const gaps = async () => p.evaluate(() => { const cs = [...document.querySelectorAll('.jcards .jcard')], last = cs[cs.length - 1]; return { n: cs.length, full: cs.length % 2 === 0 || Math.abs(last.getBoundingClientRect().width - document.querySelector('.jcards').getBoundingClientRect().width) < 2 }; });
  let g = await gaps(); ok('Everything: the cards fill the grid', g.full, g.n + ' cards');
  await p.screenshot({ path: OUT + '/ht-journey.png' });
  for (const f of ['gym', 'walk']) { await p.click('[data-jf="' + f + '"]'); await p.waitForTimeout(300); g = await gaps(); ok(f + ': the cards fill the grid', g.full, g.n + ' cards'); }
  // the gym's own length: not in the copied text, not in the Fix sheet, still saved
  const text = await p.evaluate(async () => { const m = await import('./js/screens/move.js'), S = await import('./js/store.js'); return m.sessionText(S.get().sessions[0], 1); });
  ok('the copied session text has no length', !/55 min/.test(text), text.split('\n')[1]);
  await p.evaluate(async () => { const d = await import('./js/screens/days.js'); d.editSession(document.querySelector('main'), 'g0', () => {}); }); await p.waitForTimeout(300);
  ok('Fix this workout has no "how long" box', !(await p.locator('#sessMins').count()) && !/HOW LONG/.test(await p.locator('#sheet').innerText()));
  await p.click('#sheet [data-o="save"]'); await p.waitForTimeout(200);
  ok('the length is still kept quietly', (await st()).sessions[0].mins === 55);

  // 2. the Home tab and the soft page
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/home'); await p.waitForTimeout(400);
  await p.click('[data-heavy]'); await p.waitForTimeout(300);
  ok('the soft page opens', await p.locator('.games').count() === 1);
  await p.screenshot({ path: OUT + '/ht-soft.png' });
  await p.click('.tabbar a[href="#/home"]'); await p.waitForTimeout(400);
  let s = await st();
  ok('Home tab on the soft page: the regular home page', !(await p.locator('.games').count()) && await p.locator('[data-heavy]').count() === 1);
  ok('…and today is still remembered as a soft day', !!s.heavy[Object.keys(s.heavy)[0]] && !!s.softLeft);
  await p.screenshot({ path: OUT + '/ht-home.png' });
  await p.click('[data-heavy]'); await p.waitForTimeout(300);
  ok('the soft ask opens the soft page again', await p.locator('.games').count() === 1);
  await p.click('.games a[href^="#/keepup"]'); await p.waitForTimeout(400);
  await p.click('.sk-back'); await p.waitForTimeout(400);
  ok('a game\'s "‹ Home" goes back to the soft page', await p.locator('.games').count() === 1);
  await p.goto(BASE + '#/rest'); await p.waitForTimeout(400);
  await p.click('.tabbar a[href="#/home"]'); await p.waitForTimeout(400);
  ok('the Home tab from another page: the regular home page', /#\/home/.test(p.url()) && !(await p.locator('.games').count()));
  await p.evaluate(() => window.scrollTo(0, 600)); await p.click('.tabbar a[href="#/home"]'); await p.waitForTimeout(300);
  ok('Home tab on Home: back to the top', await p.evaluate(() => window.scrollY) === 0);
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('hometab: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
