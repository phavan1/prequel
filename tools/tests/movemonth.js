// v110: the Move report. The 4-week report (and a month) draws "My lifts over time" lines for lifts done 3+ times;
// 2 weeks stays a table; body weight stays a table outside Everything. And "Or pick a month" in the Move report sheet.
// Throwaway profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/movemonth.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const SAMPLE = path.join(__dirname, 'sample-backup.json');
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-14T18:00:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(2500);
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    const T = d => new Date(d + 'T18:00:00').getTime(); st.sessions = []; st.weights = [];
    for (let k = 74, i = 0; k >= 1; k--) { const d = S.addDays('2026-11-14', -k); if (![1, 3, 5].includes(new Date(d + 'T12:00:00').getDay())) continue;
      st.sessions.push({ id: 'g' + i, date: d, ts: T(d), workoutId: 'uA', workoutName: 'Upper A', light: 'green', mins: 50,
        exercises: [{ key: 'lat', name: 'Lat pulldown', swap: null, sets: [{ a: String(30 + Math.floor(i / 4) * 2.5), b: '10' }] },
          ...(i % 9 === 0 ? [{ key: 'curl', name: 'Biceps curl', swap: null, sets: [{ a: '10', b: '12' }] }] : [])] }); i++; }
    for (let k = 1; k < 28; k += 6) st.weights.push({ id: 'w' + k, date: S.addDays('2026-11-14', -k), ts: T(S.addDays('2026-11-14', -k)), kg: 70 + k / 10, where: 'Gym' });
    S.save();
  });
  const report = (from, to, mode) => p.evaluate(async ([from, to, mode]) => {
    const out = [], orig = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, ...r) { out.push(String(t)); return orig.call(this, t, ...r); };
    const R = await import('./js/reports.js'); const f = await R.moveReport(from, to, mode);
    CanvasRenderingContext2D.prototype.fillText = orig; window.__pdf = Array.from(new Uint8Array(await f.arrayBuffer())); return out.join(' | ');
  }, [from, to, mode]);
  const save = async n => fs.writeFileSync(OUT + '/' + n, Buffer.from(await p.evaluate(() => window.__pdf)));
  const w4 = await report('2026-10-18', '2026-11-14', ''); await save('mm-4weeks.pdf');
  ok('4 weeks: "My lifts over time" is there', /My lifts over time/.test(w4));
  ok('…with Lat pulldown (12 times) but not Biceps curl (only once or twice in 4 weeks)', /Lat pulldown/.test(w4.split('My lifts over time')[1] || '') && !/Biceps curl/.test((w4.split('My lifts over time')[1] || '').split('Other activities')[0]));
  ok('…the calendar and the gym table stay', /Day by day/.test(w4) && /The gym/.test(w4));
  ok('…body weight stays a table (no weigh-in line)', /Body weight/.test(w4) && !/Every weigh-in/.test(w4));
  const w2 = await report('2026-11-01', '2026-11-14', '');
  ok('2 weeks: no lift lines, the table is enough', !/My lifts over time/.test(w2) && /The gym/.test(w2));
  const oct = await report('2026-10-01', '2026-10-31', ''); await save('mm-october.pdf');
  ok('a month (October): calendar plus lift lines', /Day by day/.test(oct) && /My lifts over time/.test(oct) && !/Every weigh-in/.test(oct));
  // the sheet
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/move'); await p.waitForTimeout(700);
  await p.evaluate(async () => (await import('./js/reports.js')).openMoveReport()); await p.waitForTimeout(400);
  const chips = await p.locator('#sheet .monthpick button').allInnerTexts();
  ok('the Move report sheet has "Or pick a month", newest first', /Or pick a month/i.test(await p.locator('#sheet').innerText()) && JSON.stringify(chips) === '["November 2026","October 2026","September 2026"]', JSON.stringify(chips));
  await p.locator('#sheet').screenshot({ path: OUT + '/mm-sheet.png' });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.click('#sheet .monthpick button:has-text("October 2026")')]);
  await p.waitForTimeout(1500);
  ok('picking October makes the report', !!dl || await p.locator('#sheet').count() > 0, dl ? dl.suggestedFilename() : 'share sheet');
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('movemonth: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
