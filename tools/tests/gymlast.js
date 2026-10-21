// v57: "Last time" in the gym comes from your saved workouts (so fixing an old workout fixes it), the first set of an
// exercise starts empty with last time as a faint hint (nothing is saved that you didn't choose), and the Weight
// button is on Move as well as Food. Fictional data only, throwaway profiles.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/gymlast.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-21T18:00:00') });
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  const key = async k => { await p.locator('[data-k="' + k + '"]').dispatchEvent('pointerdown'); await p.waitForTimeout(40); };
  await p.goto(BASE + '#/home'); await p.waitForTimeout(2000); await p.mouse.click(5, 5); await p.waitForTimeout(400);

  // the situation from the gym: last Upper A had biceps curls at 10 kg, but the old "last set" memory says 12.5
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    st.sessions.push({ id: 'old1', date: '2026-10-09', ts: 1, workoutId: 'uA', workoutName: 'Upper A', exercises: [{ key: 'curl', name: 'Biceps curl', swap: null, sets: [{ a: '12.5', b: '8' }] }] });
    st.sessions.push({ id: 'old2', date: '2026-10-13', ts: '1760300000000', workoutId: 'uA', workoutName: 'Upper A', exercises: [{ key: 'curl', name: 'Biceps curl', swap: null, sets: [{ a: '10', b: '12' }, { a: '10', b: '10' }] }, { key: 'lat', name: 'Lat pulldown', swap: null, sets: [{ a: 'nn', b: '10' }] }] });
    st.sessions.push({ id: 'old3', date: '2026-10-16', ts: 5, workoutId: 'uA', workoutName: 'Upper A', exercises: [{ key: 'curl', name: 'Biceps curl', swap: 'Hammer curl', sets: [{ a: '7.5', b: '12' }] }] });
    st.lifts.curl = { a: '12.5', b: '8' }; S.save();
  });
  const toGym = async () => { if (await p.locator('.picker [data-picksave]').count()) { if ((await p.locator('[data-pick="gym"]').getAttribute('aria-pressed')) !== 'true') await p.click('[data-pick="gym"]'); await p.click('[data-picksave]'); await p.waitForTimeout(300); } };
  await p.goto(BASE + '#/move'); await p.waitForTimeout(400); await toGym(); await p.click('#sheet [data-close]').catch(() => {}); await p.waitForTimeout(200);
  ok('Move has a Weight button', await p.locator('[data-weight]').count() === 1);
  await p.click('[data-act="gym"]'); await p.waitForTimeout(300);
  await p.click('[data-start="uA"]'); await p.waitForTimeout(300);
  await p.click('[data-ex="5"]'); await p.waitForTimeout(200);
  let say = await p.locator('.say').innerText();
  ok('"Last time" reads the saved workout, every set (not the old 12.5)', /Last time: 10kg × 12, 10kg × 10 \(Tue,? 13 Oct\)/.test(say), say);
  ok('a swapped curl (hammer curl) doesn\'t count as biceps curl', !/7\.5/.test(say));
  const box = await p.locator('.field[data-f="a"]').innerText();
  ok('the weight box starts empty, with "last 10" as a faint hint', /last 10/.test(box) && !/12\.5/.test(box), box.replace(/\n/g, ' '));
  await p.screenshot({ path: OUT + '/gl-first.png' });

  // ± on the empty first set starts from last time's weight
  await p.locator('[data-n="2.5"]').click(); await p.waitForTimeout(100);
  ok('+2.5 on the empty box starts from last time (12.5)', /12\.5/.test(await p.locator('.field[data-f="a"]').innerText()));
  await p.locator('[data-n="-2.5"]').click(); await key('del'); await key('del'); await key('del'); await key('del'); await p.waitForTimeout(100);
  // tapping through without typing saves nothing
  await p.click('[data-next]'); await p.click('[data-next]'); await p.waitForTimeout(200);
  let s = await st();
  ok('Next, Next without typing saves no set', !(s.active.log[5] || []).length);
  // Same again on the first set uses last time's first set
  await p.click('[data-same]'); await p.waitForTimeout(200);
  s = await st();
  ok('Same again on set 1 = last time\'s set 1 (10 kg × 12)', JSON.stringify(s.active.log[5]) === JSON.stringify([{ a: '10', b: '12' }]), JSON.stringify(s.active.log[5]));
  const box2 = await p.locator('.field[data-f="a"]').innerText();
  ok('set 2 starts from the set you just did', /10/.test(box2) && !/last/.test(box2), box2.replace(/\n/g, ' '));
  // typing still works normally
  await key('1'); await key('0'); await p.click('[data-next]'); await key('9'); await p.click('[data-next]'); await p.waitForTimeout(200);
  s = await st();
  ok('typing a set works as before', s.active.log[5].length === 2 && s.active.log[5][1].a === '10' && s.active.log[5][1].b === '9');
  await p.screenshot({ path: OUT + '/gl-second.png' });

  // fixing an old workout fixes "Last time" (as Days → Fix this workout does)
  await p.evaluate(async () => { const S = await import('./js/store.js'), x = S.get().sessions.find(s => s.id === 'old2'); x.exercises[1].sets[0] = { a: '45', b: '10' }; S.save(); });
  await p.click('[data-ex="1"]'); await p.waitForTimeout(200);
  say = await p.locator('.say').innerText();
  ok('a fixed old workout shows the fixed numbers', /Last time: 45kg × 10/.test(say), say);
  await p.click('[data-ex="0"]'); await p.waitForTimeout(200);
  ok('an exercise you\'ve never done says so', /First time with this one/.test(await p.locator('.say').innerText()));

  // finish, and next time it's today's numbers
  await p.click('[data-finish]'); await p.waitForTimeout(400); await p.click('#sheet [data-close]').catch(() => {}); await p.waitForTimeout(300);
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/move'); await p.waitForTimeout(300);
  await p.click('[data-act="gym"]'); await p.waitForTimeout(300); await p.click('[data-start="uA"]'); await p.waitForTimeout(300);
  await p.click('[data-ex="5"]'); await p.waitForTimeout(200);
  say = await p.locator('.say').innerText();
  ok('next time, it\'s the latest workout', /Last time: 10kg × 12, 10kg × 9 \(Today\)/.test(say), say);
  await p.evaluate(async () => { const S = await import('./js/store.js'); S.get().active = null; S.save(); });

  // the Weight button: the same log as Food
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/move'); await p.waitForTimeout(300);
  await p.click('[data-weight]'); await p.waitForTimeout(300);
  await p.fill('#wKg', '71.4'); await p.click('#sheet [data-o="save"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/gl-weight.png' });
  // one a day for each place (v58): saving Gym again changes it; Hospital is its own
  await p.fill('#wKg', '71.6'); await p.click('#sheet [data-o="save"]'); await p.waitForTimeout(300);
  let W = (await st()).weights;
  ok('a second Gym weight today replaces the first', W.length === 1 && W[0].kg === 71.6, JSON.stringify(W));
  await p.click('#sheet [data-where="Hospital"]'); await p.fill('#wKg', '72'); await p.click('#sheet [data-o="save"]'); await p.waitForTimeout(300);
  W = (await st()).weights;
  ok('Hospital today is kept separately', W.length === 2);
  await p.click('#sheet [data-where="Gym"]'); await p.fill('#wKg', '71.4'); await p.click('#sheet [data-o="save"]'); await p.waitForTimeout(300);
  await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  ok('Move shows your latest weight', /71\.4 kg/.test(await p.locator('[data-weight]').innerText()));
  await p.screenshot({ path: OUT + '/gl-hub.png' });
  await p.goto(BASE + '#/food'); await p.waitForTimeout(500);
  ok('Food shows the same weight', /7[12](\.\d)? kg/.test(await p.locator('[data-weight]').innerText()));

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no errors');
})();
