// v121: "Today, try…" on the gym screen. Every set gets a suggestion from your own history: the first set from your
// playbook's rule (one more rep, or a step heavier once every set reached the top of the range) and what it learned
// (your step size, a dip or a break); the next sets follow your usual drop and how the last set went, at the same
// weight. Yellow days hold steady, Red days go a step lighter. Use it fills the boxes; Next on an empty box takes it.
// Fictional data, throwaway profiles. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/todaytry.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
const S = (w, ...r) => r.map(b => ({ w, r: b }));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-18T18:00:00+11:00') });
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);

  // ---- the arithmetic (coach.js) ----
  const c = await p.evaluate(async () => { const S = (w, ...r) => r.map(b => ({ w, r: b })); const C = await import('./js/coach.js'); const H = (...x) => x.map(([d, sets]) => ({ date: d, sets }));
    const rng = [8, 12], hA = H(['2026-11-01', S(6, 12, 12)], ['2026-11-10', S(8, 10, 10, 9)]);
    return {
      oneMore: C.plan({ hist: hA, rng, step: 2, date: '2026-11-18' }),
      heavier: C.plan({ hist: H(['2026-11-01', S(6, 10, 10)], ['2026-11-10', S(8, 12, 12)]), rng, step: C.learnedStep(H(['2026-11-01', S(6, 10)], ['2026-11-10', S(8, 12)]), 1), date: '2026-11-18' }),
      step: C.learnedStep(H(['a', S(6, 10)], ['b', S(8, 10)], ['c', S(9, 10)]), 2),
      stepNone: C.learnedStep(H(['a', S(8, 10)], ['b', S(8, 11)]), 2.5),
      break3: C.plan({ hist: hA, rng, step: 2, date: '2026-12-05' }),
      break7: C.plan({ hist: hA, rng, step: 2, date: '2027-01-02' }),
      yellow: C.plan({ hist: hA, rng, step: 2, light: 'yellow', date: '2026-11-18' }),
      red: C.plan({ hist: hA, rng, step: 2, light: 'red', date: '2026-11-18' }),
      dip: C.plan({ hist: H(['2026-10-20', S(8, 12, 12)], ['2026-10-27', S(8, 12, 11)], ['2026-11-03', S(8, 12, 12)], ['2026-11-10', S(8, 7, 6)]), rng, step: 2, date: '2026-11-18' }),
      once: C.plan({ hist: H(['2026-11-10', S(8, 10)]), rng, step: 2, date: '2026-11-18' }),
      drop1: C.learnedDrop(H(['a', S(8, 11, 10, 9)], ['b', S(8, 10, 9)])), drop2: C.learnedDrop(H(['a', S(8, 12, 10, 8)])), dropNone: C.learnedDrop(H(['a', S(8, 10)])),
      onPlan: C.nextSet({ target: { r: 11 }, prev: { w: 8, r: 11 }, drop: 1, rng, step: 2 }),
      strong: C.nextSet({ target: { r: 11 }, prev: { w: 8, r: 13 }, drop: 1, rng, step: 2 }),
      tough: C.nextSet({ target: { r: 11 }, prev: { w: 8, r: 8 }, drop: 1, rng, step: 2 }),
      bw: C.plan({ hist: H(['2026-11-01', S(null, 12)], ['2026-11-10', S(null, 14, 12)]), rng: [10, 20], step: 0, date: '2026-11-18', bw: true }),
      e: Math.round(C.e1rm(8, 12) * 100) / 100 };
  });
  ok('last time 8×10,10,9 (range 8–12) → try 8 × 11, one more rep', c.oneMore.w === 8 && c.oneMore.r === 11 && /One more rep/.test(c.oneMore.why), JSON.stringify(c.oneMore));
  ok('every set at 12 → a step heavier, back to 8 reps (step learned: 6 → 8 is 2)', c.heavier.w === 10 && c.heavier.r === 8 && c.heavier.up, JSON.stringify(c.heavier));
  ok('your step is the smallest jump you\'ve made (6→8→9: 1); none yet: the starting step', c.step === 1 && c.stepNone === 2.5);
  ok('3+ weeks away → same as last time, saying so; 6+ weeks → a step lighter at the bottom of the range',
    c.break3.w === 8 && c.break3.r === 10 && /3 weeks/.test(c.break3.why) && c.break7.w === 6 && c.break7.r === 8 && /7 weeks: a step lighter/.test(c.break7.why), JSON.stringify([c.break3, c.break7]));
  ok('Yellow day → same as last time; Red day → a step lighter', c.yellow.w === 8 && c.yellow.r === 10 && /Yellow day/.test(c.yellow.why) && c.red.w === 6 && /Red day/.test(c.red.why), JSON.stringify([c.yellow, c.red]));
  ok('a dip last time (well under your recent best) → same again, not more', c.dip.w === 8 && c.dip.r === 7 && /lighter one/.test(c.dip.why), JSON.stringify(c.dip));
  ok('only one time before → no suggestion (Last time is enough)', c.once === null);
  ok('your usual drop is learned (11,10,9 → 1; 12,10,8 → 2; nothing to go on → 1)', c.drop1 === 1 && c.drop2 === 2 && c.dropNone === 1);
  ok('next set: on plan (11) → × 10, your usual drop', c.onPlan.w === 8 && c.onPlan.r === 10 && /usual drop/.test(c.onPlan.why) && c.onPlan.nextW == null, JSON.stringify(c.onPlan));
  ok('next set: a strong 13 → × 12 at the same weight, and next time 10', c.strong.w === 8 && c.strong.r === 12 && c.strong.nextW === 10, JSON.stringify(c.strong));
  ok('next set: a tough 8 → × 8 is fine today', c.tough.r === 8 && /fine today/.test(c.tough.why), JSON.stringify(c.tough));
  ok('body weight: reps only', c.bw.w === null && c.bw.r === 15, JSON.stringify(c.bw));
  ok('estimated one-rep max: 8 kg × 12 ≈ 11.2', c.e === 11.2);

  // ---- on the gym screen ----
  await p.evaluate(async () => { const M = await import('./js/store.js'), s = M.get(); s.newsSeen = 999; s.weightUnit = 'kg'; s.moveSetup = { picked: ['gym'], custom: {} };
    const ses = (id, date, ex) => ({ id, date, ts: Date.parse(date), workoutId: 'fbA', workoutName: 'Full Body A', exercises: ex });
    const x = (key, name, sets) => ({ key, name, swap: null, sets: sets.map(([a, b]) => ({ a: String(a), b: String(b) })) });
    s.sessions = [ses('t1', '2026-11-01', [x('curl', 'Biceps curl', [[6, 12], [6, 11]]), x('lat', 'Lat pulldown', [[30, 10]])]),
      ses('t2', '2026-11-10', [x('curl', 'Biceps curl', [[8, 10], [8, 9], [8, 8]]), x('shoulder', 'Shoulder press', [['b+10', 9], ['b+10', 8]])]),
      ses('t3', '2026-11-14', [x('shoulder', 'Shoulder press', [['b+10', 10], ['b+10', 9]])])];
    M.save(); });
  const toWk = async (light) => { await p.goto(BASE + '#/home'); await p.goto(BASE + '#/move'); await p.waitForTimeout(400);
    if (await p.locator('.picker [data-picksave]').count()) { await p.click('[data-pick="gym"]'); await p.click('[data-picksave]'); await p.waitForTimeout(300); }
    await p.click('[data-act="gym"]'); await p.waitForTimeout(300); if (light) { if (!(await p.locator('[data-light="' + light + '"]').count())) { await p.click('[data-hub]'); await p.waitForTimeout(300); } await p.click('[data-light="' + light + '"]'); await p.waitForTimeout(300); if (!(await p.locator('[data-start="fbA"]').count())) { await p.click('[data-act="gym"]').catch(() => {}); await p.waitForTimeout(300); } }
    await p.click('[data-start="fbA"]'); await p.waitForTimeout(300); };
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  await toWk();
  await p.click('[data-ex="4"]'); await p.waitForTimeout(200); // biceps curl
  let line = await p.locator('.trynow').innerText();
  ok('curl: "Today, try 8 kg × 11 · One more rep than last time" with Use it', /Today, try 8 kg × 11/.test(line) && /One more rep than last time/.test(line) && await p.locator('[data-tryuse]').count() === 1, line);
  const boxA = await p.locator('.field[data-f="a"]').innerText(), boxB = await p.locator('.field[data-f="b"]').innerText();
  ok('the faint hints say try 8 and try 11', /try 8/.test(boxA) && /try 11/.test(boxB), boxA + ' | ' + boxB);
  await p.screenshot({ path: OUT + '/tt-first.png' });
  await p.click('[data-next]'); await p.waitForTimeout(100); await p.click('[data-next]'); await p.waitForTimeout(200);
  let s = await st();
  ok('Next, Next on the empty boxes logs 8 × 11 (exactly "8")', JSON.stringify(s.active.log[4]) === JSON.stringify([{ a: '8', b: '11' }]), JSON.stringify(s.active.log[4]));
  line = await p.locator('.trynow').innerText();
  ok('set 2: "Set 2: 8 kg × 10 · Your usual drop", no Use it, and the reps box starts at 10', /Set 2: 8 kg × 10/.test(line) && /usual drop/.test(line) && await p.locator('[data-tryuse]').count() === 0 && /^REPS\s*10$/.test((await p.locator('.field[data-f="b"]').innerText()).trim()), line + ' | ' + (await p.locator('.field[data-f="b"]').innerText()).replace(/\n/g, ' ') + ' | ' + await p.locator('[data-tryuse]').count());
  await p.screenshot({ path: OUT + '/tt-set2.png' });
  // a strong set 2: 13 reps
  await p.click('.field[data-f="b"]'); for (const k of ['1', '5']) { await p.locator('[data-k="' + k + '"]').dispatchEvent('pointerdown'); await p.waitForTimeout(40); }
  await p.waitForTimeout(100);
  const typed = await p.locator('.field[data-f="b"] .v').first().innerText();
  if (typed !== '13') { await p.evaluate(() => {}); }
  await p.click('[data-next]'); await p.waitForTimeout(200);
  s = await st(); const said = await p.locator('.say').innerText();
  ok('a strong 15 (the top of 10–15) → "Strong today. Next time, 10 kg." and set 3 aims × 14 at 8 kg', s.active.log[4][1].b === '15' && /Strong today\. Next time, 10 kg\./.test(said) && /Set 3: 8 kg × 14/.test(await p.locator('.trynow').innerText()), s.active.log[4][1].b + ' | ' + said);
  // Use it on Shoulder press (Bar +): last 10,9 kg each side
  await p.click('[data-ex="3"]'); await p.waitForTimeout(200);
  line = await p.locator('.trynow').innerText();
  ok('Bar +: "Today, try bar + 10 kg each side × 11"', /Today, try bar \+ 10 kg each side × 11/.test(line), line);
  await p.click('[data-tryuse]'); await p.waitForTimeout(150);
  ok('Use it fills both boxes', /10/.test(await p.locator('.field[data-f="a"]').innerText()) && /11/.test(await p.locator('.field[data-f="b"]').innerText()));
  await p.click('[data-next]'); await p.waitForTimeout(200);
  s = await st(); ok('…and logs b+10 × 11', JSON.stringify(s.active.log[3]) === JSON.stringify([{ a: 'b+10', b: '11' }]), JSON.stringify(s.active.log[3]));
  // lat pulldown has only one time before: no suggestion, last time's hint as before
  await p.click('[data-ex="2"]'); await p.waitForTimeout(200);
  ok('done once before → no "Today, try", the "last 30" hint as before', await p.locator('.trynow').count() === 0 && /last 30/.test(await p.locator('.field[data-f="a"]').innerText()));
  await p.evaluate(async () => { const M = await import('./js/store.js'); M.get().active = null; M.save(); });
  // Yellow day
  await toWk('yellow'); await p.click('[data-ex="4"]'); await p.waitForTimeout(200);
  line = await p.locator('.trynow').innerText();
  ok('Yellow day: "Today, try 8 kg × 10 · Yellow day: same as last time"', /Today, try 8 kg × 10/.test(line) && /Yellow day: same as last time/.test(line), line);
  await p.evaluate(async () => { const M = await import('./js/store.js'); M.get().active = null; M.get().weightUnit = 'lb'; M.get().lbAsked = true; M.save(); });
  // in lb
  await toWk('green'); await p.click('[data-ex="4"]'); await p.waitForTimeout(200);
  line = await p.locator('.trynow').innerText();
  ok('in lb: "Today, try 17.6 lb × 11"', /Today, try 17\.6 lb × 11/.test(line), line);
  await p.click('[data-tryuse]'); await p.waitForTimeout(100); await p.click('[data-next]'); await p.waitForTimeout(200);
  s = await st(); ok('…and it saves exactly 8 kg (no 17.6 lb → 7.98 kg creep)', s.active.log[4][0].a === '8', JSON.stringify(s.active.log[4]));
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('todaytry: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
