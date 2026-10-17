// v37: Quick session on Move: with sets and reps (pick as you go), without reps (tick list), "Same as last time",
// and the Days card for a ticked session. Fictional data only, in a throwaway browser profile.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/quick.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.clock.install({ time: new Date('2026-10-14T18:00:00') });
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  // v48: Move opens on the hub. Pick Gym once in the first-time picker, then open the Gym tile
  const toGym = async (pg = p) => { if (await pg.locator('.picker [data-picksave]').count()) { if ((await pg.locator('[data-pick="gym"]').getAttribute('aria-pressed')) !== 'true') await pg.click('[data-pick="gym"]'); await pg.click('[data-picksave]'); await pg.waitForTimeout(300); } if (await pg.locator('[data-act="gym"]').count()) { await pg.click('[data-act="gym"]'); await pg.waitForTimeout(300); } };
  await p.goto(BASE + '#/move'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(800); await toGym();
  await p.screenshot({ path: OUT + '/q-move.png' });
  ok('Quick session button on Move', await p.locator('[data-quick]').count() === 1);

  // 1. without reps: tick what you did
  await p.click('[data-quick]'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/q-ask.png' });
  ok('no "same as last time" before any session', await p.locator('[data-q="same"]').count() === 0);
  await p.click('[data-q="tick"]'); await p.waitForTimeout(300);
  await p.click('[data-ticklog]'); await p.waitForTimeout(200);
  ok('logging nothing asks gently for one tick', /Tick at least one/.test(await p.locator('#sheet').innerText()));
  for (const k of ['legpress', 'chest', 'lat']) { await p.click('[data-tick="' + k + '"]'); await p.waitForTimeout(120); }
  await p.fill('#tkNew', 'Rowing machine'); await p.click('[data-ticknew]'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/q-tick.png' });
  await p.click('[data-ticklog]'); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/q-tick-done.png' });
  let s = await st();
  const t = s.sessions[0];
  ok('ticked session saved with 4 exercises and no sets', t && t.noReps === 1 && t.exercises.length === 4 && t.exercises.every(x => x.sets.length === 0), t && t.exercises.map(x => x.name).join(', '));
  ok('it counts and adds a star', s.sessions.length === 1 && s.moments.some(m => m.ref === t.id && m.text === 'Quick session · 4 exercises'));
  ok('the choice is remembered', s.quickMode === 'tick');
  await p.click('#sheet [data-close]');

  // 2. the Days card: "what ›" opens the ticked list; taking one off keeps the rest
  await p.goto(BASE + '#/days'); await p.waitForTimeout(600);
  await p.click('[data-day="2026-10-14"]'); await p.waitForTimeout(300);
  await p.click('[data-open="move"]'); await p.waitForTimeout(300);
  ok('Days shows "what ›" for a ticked session', /what ›/.test(await p.locator('main').innerText()));
  await p.locator('[data-sess]').first().click(); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/q-days-ticked.png' });
  await p.click('[data-tkrm="3"]'); await p.waitForTimeout(150); await p.click('#sheet [data-o="save"]'); await p.waitForTimeout(300);
  s = await st();
  ok('taking one off keeps the other three', s.sessions[0].exercises.length === 3 && s.moments.some(m => m.text === 'Quick session · 3 exercises'));

  // 3. with sets and reps: pick the first exercise, log, add another as you go
  await p.goto(BASE + '#/move'); await p.waitForTimeout(500); await toGym();
  await p.click('[data-quick]'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/q-ask-again.png' });
  ok('last answer is highlighted', await p.locator('[data-q="tick"].cur').count() === 1);
  ok('"Same as last time" is offered', await p.locator('[data-q="same"]').count() === 1);
  await p.click('[data-q="reps"]'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/q-first.png' });
  ok('recent exercises come first', /^recent/i.test((await p.locator('#sheet .lbl').first().innerText()).trim()));
  await p.click('[data-first="chest"]'); await p.waitForTimeout(500);
  for (const k of ['4', '0', 'next', '1', '0']) { if (k === 'next') await p.click('[data-next]'); else await p.locator('[data-k="' + k + '"]').dispatchEvent('pointerdown'); await p.waitForTimeout(60); }
  await p.click('[data-next]'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/q-reps.png' });
  await p.click('[data-addex]'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/q-addex.png' });
  ok('no "keep it in this workout" box in a quick session', await p.locator('#keepIt').count() === 0);
  await p.click('[data-pickex="lat"]'); await p.waitForTimeout(300);
  await p.click('[data-finish]'); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/q-reps-done.png' });
  s = await st();
  const r = s.sessions[1];
  ok('with-numbers quick session saved', r && r.workoutId === 'quick' && r.exercises.length === 1 && r.exercises[0].sets[0].a === '40' && r.exercises[0].sets[0].b === '10' && !r.noReps);
  ok('nothing was added to a saved workout', !s.workoutAdds.quick && s.customWorkouts.length === 0);
  await p.click('#sheet [data-close]');

  // 4. same as last time repeats the last session's exercises, with numbers
  await p.click('[data-quick]'); await p.waitForTimeout(300); await p.click('[data-q="same"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/q-same.png' });
  s = await st();
  ok('"Same as last time" starts with the same exercises', s.active && s.active.items.map(x => x[0]).join() === 'chest');
  await p.click('[data-leave]'); await p.waitForTimeout(200); await p.click('[data-o="discard"]'); await p.waitForTimeout(300);

  // 5. the planned workouts still start as before
  await p.click('[data-start="fbA"]'); await p.waitForTimeout(400);
  s = await st(); ok('planned workouts still work', s.active && s.active.id === 'fbA' && !s.active.quick);
  await p.click('[data-addex]'); await p.waitForTimeout(300);
  ok('"keep it" box still there for planned workouts', await p.locator('#keepIt').count() === 1);

  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
