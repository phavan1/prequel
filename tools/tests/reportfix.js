// v111: three Move report fixes. (1) The gym table wraps long sets ("bar + 20 kg each side × 10") instead of cutting
// them off with "…". (2) In Everything, body weight from different places (Gym, Hospital, Other) gets one line each,
// with its own pattern and name. (3) "What I did" counts the gym as rep days, like everywhere else since v87.
// Throwaway profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/reportfix.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const SAMPLE = path.join(__dirname, 'sample-backup.json');
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-14T18:00:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(2500);
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    const T = (d, h) => new Date(d + 'T' + h + ':00:00').getTime(); st.sessions = []; st.weights = []; st.activities = [];
    let i = 0; for (let k = 40; k >= 1; k--) { const d = S.addDays('2026-11-14', -k); if (![1, 4].includes(new Date(d + 'T12:00:00').getDay())) continue;
      st.sessions.push({ id: 'g' + i, date: d, ts: T(d, '18'), workoutId: 'uA', workoutName: 'Upper A', light: 'green', mins: 50, exercises: [
        { key: 'chest', name: 'Chest press', swap: null, sets: [{ a: 'b+' + (17.5 + i * 2.5), b: '10' }] }] });
      if (i % 3 === 0) st.sessions.push({ id: 'h' + i, date: d, ts: T(d, '07'), workoutId: 'uA', workoutName: 'Morning', light: 'green', mins: 20, exercises: [] }); // twice on some days
      i++; }
    st.activities.push({ id: 'a1', date: '2026-11-08', ts: T('2026-11-08', '08'), type: 'walk', mins: 40, f: {} });
    [['2026-10-06', 71.2, 'Gym'], ['2026-10-14', 70.9, 'Gym'], ['2026-10-27', 70.4, 'Gym'], ['2026-11-10', 70.1, 'Gym'], ['2026-10-09', 72.6, 'Hospital'], ['2026-11-06', 72.0, 'Hospital'], ['2026-10-20', 71.5, 'Other']]
      .forEach(([d, kg, where], j) => st.weights.push({ id: 'w' + j, date: d, ts: T(d, '09'), kg, where }));
    S.save();
  });
  const report = (from, to, mode) => p.evaluate(async ([from, to, mode]) => {
    const out = [], orig = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, ...r) { out.push(String(t)); return orig.call(this, t, ...r); };
    const R = await import('./js/reports.js'); const f = await R.moveReport(from, to, mode);
    CanvasRenderingContext2D.prototype.fillText = orig; window.__pdf = Array.from(new Uint8Array(await f.arrayBuffer())); return out;
  }, [from, to, mode]);
  const save = async n => fs.writeFileSync(OUT + '/' + n, Buffer.from(await p.evaluate(() => window.__pdf)));
  const w4 = await report('2026-10-18', '2026-11-14', ''); await save('rf-4weeks.pdf'); const t4 = w4.join(' | ');
  ok('the gym table never ends a set in "…"', !w4.some(x => /…$/.test(x)) && /each side/.test(t4), w4.filter(x => /…$/.test(x)).join(', '));
  const sessDays = await p.evaluate(async () => { const st = (await import('./js/store.js')).get(); return new Set(st.sessions.filter(s => s.date >= '2026-10-18').map(s => s.date)).size; });
  ok('"What I did" says rep days (distinct days), not gym times', new RegExp('What I did: ' + sessDays + ' rep days').test(t4) && !/Gym \d+ times/.test(t4), (t4.match(/What I did:[^|]*/) || [''])[0]);
  ok('Week by week: the gym column is "Rep days" and counts days (the week of 25 October has 3 sessions on 2 days)', w4.includes('Rep days') && /October 25 – October 31 \| 2 of 7 \| 2 \|/.test(t4), (t4.match(/October 25 – October 31[^]{0,30}/) || [''])[0]);
  const all = await report('2026-10-06', '2026-11-14', 'all'); await save('rf-everything.pdf'); const ta = all.join(' | ');
  ok('Everything: body weight has one line per place, named in the key', /one line per place/.test(ta) && /Gym: 71\.2 kg → 70\.1 kg/.test(ta) && /Hospital: 72\.6 kg → 72 kg/.test(ta) && /Other: 71\.5 kg/.test(ta), (ta.match(/Gym: [^|]*/) || [''])[0]);
  ok('…and the heading says why', /each place has its own line/.test(ta));
  await p.evaluate(async () => { const S = await import('./js/store.js'), st = S.get(); st.weights.forEach(w => w.where = 'Gym'); S.save(); });
  const one = (await report('2026-10-06', '2026-11-14', 'all')).join(' | ');
  ok('one place only: the single line, as before', /Every weigh-in/.test(one) && !/one line per place/.test(one));
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('reportfix: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
