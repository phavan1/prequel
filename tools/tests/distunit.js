// v115: km or miles. One setting in Settings ("Distances in"), next to kg / lb. Walks, runs, rides and hikes are
// typed and shown in your unit (miles also turns a hike's climb into feet, and pace into per mile); the Slow ride
// counts in it too. Everything is still saved in km, so switching back and forth never changes a number you logged,
// and a distance milestone follows (100 km becomes 62.1 mi, and back to exactly 100).
// Throwaway profiles. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/distunit.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-AU', timezoneId: 'Australia/Sydney' });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-16T09:00:00+11:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  await p.evaluate(async () => { const S = await import('./js/store.js'), s = S.get(); s.newsSeen = 999; s.moveSetup = { picked: ['gym', 'run', 'hike'], custom: {} }; s.weightUnit = 'kg'; S.save(); });
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/settings'); await p.waitForTimeout(400);
  ok('Settings has km / miles beside kg / lb, km picked in Australia', /Weights and distances/i.test(await p.locator('main').innerText()) && await p.locator('.units2 [data-dunit]').count() === 2 && await p.locator('[data-dunit="km"][aria-pressed="true"]').count() === 1);

  const logOne = async (type, fill) => { await p.goto(BASE + '#/home'); await p.goto(BASE + '#/move'); await p.waitForTimeout(400); await p.click('[data-act="' + type + '"]'); await p.waitForTimeout(200); await p.click('#sheet [data-o="log"]'); await p.waitForTimeout(200); await fill(); await p.click('[data-alsave]'); await p.waitForTimeout(300); };
  await logOne('run', async () => { ok('in km, the distance box says km', await p.getAttribute('[data-fld="dist"]', 'placeholder') === 'km'); await p.click('[data-mins="30"]'); await p.fill('[data-fld="dist"]', '5'); });
  await logOne('hike', async () => { await p.fill('[data-fld="dist"]', '12'); await p.fill('[data-fld="climb"]', '400'); });
  let s = await st(); const run = s.activities.find(a => a.type === 'run');
  ok('saved in km', run.f.dist === 5 && s.activities.find(a => a.type === 'hike').f.climb === 400);
  const recent = async type => { await p.goto(BASE + '#/home'); await p.goto(BASE + '#/move'); await p.waitForTimeout(400); await p.click('[data-act="' + type + '"]'); await p.waitForTimeout(200); const t = await p.locator('#sheet .actrecent').innerText(); await p.click('#sheet [data-close]'); return t; };
  let t = await recent('run'); ok('the run reads 5 km, 6:00 per km', /5 km/.test(t) && /6:00 per km/.test(t), t);
  // a milestone in km
  await p.click('[data-act="run"]'); await p.waitForTimeout(200); await p.click('#sheet [data-o="mile"]'); await p.waitForTimeout(200);
  await p.click('[data-meas="dist"]'); await p.fill('#msN', '100'); await p.click('[data-mssave]'); await p.waitForTimeout(300);
  s = await st(); ok('a 100 km milestone', s.goals.some(g => g.source === 'act:run:dist' && g.target === 100));

  // switch to miles
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(300); await p.click('[data-dunit="mi"]'); await p.waitForTimeout(300);
  ok('switching says so', /Distances are now in miles/.test(await p.locator('body').innerText()) && await p.locator('[data-dunit="mi"][aria-pressed="true"]').count() === 1);
  await p.screenshot({ path: OUT + '/dist-settings.png' });
  t = await recent('run'); ok('now the run reads 3.11 mi, 9:39 per mi', /3\.11 mi/.test(t) && /9:39 per mi/.test(t), t);
  t = await recent('hike'); ok('the hike reads 7.46 mi and 1312 ft', /7\.46 mi/.test(t) && /1312 ft/.test(t), t);
  s = await st(); const ms = s.goals.find(g => g.source === 'act:run:dist');
  ok('the milestone follows: 62.1 mi, with 3.1 so far', ms.target === 62.1, JSON.stringify(ms));
  await p.click('[data-act="run"]'); await p.waitForTimeout(200);
  ok('…and reads that way', /Milestone: 3\.1 of 62\.1 mi/.test(await p.locator('#sheet').innerText()), await p.locator('#sheet .rowlink').innerText());
  // edit the run without touching the distance: still exactly 5 km
  await p.click('#sheet [data-entry]'); await p.waitForTimeout(200); await p.click('#sheet [data-o="edit"]'); await p.waitForTimeout(200);
  ok('editing shows the distance in miles', await p.inputValue('[data-fld="dist"]') === '3.11' && await p.getAttribute('[data-fld="dist"]', 'placeholder') === 'mi');
  await p.click('[data-feel="Good"]'); await p.click('[data-alsave]'); await p.waitForTimeout(300);
  s = await st(); ok('a distance you didn\'t change stays exactly 5 km', s.activities.find(a => a.id === run.id).f.dist === 5, JSON.stringify(s.activities.find(a => a.id === run.id).f));
  // a new run typed in miles
  await logOne('run', async () => { await p.fill('[data-fld="dist"]', '2'); await p.screenshot({ path: OUT + '/dist-log.png' }); });
  s = await st(); const r2 = s.activities.filter(a => a.type === 'run').sort((a, b) => b.ts - a.ts)[0];
  ok('2 mi typed is saved as 3.219 km', r2.f.dist === 3.219, JSON.stringify(r2.f));
  // the Slow ride
  await p.evaluate(async () => { const S = await import('./js/store.js'), s = S.get(); s.games = s.games || {}; s.games.road = { m: 5000 }; s.heavy[S.today()] = true; S.save(); }); // the games shelf shows on a hard day
  await p.goto(BASE + '#/me'); await p.goto(BASE + '#/home'); await p.waitForTimeout(400);
  const homeTxt = await p.locator('.games a[href^="#/road"]').innerText();
  await p.click('.games a[href^="#/road"]'); await p.waitForTimeout(1200);
  ok('the Slow ride rides in miles too', /^3\.1 mi$/.test(await p.locator('#rdKm').innerText()), await p.locator('#rdKm').innerText());
  ok('Home\'s Slow ride card says 3.1 mi ridden', /3\.1 mi ridden/.test(homeTxt), (homeTxt.match(/[\d.]+ \w+ ridden/) || [''])[0]);
  // back to km
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(300); await p.click('[data-dunit="km"]'); await p.waitForTimeout(300);
  s = await st(); ok('back to km: the milestone is exactly 100 again', s.goals.find(g => g.source === 'act:run:dist').target === 100);
  t = await recent('run'); ok('…and the runs read 5 km and 3.22 km', /\b5 km/.test(t) && /3\.22 km/.test(t), t);
  await ctx.close();

  // in the US the guess is miles, but someone who already logged distances keeps km
  const us = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', timezoneId: 'America/Chicago' });
  const q = await us.newPage(); q.on('pageerror', e => errors.push(e.message));
  await q.goto(BASE + '#/settings'); await q.waitForTimeout(1500); await q.mouse.click(5, 5); await q.waitForTimeout(300);
  ok('a new person in the US starts on miles', await q.locator('[data-dunit="mi"][aria-pressed="true"]').count() === 1);
  await q.evaluate(async () => { const S = await import('./js/store.js'), s = S.get(); s.newsSeen = 999; delete s.distUnit; s.activities = [{ id: 'a1', date: '2026-11-10', ts: 1, type: 'run', f: { dist: 5 } }]; S.save(); });
  await q.waitForTimeout(800); await q.reload(); await q.waitForTimeout(1500);
  const s2 = await q.evaluate(async () => (await import('./js/store.js')).get().distUnit);
  ok('…but someone who already logged a distance keeps km', s2 === 'km' && await q.locator('[data-dunit="km"][aria-pressed="true"]').count() === 1, String(s2));
  await us.close();
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('distunit: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
