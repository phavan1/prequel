// v61: "Your last two weeks of nights" on Me (replaces the rest clock), and the Move report PDF (last 2 weeks).
// Fictional data only, throwaway profiles. Saves moverep.pdf and screenshots into SHOTS.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/moverep.js
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-24T13:00:00') });
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(2000); await p.mouse.click(5, 5); await p.waitForTimeout(400);

  // two weeks of made-up nights, a nap, gym sessions, other activities and two weigh-ins
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999; st.settings.name = 'Sam';
    const T = (d, h, m = 0) => new Date(d + 'T00:00:00').getTime() + (h * 60 + m) * 60000;
    for (let i = 0; i < 14; i++) {
      const d = S.addDays('2026-10-24', -i); if (i === 5) continue;
      const bed = -1 + (i % 3) * 0.5, up = 7 + (i % 4) * 0.4;
      st.rests.push({ id: 'r' + i, date: d, start: T(d, 0) + bed * 3600000, end: T(d, 0) + up * 3600000, feel: 'okay' });
    }
    st.rests.push({ id: 'nap1', date: '2026-10-19', start: T('2026-10-19', 14), end: T('2026-10-19', 15, 10), feel: 'rested' });
    const ses = (id, d, light, ex) => st.sessions.push({ id, date: d, ts: T(d, 18), workoutId: 'uA', workoutName: 'Upper A', light, exercises: ex });
    ses('s1', '2026-10-12', 'green', [{ key: 'curl', name: 'Biceps curl', swap: null, sets: [{ a: '10', b: '12' }, { a: '10', b: '10' }] }, { key: 'lat', name: 'Lat pulldown', swap: null, sets: [{ a: 'nn', b: '10' }] }]);
    ses('s2', '2026-10-16', 'yellow', [{ key: 'curl', name: 'Biceps curl', swap: null, sets: [{ a: '10', b: '12' }, { a: '12.5', b: '8' }] }, { key: 'lateral', name: 'Lateral raise', swap: null, sets: [{ a: 'b+2.5', b: '10' }] }]);
    ses('s3', '2026-10-22', 'green', [{ key: 'curl', name: 'Biceps curl', swap: null, sets: [{ a: '12.5', b: '10' }] }, { key: 'chest', name: 'Chest press', swap: 'Flat dumbbell press', sets: [{ a: '15', b: '10' }] }]);
    st.sessions.push({ id: 'old', date: '2026-09-01', ts: 1, workoutId: 'uA', workoutName: 'Upper A', exercises: [{ key: 'curl', name: 'Biceps curl', swap: null, sets: [{ a: '50', b: '1' }] }] });
    st.activities = [
      { id: 'a1', date: '2026-10-13', ts: T('2026-10-13', 19), type: 'badminton', mins: 60, feel: 'Good', hl: 'PRIVATE HIGHLIGHT', f: { kind: 'Doubles', games: 6 } },
      { id: 'a2', date: '2026-10-18', ts: T('2026-10-18', 9), type: 'walk', mins: 45, feel: 'Easy', f: { dist: 4.2 } },
      { id: 'a3', date: '2026-10-20', ts: T('2026-10-20', 9), type: 'walk', mins: 30, f: { dist: 3 } },
      { id: 'a4', date: '2026-10-22', ts: T('2026-10-22', 7), type: 'run', mins: 25, feel: 'Tough', note: 'PRIVATE NOTE', f: { dist: 4 } }
    ];
    st.weights = [{ id: 'w1', date: '2026-10-12', ts: 1, kg: 72.4, where: 'Gym' }, { id: 'w2', date: '2026-10-22', ts: 2, kg: 71.8, where: 'Gym' }];
    S.save();
  });

  // 1. Me: the nights chart
  await p.goto(BASE + '#/me'); await p.waitForTimeout(600);
  ok('the rest clock is gone, "Your last two weeks of nights" is there', await p.locator('.restclock').count() === 0 && await p.locator('svg.nights').count() === 1);
  ok('one row per day for two weeks', await p.locator('svg.nights .nday').count() === 14);
  const sum = await p.locator('.nsum').innerText();
  ok('a plain line says when you usually sleep and wake', /Usually asleep around .+, up around .+\./.test(sum), sum);
  ok('naps are striped, sleep is solid', await p.locator('svg.nights > rect[fill="url(#napHatch)"]').count() === 1 && await p.locator('svg.nights > rect[fill="#1F55D0"]').count() === 13);
  await p.locator('svg.nights').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  await p.locator('svg.nights').evaluate(el => el.closest('.card').scrollIntoView({ block: 'center' }));
  await p.screenshot({ path: OUT + '/mr-nights.png' });

  // 2. the Move report
  await p.goto(BASE + '#/move'); await p.waitForTimeout(400);
  if (await p.locator('.picker [data-picksave]').count()) { if ((await p.locator('[data-pick="gym"]').getAttribute('aria-pressed')) !== 'true') await p.click('[data-pick="gym"]'); await p.click('[data-picksave]'); await p.waitForTimeout(300); }
  await p.click('#sheet [data-close]').catch(() => {});
  ok('Move has a "Move report" button', await p.locator('[data-movereport]').count() === 1);
  await p.click('[data-movereport]'); await p.waitForTimeout(300);
  ok('it offers the last 2 weeks', /Last 2 weeks/.test(await p.locator('#sheet').innerText()));
  await p.screenshot({ path: OUT + '/mr-sheet.png' });
  await p.click('#sheet [data-o="0"]'); await p.waitForTimeout(3000);
  ok('the report gets made', /Move report is ready/.test(await p.locator('#sheet').innerText()));
  await p.click('#sheet [data-close]').catch(() => {});
  // the words in it (every fillText), and the PDF itself
  const said = await p.evaluate(async () => {
    const out = [], orig = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, ...r) { out.push(String(t)); return orig.call(this, t, ...r); };
    const R = await import('./js/reports.js'); const f = await R.moveReport('2026-10-11', '2026-10-24');
    CanvasRenderingContext2D.prototype.fillText = orig; window.__pdf = Array.from(new Uint8Array(await f.arrayBuffer())); return out.join(' | ');
  });
  fs.writeFileSync(OUT + '/moverep.pdf', Buffer.from(await p.evaluate(() => window.__pdf)));
  ok('at a glance: days moved and sessions', /6 of 14/.test(said) && /gym sessions/.test(said), said.slice(0, 160));
  ok('body check-ins and how activities felt', /How my body felt before the gym: Green/.test(said) && /How the other activities felt/.test(said));
  ok('body weight is in it', /72\.4 kg/.test(said) && /71\.8 kg/.test(said));
  ok('the gym: first, latest and best per exercise', /10 kg × 12/.test(said) && /12\.5 kg × 10/.test(said) && /bar \+ 2\.5 kg each side × 10/.test(said) && /Flat dumbbell press/.test(said));
  ok('older sessions stay out of it', !/50 kg/.test(said));
  ok('other activities with their totals', /Badminton/.test(said) && /7\.2 km/.test(said) && /6 games/.test(said));
  ok('highlights and notes stay private', !/PRIVATE/.test(said));
  ok('the calendar has a key', /G = Gym/.test(said) && /B = Badminton/.test(said));

  // no data: a kind sheet instead of an empty PDF
  await p.evaluate(async () => { const S = await import('./js/store.js'); S.get().sessions = []; S.get().activities = []; S.save(); });
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/move'); await p.waitForTimeout(300); await p.click('[data-movereport]'); await p.waitForTimeout(300);
  ok('nothing logged yet: a kind sheet, no empty PDF', /on its way/.test(await p.locator('#sheet').innerText()));

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no errors');
})();
