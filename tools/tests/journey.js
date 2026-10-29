// v66: Your journey (the preview card on Me and the full page), the workout length, and the new celebration pictures.
// Fictional data only, throwaway profiles.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/journey.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-25T11:00:00') });
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(2000); await p.mouse.click(5, 5); await p.waitForTimeout(400);

  // about five weeks of made-up moving (with one quiet week), a few nights, and lifts that grow
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    const T = (d, h) => new Date(d + 'T00:00:00').getTime() + h * 3600000;
    const gymDays = ['2026-09-22', '2026-09-24', '2026-09-26', '2026-10-01', '2026-10-03', '2026-10-13', '2026-10-15', '2026-10-17', '2026-10-20', '2026-10-22', '2026-10-24'];
    gymDays.forEach((d, i) => st.sessions.push({ id: 'g' + i, date: d, ts: T(d, 18), workoutId: 'uA', workoutName: 'Upper A', light: 'green', mins: i > 7 ? 55 + i : undefined,
      exercises: [{ key: 'curl', name: 'Biceps curl', swap: null, sets: [{ a: String(7.5 + Math.floor(i / 3) * 2.5), b: '12' }, { a: String(7.5 + Math.floor(i / 3) * 2.5), b: '10' }] },
        { key: 'lat', name: 'Lat pulldown', swap: null, sets: [{ a: String(30 + i * 2), b: '10' }] }, { key: 'chest', name: 'Chest press', swap: null, sets: [{ a: i > 8 ? 'b+1.25' : 'bar', b: '12' }] }] }));
    st.activities = [
      { id: 'a1', date: '2026-10-14', ts: T('2026-10-14', 19), type: 'badminton', mins: 60, f: { games: 6 } },
      { id: 'a2', date: '2026-10-21', ts: T('2026-10-21', 19), type: 'badminton', mins: 90, f: { games: 8 } },
      { id: 'a3', date: '2026-10-24', ts: T('2026-10-24', 8), type: 'walk', mins: 40, f: { dist: 3.5 } }];
    for (let i = 0; i < 10; i++) { const d = S.addDays('2026-10-25', -i); st.rests.push({ id: 'r' + i, date: d, start: T(d, -1), end: T(d, 7) }); }
    S.save();
  });

  // 1. Me: the preview card replaces the hill and the heaviest cards
  await p.goto(BASE + '#/me'); await p.waitForTimeout(500);
  ok('Me has the Your moving journey scene card', await p.locator('a.jscene').count() === 1 && /Your moving journey/.test(await p.locator('a.jscene').innerText()));
  ok('…with him on the hill and one line', /\d+ days moved in October · you just passed 10!/.test(await p.locator('a.jscene').innerText()) && /flagplant\.webp/.test(await p.locator('a.jscene image').getAttribute('href')), await p.locator('a.jscene').innerText());
  ok('…right after your goals', await p.evaluate(() => { const a = document.querySelector('a.jscene'), g = document.querySelector('[data-newgoal]'); return !!(g.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) && !(document.querySelector('.sharecta').compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING); }));
  ok('the old hill and "heaviest" cards are gone from Me', !/Your hill/.test(await p.locator('main').innerText()) && !/heaviest you've ever/.test(await p.locator('main').innerText()));
  await p.locator('a.jscene').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/jo-me.png' });

  // 2. the page
  await p.click('a.jscene'); await p.waitForTimeout(500);
  ok('it opens Your journey, with Me lit and a way back', /#\/journey/.test(p.url()) && /Your moving journey/.test(await p.locator('h1.jtitle').innerText()) && (await p.locator('nav.tabbar a[aria-current="page"]').innerText()) === 'Me' && /Me/.test(await p.locator('.top .back').innerText()));
  const chips = await p.locator('[data-jf]').allInnerTexts();
  ok('the filter: everything, gym, each activity (no sleep)', chips.join('|').replace(/[^\w|]/g, '') === 'Everything|Gym|Badminton|Walk', chips.join(' | '));
  const cards = await p.locator('.jcard').allInnerTexts();
  ok('Habit-style cards: a number, a unit, a short label', cards.length >= 4 && cards.every(c => /\d/.test(c) || /your usual days? to move/.test(c)), cards.join(' / ').replace(/\n/g, ' '));
  ok('no zeros, streaks, rates or averages anywhere', !/\b0\b|streak|rate|avg|average|unmet/i.test(await p.locator('main').innerText()));
  ok('no minutes-of-moving card (v73: a gym session\'s length isn\'t real when logged afterwards)', !cards.some(c => /of moving, where timed/.test(c)));
  ok('a quiet week is a rest week, taken kindly', cards.some(c => /rest week/.test(c)) && await p.locator('svg.jweeks .jrest').count() >= 1);
  ok('this week: seven days, today marked', await p.locator('.jwd').count() === 7 && await p.locator('.jwd.today').count() === 1);
  ok('the year of dots fills in', await p.locator('svg.jyear .jdot.on').count() >= 12);
  await p.locator('svg.jyear .jdot.on').last().click(); await p.waitForTimeout(150);
  ok('tapping a dot says what happened that day', /Gym|Walk|Badminton/.test(await p.locator('#jread').innerText()), await p.locator('#jread').innerText());
  await p.screenshot({ path: OUT + '/jo-top.png' });
  const lifts = await p.locator('.jlift').allInnerTexts();
  ok('your lifts: first → latest with a line', /Biceps curl\s*7\.5 kg → 15 kg/.test(lifts.join(' ')) && await p.locator('svg.jspark').count() === lifts.length, lifts.join(' / ').replace(/\n/g, ' '));
  ok('Bar + shows as bar + kg', /bar \+ 1\.25 kg/.test(lifts.join(' ')));
  ok('the hill: him walking, flags, numbers', /flagplant\.webp/.test(await p.locator('svg.jhill image').getAttribute('href')) && await p.locator('svg.jhill .jflag').count() >= 1 && /you just passed 10! · next flag at 25/.test(await p.locator('.jcap').innerText()));
  await p.locator('svg.jweeks').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/jo-mid.png' });
  await p.locator('svg.jhill').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/jo-bottom.png' });

  // filters change everything
  await p.click('[data-jf="badminton"]'); await p.waitForTimeout(300);
  const bc = (await p.locator('.jcard').allInnerTexts()).join(' / ');
  ok('Badminton: times, hours and games', /2\s*times/.test(bc) && /14\s*games/.test(bc) && await p.locator('.jlift').count() === 0, bc.replace(/\n/g, ' '));
  await p.click('[data-jf="gym"]'); await p.waitForTimeout(300);
  const gc = (await p.locator('.jcard').allInnerTexts()).join(' / ');
  ok('Gym: sessions, sets and your heaviest', /11\s*sessions/.test(gc) && /sets/.test(gc) && /heaviest/.test(gc), gc.replace(/\n/g, ' '));
  await p.screenshot({ path: OUT + '/jo-gym.png' });

  // between flags he's walking up
  await p.evaluate(async () => { const S = await import('./js/store.js'), st = S.get(); st.sessions.forEach(x => { if (x.date >= '2026-10-13') x.date = x.date.replace('2026-10-', '2026-09-0').replace(/09-0(\d\d)/, '09-$1'); }); S.save(); });
  await p.evaluate(async () => { const S = await import('./js/store.js'), st = S.get(); st.sessions.forEach((x, i) => { x.date = '2026-09-' + String(1 + i).padStart(2, '0'); }); S.save(); });
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/me'); await p.waitForTimeout(300);
  ok('between flags, he\'s walking up the hill', /climbing\.webp/.test(await p.locator('a.jscene image').getAttribute('href')) && /next flag at 25/.test(await p.locator('a.jscene').innerText()), await p.locator('a.jscene').innerText());
  await p.locator('a.jscene').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/jo-me-walk.png' });
  // passing a flag this week: he plants it
  await p.evaluate(async () => { const S = await import('./js/store.js'), st = S.get(); for (let i = 0; i < 11; i++) st.activities.push({ id: 'x' + i, date: '2026-10-' + String(10 + i).padStart(2, '0'), ts: i, type: 'walk', mins: 20 }); S.save(); });
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/me'); await p.waitForTimeout(400);
  ok('the week you pass a flag, he plants it', /flagplant\.webp/.test(await p.locator('a.jscene image').getAttribute('href')) && /you just passed 25!/.test(await p.locator('a.jscene').innerText()), await p.locator('a.jscene').innerText());
  await p.locator('a.jscene').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/jo-me-flag.png' });
  // the row on Move, and back goes to Move
  await p.goto(BASE + '#/move'); await p.waitForTimeout(400);
  if (await p.locator('.picker [data-picksave]').count()) { if ((await p.locator('[data-pick="gym"]').getAttribute('aria-pressed')) !== 'true') await p.click('[data-pick="gym"]'); await p.click('[data-picksave]'); await p.waitForTimeout(300); }
  await p.click('#sheet [data-close]').catch(() => {});
  ok('Move has a "Your moving journey" row', await p.locator('a[href="#/journey?from=move"]').count() === 1);
  await p.locator('a[href="#/journey?from=move"]').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/jo-movehub.png' });
  await p.click('a[href="#/journey?from=move"]'); await p.waitForTimeout(400);
  ok('opened from Move: Move stays lit and Back goes to Move', (await p.locator('nav.tabbar a[aria-current="page"]').innerText()) === 'Move' && /Move/.test(await p.locator('.top .back').innerText()));

  // 3. workout length: saved at Finish from start to your last set (+3 min), editable in Fix this workout
  await p.goto(BASE + '#/move'); await p.waitForTimeout(400);
  if (await p.locator('.picker [data-picksave]').count()) { if ((await p.locator('[data-pick="gym"]').getAttribute('aria-pressed')) !== 'true') await p.click('[data-pick="gym"]'); await p.click('[data-picksave]'); await p.waitForTimeout(300); }
  await p.click('#sheet [data-close]').catch(() => {});
  await p.click('[data-act="gym"]'); await p.waitForTimeout(300); await p.click('[data-start="uA"]'); await p.waitForTimeout(300);
  await p.clock.runFor(20 * 60000); await p.click('[data-same]').catch(() => {}); await p.waitForTimeout(150);
  await p.clock.runFor(25 * 60000); await p.click('[data-same]'); await p.waitForTimeout(150);
  await p.clock.runFor(60 * 60000); // forgot to tap Finish for an hour
  await p.click('[data-finish]'); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/jo-done.png' });
  ok('the done sheet shows him quietly proud (not jumping)', /quietyes\.webp/.test(await p.locator('#sheet img.him').getAttribute('src')));
  let s = (await st()).sessions.slice(-1)[0];
  ok('the workout\'s length: start to last set + 3 min, not the forgotten hour', s.mins === 48, String(s.mins));
  await p.click('#sheet [data-close]').catch(() => {});
  await p.evaluate(async id => { const D = await import('./js/screens/days.js'); D.editSession(document.querySelector('main'), id, () => {}); }, s.id); await p.waitForTimeout(300);
  ok('Fix this workout no longer shows how long (v73)', !(await p.locator('#sessMins').count()));
  await p.click('#sheet [data-o="save"]'); await p.waitForTimeout(300);
  ok('…and saving keeps the length quietly', (await st()).sessions.slice(-1)[0].mins === 48);
  // a workout logged for an earlier day gets no made-up length
  ok('the old jumping picture is gone from the app', !(await p.evaluate(async () => { const r = await fetch('sw.js'); return (await r.text()).includes("'cheer'"); })));

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no errors');
})();
