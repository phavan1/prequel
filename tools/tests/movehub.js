// v48: Move for every kind of moving. The first-time picker (and the road-to-100 question), same-size tiles,
// logging a sport with its own fields, the timer, milestones (activity and gym), Me counts, Days, backups.
// Fictional data only, throwaway profiles.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/movehub.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-17T17:00:00') });
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  await p.goto(BASE + '#/move'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(500);

  // 1. a new person: asked once, nothing preselected, no road to 100
  await p.screenshot({ path: OUT + '/mh-picker.png' });
  ok('a new person is asked what gets them moving', /What gets you moving\?/.test(await p.locator('main').innerText()) && await p.locator('[data-pick="gym"][aria-pressed="false"]').count() === 1);
  ok('no road-to-100 question for a new person', await p.locator('[data-road]').count() === 0);
  await p.click('[data-picksave]'); await p.waitForTimeout(200);
  ok('picking nothing gets a kind nudge', /Pick at least one/.test(await p.locator('#pickErr').innerText()));
  for (const k of ['gym', 'walk', 'badminton', 'football']) await p.click('[data-pick="' + k + '"]');
  await p.click('[data-ownact]'); await p.waitForTimeout(150);
  await p.fill('#oaName', 'Bouldering'); await p.fill('#oaEmo', '🧗'); await p.fill('#oaUnit', 'Problems'); await p.click('[data-oaadd]'); await p.waitForTimeout(150);
  ok('your own activity joins the list, picked', await p.locator('.pickgrid [aria-pressed="true"]').filter({ hasText: 'Bouldering' }).count() === 1);
  await p.click('[data-picksave]'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/mh-hub.png' });
  const sizes = await p.locator('.acttile').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)));
  ok('five tiles, all the same size (gym too)', sizes.length === 5 && new Set(sizes).size === 1, sizes.join(' '));
  ok('How\'s the body sits on the hub', /How's the body\?/.test(await p.locator('main').innerText()) && await p.locator('main [data-light]').count() === 3);
  let s = await st(); ok('the choice is saved, with your own activity', s.moveSetup.picked.length === 5 && Object.values(s.moveSetup.custom)[0].n === 'Bouldering' && Object.values(s.moveSetup.custom)[0].unit === 'problems');

  // 2. log badminton: its own fields, a highlight
  await p.click('[data-act="badminton"]'); await p.waitForTimeout(200);
  await p.click('#sheet [data-o="log"]'); await p.waitForTimeout(200);
  await p.click('[data-mins="60"]'); await p.click('[data-feel="Good"]'); await p.click('[data-seg="kind"][data-v="Doubles"]');
  await p.fill('[data-fld="games"]', '6'); await p.fill('#alHl', 'that cross-court smash');
  await p.screenshot({ path: OUT + '/mh-log.png' });
  await p.click('[data-alsave]'); await p.waitForTimeout(300);
  s = await st(); const bd = s.activities[0];
  ok('badminton saves its own things', bd.type === 'badminton' && bd.mins === 60 && bd.feel === 'Good' && bd.f.kind === 'Doubles' && bd.f.games === 6 && bd.hl === 'that cross-court smash', JSON.stringify(bd));
  ok('it puts a star in the sky', s.moments.some(m => m.area === 'move' && m.ref === bd.id && /Badminton · 60 min/.test(m.text)));
  ok('the tile counts up', /1 time so far/.test(await p.locator('[data-act="badminton"]').innerText()));

  // 3. a timer: start, close the app, stop: the time is filled in
  await p.click('[data-act="walk"]'); await p.waitForTimeout(200); await p.click('#sheet [data-o="start"]'); await p.waitForTimeout(200);
  await p.clock.runFor(32 * 60000); await p.goto(BASE + '#/home'); await p.goto(BASE + '#/move'); await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/mh-timer.png' });
  ok('the timer survives leaving the page', /32 min so far/.test(await p.locator('.acttimer').innerText()));
  await p.click('[data-actstop]'); await p.waitForTimeout(200);
  ok('Stop opens the log sheet with the time in', await p.locator('#alMins').inputValue() === '32');
  await p.fill('[data-fld="dist"]', '2.4'); await p.click('[data-seg="where"][data-v="Outdoors"]'); await p.click('[data-alsave]'); await p.waitForTimeout(300);
  s = await st(); ok('the walk is saved and the timer cleared', s.activities.some(a => a.type === 'walk' && a.mins === 32 && a.f.dist === 2.4) && !s.actTimer);

  // 4. a milestone for football: goals
  await p.click('[data-act="football"]'); await p.waitForTimeout(200); await p.click('#sheet [data-o="mile"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/mh-mile.png' });
  await p.click('[data-meas="goals"]'); await p.fill('#msN', '10'); await p.click('[data-mssave]'); await p.waitForTimeout(200);
  await p.click('[data-act="football"]'); await p.click('#sheet [data-o="log"]'); await p.waitForTimeout(200);
  await p.click('[data-seg="kind"][data-v="Match"]'); await p.fill('[data-fld="goals"]', '2'); await p.fill('[data-fld="assists"]', '1'); await p.click('[data-alsave]'); await p.waitForTimeout(300);
  ok('the football tile shows the milestone counting up', /2 of 10 goals/.test(await p.locator('[data-act="football"]').innerText()));
  ok('the milestone is on Me too', await (async () => { await p.goto(BASE + '#/me'); await p.waitForTimeout(400); return /Football · goals/.test(await p.locator('main').innerText()); })());
  ok('Me counts how you\'ve moved, only above zero', /How you've moved/i.test(await p.locator('main').innerText()) && /badminton session/.test(await p.locator('main').innerText()) && !/bouldering/i.test(await p.locator('.movecounts').innerText()));

  // 5. the gym page: no lights there, its own milestone link
  await p.goto(BASE + '#/move'); await p.waitForTimeout(300); await p.click('[data-light="yellow"]'); await p.click('[data-act="gym"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/mh-gym.png' });
  ok('the gym page keeps the day\'s light but not the picker', await p.locator('main [data-light]').count() === 0 && /Yellow day/.test(await p.locator('.todaylight').innerText()) && /YELLOW DAY/.test(await p.locator('.sug').innerText()));
  ok('no road to 100 anywhere', !/road to 100|toward your 100/i.test(await p.locator('main').innerText()));
  await p.click('[data-gymmile]'); await p.waitForTimeout(200); await p.click('[data-meas="sessions"]'); await p.fill('#msN', '30'); await p.click('[data-mssave]'); await p.waitForTimeout(200);
  ok('a gym milestone shows on the gym page', /0 of 30 sessions|of 30 sessions/.test(await p.locator('.gymhead').innerText()));
  await p.click('[data-hub]'); await p.waitForTimeout(200);
  ok('back to the hub from the gym', await p.locator('.acttiles').count() === 1);

  // 6. Days: the activity shows and can be removed (the record goes too)
  await p.goto(BASE + '#/days'); await p.waitForTimeout(400); await p.click('[data-open="move"]'); await p.waitForTimeout(200);
  ok('Days lists the activities', /Badminton · 60 min/.test(await p.locator('.daycard').innerText()));
  await p.locator('.ditem', { hasText: 'Badminton' }).locator('[data-del]').click(); await p.click('#sheet [data-yes]'); await p.waitForTimeout(200);
  s = await st(); ok('removing it in Days removes the activity too', !s.activities.some(a => a.type === 'badminton'));

  // 7. someone who was on the road to 100: asked whether to keep it
  const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push(e.message)); await p2.clock.install({ time: new Date('2026-10-17T17:00:00') });
  await p2.goto(BASE + '#/home'); await p2.waitForTimeout(2600);
  await p2.evaluate(async () => { const S = await import('./js/store.js'), st = S.get(); delete st.moveSetup; st.activities = []; st.sessions = [{ id: 's1', date: '2026-10-16', ts: 1, workoutId: 'fbA', workoutName: 'Full Body A', light: 'green', exercises: [] }]; st.goals = [{ id: 'g1', kind: 'linked', source: 'sessions', name: 'Gym sessions', target: 100, from: 0, created: 1, finished: null }]; S.save(); });
  await p2.goto(BASE + '#/move'); await p2.waitForTimeout(500); await p2.mouse.click(5, 5); await p2.waitForTimeout(300);
  await p2.screenshot({ path: OUT + '/mh-road.png' });
  ok('an existing gym-goer starts with Gym picked and is asked about the road to 100', await p2.locator('[data-pick="gym"][aria-pressed="true"]').count() === 1 && /You were on the road to 100 gym sessions/.test(await p2.locator('.roadq').innerText()));
  await p2.click('[data-road="change"]'); await p2.fill('#roadN', '50'); await p2.click('[data-picksave]'); await p2.waitForTimeout(300);
  const s2 = await p2.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  ok('changing the number keeps the same milestone', s2.goals.length === 1 && s2.goals[0].target === 50 && /1 of 50 sessions/.test(await p2.locator('[data-act="gym"]').innerText()));

  // 8. backups carry activities and check them
  const chk = await p.evaluate(async () => { const S = await import('./js/store.js'); return [!!S.checkBackup(JSON.stringify({ v: 1, moments: [], activities: [{ id: 'x', date: '2026-10-01', ts: 1, type: 'walk', f: {} }] })).data, S.checkBackup(JSON.stringify({ v: 1, moments: [], activities: [{ id: 'x', date: 'later' }] })).problem]; });
  ok('backups: activities are checked like everything else', chk[0] === true && chk[1] === 'damaged', JSON.stringify(chk));

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.join('\n') || 'no errors');
})();
