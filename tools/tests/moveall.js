// v99: the Move report's "Everything": from your first log to today, with Month by month bars, My lifts over time,
// a body-weight line and a compact list by month (no day-by-day calendar or week rows). Six made-up months.
// Saves moveall.pdf. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/moveall.js
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-04T15:00:00') });
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1800);
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999; st.settings.name = 'Sam'; st.moveSetup = { picked: ['gym', 'badminton', 'walk'], custom: {} };
    const T = (d, h) => new Date(d + 'T00:00:00').getTime() + h * 3600000;
    let n = 0;
    for (let d = S.addDays('2026-11-04', -180); d <= '2026-11-04'; d = S.addDays(d, 1)) {
      n++; const wd = new Date(d + 'T12:00:00').getDay(), wk = Math.floor(n / 7);
      if ((wd === 1 || wd === 4) && n % 23 !== 0) st.sessions.push({ id: 's' + n, date: d, ts: T(d, 18), workoutId: 'fb', workoutName: 'Full Body A', light: 'green', exercises: [
        { key: 'chest', name: 'Chest press', swap: null, sets: [{ a: String(10 + Math.floor(wk / 3) * 2.5), b: '10' }] },
        { key: 'curl', name: 'Biceps curl', swap: null, sets: [{ a: String(5 + Math.floor(wk / 5) * 1.25), b: '12' }] },
        { key: 'legpress', name: 'Leg press', swap: null, sets: [{ a: String(3 + Math.floor(wk / 6)), b: '12' }] },
        { key: 'lateral', name: 'Lateral raise', swap: null, sets: [{ a: 'b+' + (2.5 + Math.floor(wk / 8) * 1.25), b: '10' }] }] });
      if (wd === 6) st.activities.push({ id: 'a' + n, date: d, ts: T(d, 10), type: n % 3 ? 'badminton' : 'walk', mins: 50, feel: 'Good', hl: 'PRIVATE HIGHLIGHT', f: {} });
      if (n % 14 === 0) st.weights.push({ id: 'w' + n, date: d, ts: T(d, 8), kg: 74 - n / 60, where: 'Home' });
    }
    S.save();
  });
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/move'); await p.waitForTimeout(500);
  await p.click('#sheet [data-close]').catch(() => {});
  await p.click('[data-movereport]'); await p.waitForTimeout(300);
  const sheet = await p.locator('#sheet').innerText();
  ok('the sheet offers Everything, from the first log', /Everything/.test(sheet) && /Everything\s+May 9 – November 4, 2026/.test(sheet), sheet.replace(/\n/g, ' ').slice(0, 220));
  await p.screenshot({ path: OUT + '/ma-sheet.png' });
  await p.click('#sheet [data-o="2"]'); await p.waitForTimeout(5000);
  ok('the report gets made', /Move report is ready/.test(await p.locator('#sheet').innerText()), await p.locator('#sheet').innerText());
  const r = await p.evaluate(async () => {
    const out = [], orig = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, ...a) { out.push(String(t)); return orig.call(this, t, ...a); };
    const R = await import('./js/reports.js'), S = await import('./js/store.js'), f = await R.moveReport(S.addDays('2026-11-04', -180), '2026-11-04', 'all');
    CanvasRenderingContext2D.prototype.fillText = orig; window.__pdf = Array.from(new Uint8Array(await f.arrayBuffer())); return { said: out.join(' | '), name: f.name };
  });
  fs.writeFileSync(OUT + '/moveall.pdf', Buffer.from(await p.evaluate(() => window.__pdf)));
  const s = r.said, pages = (Buffer.from(await p.evaluate(() => window.__pdf)).toString('latin1').match(/\/Type \/Page\b/g) || []).length;
  ok('it says everything since the first day', /everything since May 8, 2026/.test(s), s.slice(0, 200));
  ok('Month by month bars, with a key in words', /Month by month/.test(s) && /Solid: rep days/.test(s) && /Striped: days with other activities/.test(s) && /May \| 2026/.test(s) && /Nov/.test(s));
  ok('no day-by-day calendar or week rows', !/Day by day/.test(s) && !/Week by week/.test(s) && !/G = Gym/.test(s));
  ok('My lifts over time: first → latest for the top exercises', /My lifts over time/.test(s) && /Chest press/.test(s) && /10 kg → 30 kg/.test(s) && /plate 3 → plate 7/.test(s) && /each side/.test(s), (s.match(/[^|]*→[^|]*/g) || []).join(' ; '));
  ok('body weight as a line', /Every weigh-in/.test(s) && /→/.test(s));
  ok('the list is grouped by month', /October 2026/.test(s) && /\d+ entries/.test(s));
  ok('highlights stay private', !/PRIVATE/.test(s));
  ok('a sensible length', pages >= 3 && pages <= 8, pages + ' pages');
  ok('named for everything', /^Move report, everything to November 4, 2026\.pdf$/.test(r.name), r.name);
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('moveall: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errs.length ? ' ERRORS: ' + errs.join(' | ') : ' no errors'));
})();
