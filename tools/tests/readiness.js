// v122: the readiness suggestion on Move (design A). A card above the lights: "Looks like a Green day" or "Maybe a
// Yellow day", with reasons, from sleep against your usual, how you woke, recent days you moved, rest days and soft
// days. Never Red, never changes your choice ("Make it Yellow" is one tap), says less or nothing when data is missing,
// and learns after each gym session (a logistic regression in st.readyModel). Settings → More can forget it.
// Fictional data, throwaway profiles. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/readiness.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
// nights: [date the night ended, hours, feel]; moved: dates; soft: dates
const setup = async (p, o) => { await p.evaluate(async o => { const S = await import('./js/store.js'), s = S.get(); s.newsSeen = 999; s.moveSetup = { picked: ['gym', 'walk'], custom: {} };
  s.rests = (o.nights || []).map(([d, h, f], i) => { const end = new Date(d + 'T07:00:00').getTime(); return { id: 'r' + i, date: d, start: end - h * 3600000, end, feel: f || 'okay' }; });
  s.sessions = (o.moved || []).map((d, i) => ({ id: 'g' + i, date: d, ts: Date.parse(d + 'T18:00:00'), workoutId: 'fbA', workoutName: 'Full Body A', exercises: [] }));
  s.activities = []; s.heavy = {}; (o.soft || []).forEach(d => { s.heavy[d] = true; }); delete s.readyModel; delete s.readyNote; s.active = null; S.save(); }, o); await p.waitForTimeout(300); };
