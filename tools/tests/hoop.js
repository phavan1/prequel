// v86: the embroidery hoop on Home holds only this month's quilt patches (a clean slate on the 1st), on plain cloth.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/hoop.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
const run = async (b, when, name) => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date(when) });
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    const add = (k, feel) => { const e = new Date(k + 'T07:00:00').getTime(); st.rests.push({ id: 'r' + k, date: k, start: e - 8 * 3600e3, end: e, feel }); };
    for (let d = 1; d <= 31; d++) add('2026-10-' + String(d).padStart(2, '0'), ['rested', 'okay', 'groggy'][d % 3]);
    add('2026-11-01', 'rested'); add('2026-11-02', 'okay');
    st.wall = { plans: {}, phrase: {}, made: {}, seen: { '2026-10': 1 } };
    S.save(); document.querySelectorAll('.hello').forEach(e => e.remove());
  });
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/home'); await p.waitForTimeout(600);
  const n = Number(await p.locator('#miniquilt').getAttribute('data-patches'));
  await p.locator('.hoop').screenshot({ path: OUT + '/hoop-' + name + '.png' });
  await ctx.close(); return n;
};
(async () => {
  const b = await chromium.launch();
  ok('on 2 November the hoop holds only November\'s two patches', await run(b, '2026-11-02T14:00:00', 'nov') === 2);
  ok('on 1 December it\'s a clean slate', await run(b, '2026-12-01T09:00:00', 'dec') === 0);
  ok('on 31 October it shows October (the latest 16 of a full month)', await run(b, '2026-10-31T20:00:00', 'oct') === 16);
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('hoop: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