const nights = (from, n, h) => Array.from({ length: n }, (_, i) => { const d = new Date(Date.parse(from + 'T12:00:00') + i * 864e5); return [d.toISOString().slice(0, 10), h, 'okay']; });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-19T09:00:00') }); // a Thursday
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  const move = async () => { await p.goto(BASE + '#/home'); await p.goto(BASE + '#/move'); await p.waitForTimeout(500); };
  const card = async () => (await p.locator('.readycard').count()) ? (await p.locator('.readycard').innerText()).replace(/\s+/g, ' ').trim() : '';

  // Green: a good night, rested since Monday
  await setup(p, { nights: nights('2026-11-08', 11, 7.5).concat([['2026-11-19', 7.5, 'refreshed']]), moved: ['2026-11-09', '2026-11-12', '2026-11-16'] });
  await move(); let c = await card();
  ok('Green: "Looks like a Green day", with good sleep and rest as reasons, no button', /^✓ Looks like a Green day/.test(c) && /Good sleep \(7½ hrs\)|Rested since Monday|Woke up refreshed/.test(c) && await p.locator('.readycard .go').count() === 0, c);
  await p.screenshot({ path: OUT + '/rd-green.png', clip: { x: 0, y: 0, width: 390, height: 460 } });
  ok('it never changes your choice: Green is still the one picked', await p.locator('.light[data-light="green"][aria-pressed="true"]').count() === 1);

  // Yellow: a short night (5 h, usually 7), groggy, three days moved in the last four
  await setup(p, { nights: nights('2026-11-08', 11, 7).concat([['2026-11-19', 5, 'groggy']]), moved: ['2026-11-04', '2026-11-09', '2026-11-12', '2026-11-16', '2026-11-17', '2026-11-18'] });
  await move(); c = await card();
  ok('Yellow: "Maybe a Yellow day" with the strongest two reasons', /^~ Maybe a Yellow day/.test(c) && (c.match(/ · /g) || []).length === 1 && /Shorter night than usual \(5 hrs, you usually get 7\)|You woke up groggy|3 sessions in the last 4 days/.test(c), c);
  await p.screenshot({ path: OUT + '/rd-yellow.png', clip: { x: 0, y: 0, width: 390, height: 520 } });
  await p.click('.readycard .go'); await p.waitForTimeout(200);
  ok('Make it Yellow picks Yellow; the card steps aside', await p.locator('.light[data-light="yellow"][aria-pressed="true"]').count() === 1 && await p.locator('.readycard').count() === 0);
  await p.click('.light[data-light="green"]'); await p.waitForTimeout(100);
  await p.reload(); await p.waitForTimeout(1200); // a fresh start (once you pick a light, the card steps aside for the day)

  // never Red, even with everything pointing down
  await setup(p, { nights: nights('2026-11-08', 11, 8).concat([['2026-11-19', 2, 'restless']]), moved: ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'], soft: ['2026-11-18'] });
  const worst = await p.evaluate(async () => (await import('./js/ready.js')).suggest());
  ok('never Red: the worst case is still "Maybe a Yellow day"', worst && worst.light === 'yellow', JSON.stringify(worst && worst.light));

  // only training logged: says so, a few days at most
  await setup(p, { moved: ['2026-11-04', '2026-11-11', '2026-11-16', '2026-11-17', '2026-11-18'] });
  await move(); c = await card();
  ok('training only: a Yellow on training, with the small note about sleep', /Maybe a Yellow day/.test(c) && /3 sessions in the last 4 days/.test(c) && /Going on your training only\. Sleep on Rest would help it guess\./.test(c), c);
  await p.screenshot({ path: OUT + '/rd-partial.png', clip: { x: 0, y: 0, width: 390, height: 520 } });
  const noteDays = [];
  for (const d of ['2026-11-20', '2026-11-21', '2026-11-22']) { await p.clock.setFixedTime(new Date(d + 'T09:00:00'));
    await p.evaluate(async d => { const S = await import('./js/store.js'), s = S.get(); const ds = [1, 2, 3].map(i => new Date(Date.parse(d + 'T12:00:00') - i * 864e5).toISOString().slice(0, 10)); s.sessions = ds.map((x, i) => ({ id: 'q' + i, date: x, ts: 1, workoutId: 'fbA', workoutName: 'x', exercises: [] })).concat([{ id: 'q9', date: '2026-11-04', ts: 1, workoutId: 'fbA', workoutName: 'x', exercises: [] }]); S.save(); }, d);
    await move(); noteDays.push(/Going on your training only/.test(await card())); }
  ok('…the note shows on 3 days, then stops', JSON.stringify(noteDays) === '[true,true,false]', JSON.stringify(noteDays));
  await p.clock.setFixedTime(new Date('2026-11-19T09:00:00'));

  // nothing to go on: no card, Move looks as before
  await setup(p, {}); await move();
  ok('nothing logged: no card at all', await p.locator('.readycard').count() === 0 && await p.locator('.lights').count() === 1);
  await p.screenshot({ path: OUT + '/rd-none.png', clip: { x: 0, y: 0, width: 390, height: 460 } });
  // logging for another day: no card (it's about today)
  await setup(p, { nights: nights('2026-11-08', 11, 7).concat([['2026-11-19', 4, 'groggy']]), moved: ['2026-11-17', '2026-11-18'] });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(200);
  await p.goto(BASE + '#/move?d=2026-11-17'); await p.waitForTimeout(500); // logging for Tuesday
  const chip = await p.locator('.top').first().innerText();
  ok('logging for an earlier day: no card', /17|Tue/.test(chip) && await p.locator('.readycard').count() === 0, chip.replace(/\n/g, ' '));
  await p.evaluate(async () => { (await import('./js/ui.js')).setLogDate(null); });

  // learning: the maths, and the one target (an unusually hard Green session)
  const L = await p.evaluate(async () => { const R = await import('./js/ready.js'), S = await import('./js/store.js');
    const w0 = JSON.parse(JSON.stringify(R.model()));
    R.learn({ x: { sleep: -1, load: 1 }, p: 0.4 }, 1); const w1 = JSON.parse(JSON.stringify(S.get().readyModel));
    R.learn({ x: { sleep: -1 }, p: 0.6 }, 0); const w2 = JSON.parse(JSON.stringify(S.get().readyModel));
    const O = o => R.outcome(o);
    return { w0, w1, w2, o: [O({ feel: 'harder' }), O({ feel: 'usual' }), O({ feel: 'easier' }), O({ feel: 'usual', ratio: 0.5, early: true }), O({ ratio: 0.9 }), O({ early: true }), O({ ratio: 1.0 }), O({ ratio: 0.96 }), O({})] }; });
  ok('a hard session after a short night: short nights count for more, load more', L.w1.w.sleep < L.w0.w.sleep && L.w1.w.load > L.w0.w.load && L.w1.n === 1, JSON.stringify([L.w0.w, L.w1.w]));
  ok('…only the factors it had that day change (wake, rest, soft untouched)', L.w1.w.wake === L.w0.w.wake && L.w1.w.rest === L.w0.w.rest && L.w1.w.soft === L.w0.w.soft);
  ok('a fine session after a short night: sleep counts for less again', L.w2.w.sleep > L.w1.w.sleep && L.w2.n === 2);
  ok('labels: your answer first (Harder = hard; Usual, Easier = not), then lifts; in between = nothing', JSON.stringify(L.o) === '[1,0,0,0,1,1,0,null,null]', JSON.stringify(L.o));

  // a real gym session: nothing learned at Finish; the question on Session done; settled when the sheet closes
  const seed = async light => { await p.evaluate(async light => { const S = await import('./js/store.js'), s = S.get(); delete s.readyModel; delete s.readyLog; s.active = null;
    const ses = (id, date, sets) => ({ id, date, ts: Date.parse(date + 'T18:00:00'), workoutId: 'fbA', workoutName: 'Full Body A', exercises: [{ key: 'curl', name: 'Biceps curl', swap: null, sets: sets.map(([a, b]) => ({ a: String(a), b: String(b) })) }] });
    s.sessions = [ses('h1', '2026-11-09', [[8, 10], [8, 9]]), ses('h2', '2026-11-16', [[8, 11], [8, 10]])];
    const end = new Date('2026-11-19T07:00:00').getTime(); s.rests = Array.from({ length: 10 }, (_, i) => ({ id: 'n' + i, date: 'x', start: end - (i + 1) * 864e5 - 7.5 * 3600000, end: end - (i + 1) * 864e5, feel: 'okay' })).concat([{ id: 'nn', date: '2026-11-19', start: end - 7.5 * 3600000, end, feel: 'refreshed' }]);
    S.save(); }, light); await p.waitForTimeout(600); }; // let it reach storage before the reload
  const session = async (light) => { await p.reload(); await p.waitForTimeout(1200); await move();
    if (light !== 'green') { await p.click('.light[data-light="' + light + '"]'); await p.waitForTimeout(200); }
    await p.click('[data-act="gym"]'); await p.waitForTimeout(300); await p.click('[data-start="fbA"]'); await p.waitForTimeout(300);
    await p.click('[data-ex="4"]'); await p.waitForTimeout(150); for (let i = 0; i < 4; i++) { await p.click('[data-next]'); await p.waitForTimeout(80); }
    await p.evaluate(async () => { const S = await import('./js/store.js'), a = S.get().active; a.items = a.items.map((x, j) => j === 4 ? x : [x[0], 0, x[2]]); S.save(); }); // only the curl was planned
    await p.click('[data-finish]'); await p.waitForTimeout(400); };
  const state = () => p.evaluate(async () => { const s = (await import('./js/store.js')).get(); return JSON.parse(JSON.stringify({ m: s.readyModel || null, log: s.readyLog || [] })); });
  await seed(); await session('green');
  let S1 = await state();
  ok('Finish learns nothing yet, and writes a record (version 2, informed, its chance and the starting model\'s, the signals, Green, lifts against plan)',
    !(S1.m && S1.m.n) && S1.log.length === 1 && S1.log[0].v === 2 && S1.log[0].informed && S1.log[0].p != null && S1.log[0].p0 != null && 'sleep' in S1.log[0].x && S1.log[0].light === 'green' && !S1.log[0].adjusted && S1.log[0].ratio >= 0.98 && !S1.log[0].settled, JSON.stringify(S1.log[0]));
  ok('Session done asks "How did it feel compared to usual?" with Easier / Usual / Harder', /How did it feel compared to usual\?/.test(await p.locator('#sheet').innerText()) && await p.locator('#sheet [data-feel]').count() === 3 && !(await p.locator('#sheet .hf .thanks').isVisible()));
  await p.click('#sheet [data-feel="harder"]'); await p.waitForTimeout(150);
  ok('one tap saves it: highlighted, "Noted. Thanks."', (await p.locator('#sheet [data-feel="harder"]').getAttribute('aria-pressed')) === 'true' && await p.locator('#sheet .hf .thanks').isVisible() && (await state()).log[0].feel === 'harder');
  await p.screenshot({ path: OUT + '/rd-feel.png' });
  await p.click('#sheet [data-feel="usual"]'); await p.waitForTimeout(150);
  ok('tapping another changes it', (await p.locator('#sheet [data-feel="harder"]').getAttribute('aria-pressed')) === 'false' && (await state()).log[0].feel === 'usual');
  await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  S1 = await state();
  ok('closing the sheet settles it once: Usual → not hard, from your answer, learned (a Green session)', S1.log[0].settled && S1.log[0].label === 0 && S1.log[0].from === 'feel' && S1.log[0].trained && S1.m.n === 1, JSON.stringify(S1.log[0]));
  await move(); S1 = await state();
  ok('…and never twice (opening Move again changes nothing)', S1.m.n === 1);
  // a Yellow session: recorded, never trained on
  await seed(); await session('yellow');
  await p.click('#sheet [data-feel="harder"]'); await p.waitForTimeout(100); await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  S1 = await state();
  ok('a Yellow session: recorded (Harder, adjusted) but not trained on', S1.log[0].light === 'yellow' && S1.log[0].adjusted && S1.log[0].label === 1 && !S1.log[0].trained && !(S1.m && S1.m.n), JSON.stringify(S1.log[0]));
  // skipping: no answer → the lifts decide
  await seed(); await session('green'); await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  S1 = await state();
  ok('leaving without answering: the lifts decide (at plan → not hard), and it learns', S1.log[0].feel === null && S1.log[0].from === 'lifts' && S1.log[0].label === 0 && S1.log[0].trained && S1.m.n === 1, JSON.stringify(S1.log[0]));
  // the app closed while the sheet was open: settled next time Move opens
  await seed(); await session('green'); await p.click('#sheet [data-feel="harder"]'); await p.waitForTimeout(600);
  await p.reload(); await p.waitForTimeout(1200);
  S1 = await state(); // the app reopened on Move
  ok('the app closed mid-sheet: settled the next time Move opens, with your answer', S1.log[0].settled && S1.log[0].label === 1 && S1.log[0].from === 'feel' && S1.m.n === 1, JSON.stringify(S1.log[0]));
  // nothing to go on: recorded as not informed, never trained on
  await p.evaluate(async () => { const S = await import('./js/store.js'), s = S.get(); s.rests = []; S.save(); });
  await p.evaluate(async () => { const S = await import('./js/store.js'), s = S.get(); delete s.readyModel; delete s.readyLog; s.sessions = []; s.activities = []; S.save(); }); await p.waitForTimeout(600); // a first-ever session, nothing else logged
  await session('green'); await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  S1 = await state();
  const lastE = S1.log[S1.log.length - 1];
  ok('a first-ever session with nothing logged: recorded as not informed (no chance given), never trained on', lastE.informed === false && lastE.p === null && !lastE.trained, JSON.stringify(lastE));
  // the one-time "not a health check" line
  await setup(p, { nights: nights('2026-11-08', 11, 7).concat([['2026-11-19', 5, 'groggy']]), moved: ['2026-11-16', '2026-11-17', '2026-11-18'] });
  await p.evaluate(async () => { const S = await import('./js/store.js'); delete S.get().readyIntro; S.save(); }); await p.waitForTimeout(600);
  await p.reload(); await p.waitForTimeout(1200); await move();
  const first = await card();
  await p.clock.setFixedTime(new Date('2026-11-20T09:00:00')); await p.reload(); await p.waitForTimeout(1200); await move();
  const next = await card();
  ok('"A guess from your own logs, not a health check." on the first day only', /A guess from your own logs, not a health check\./.test(first) && !/health check/.test(next), first + ' | ' + next);
  await p.clock.setFixedTime(new Date('2026-11-19T09:00:00'));
  // Settings → More: forget (the model and the record)
  await p.evaluate(async () => { const R = await import('./js/ready.js'), S = await import('./js/store.js'); R.learn({ x: { sleep: -1 }, p: 0.5 }, 1); S.get().readyLog = [{ id: 'z', date: '2026-11-19', settled: true }]; S.save(); });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(400);
  ok('Settings → More shows Forget what Move learned', await p.locator('[data-forgetmove]').count() === 1);
  await p.click('[data-forgetmove]'); await p.waitForTimeout(200); await p.click('[data-forgetmoveyes]'); await p.waitForTimeout(300);
  ok('…forgetting clears the model and the record, keeps the workouts', await p.evaluate(async () => { const s = (await import('./js/store.js')).get(); return !s.readyModel && !s.readyLog && s.sessions.length >= 2; }) && await p.locator('[data-forgetmove]').count() === 0);
  // dark
  await setup(p, { nights: nights('2026-11-08', 11, 7).concat([['2026-11-19', 5, 'groggy']]), moved: ['2026-11-16', '2026-11-17', '2026-11-18'] });
  await p.evaluate(async () => { const S = await import('./js/store.js'); S.get().settings.theme = 'dark'; S.save(); window.dispatchEvent(new Event('prequel-theme')); });
  await move(); await p.screenshot({ path: OUT + '/rd-yellow-dark.png', clip: { x: 0, y: 0, width: 390, height: 520 } });
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('readiness: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
