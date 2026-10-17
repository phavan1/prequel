// v46: Cycle, an optional private period tracker on Days. Off by default; switched on from Days → ＋; mark days,
// flow as droplets, how you felt; a gentle estimate after two periods; never in the sky or on cards; in backups.
// Fictional data only, throwaway profiles.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/cycle.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-17T10:00:00') });
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  await p.goto(BASE + '#/days'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(500);

  // 1. off by default: no tab, nothing asked
  ok('no Cycle tab until you add it', await p.locator('[data-tab="cycle"]').count() === 0);
  await p.click('[data-addtab]'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/cy-addtab.png' });
  ok('Cycle is offered under More tabs, described as private', /Cycle\s*a private period tracker, just for you/.test(await p.locator('#sheet').innerText()));
  await p.click('[data-opt="cycle"]'); await p.waitForTimeout(300); await p.click('#sheet [data-close]'); await p.waitForTimeout(200);
  await p.click('[data-tab="cycle"]'); await p.waitForTimeout(300);
  ok('a kind start line', /Tap a day, then mark it as a period day/.test(await p.locator('.calsum').innerText()));
  await p.screenshot({ path: OUT + '/cy-empty.png' });

  // 2. mark a period over a few days in September, and one in October
  await p.click('[data-month="-1"]'); await p.waitForTimeout(200);
  for (const d of ['2026-09-19', '2026-09-20', '2026-09-21']) { await p.click('[data-day="' + d + '"]'); await p.click('[data-pon]'); await p.waitForTimeout(100); }
  await p.click('[data-flow="3"]'); await p.click('[data-cf="Cramps"]'); await p.waitForTimeout(150);
  await p.click('[data-month="1"]'); await p.waitForTimeout(200);
  for (const d of ['2026-10-16', '2026-10-17']) { await p.click('[data-day="' + d + '"]'); await p.click('[data-pon]'); await p.waitForTimeout(100); }
  await p.click('[data-flow="2"]'); await p.click('[data-cf="Tired"]'); await p.click('[data-cf="Low mood"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/cy-day.png' });
  let s = await st();
  ok('period days are saved with flow and feelings', s.cycleDays.filter(x => x.period).length === 5 && s.cycleDays.find(x => x.date === '2026-09-21').flow === 3 && s.cycleDays.find(x => x.date === '2026-10-17').feels.join() === 'Tired,Low mood');
  ok('the flow is shown as droplets, never "heavy"', await p.locator('.flowrow [data-flow="3"] .drops svg').count() === 3 && !/heavy/i.test(await p.locator('main').innerText()));

  // 3. the estimate: 27 days between starts → around 12 November, with a dashed ring there
  const sum = await p.locator('.calsum').innerText();
  ok('a gentle estimate after two periods', /might start around Thursday,? 12 November|might start around Thursday,? November 12/.test(sum), sum);
  ok('day of cycle shows on a day you haven\'t marked', await (async () => { await p.click('[data-day="2026-10-05"]'); await p.waitForTimeout(150); return /Day 17 of your cycle/.test(await p.locator('.pon').innerText()); })());

  // 4. a feeling on a non-period day is kept; unmarking a day with nothing else removes it
  await p.click('[data-cf="Headache"]'); await p.waitForTimeout(150);
  s = await st(); ok('a feeling on its own is kept (dashed ring, no period)', s.cycleDays.some(x => x.date === '2026-10-05' && !x.period && x.feels[0] === 'Headache') && await p.locator('.cal2.cy [data-day="2026-10-05"].lv1').count() === 1);
  await p.click('[data-cf="Headache"]'); await p.waitForTimeout(150);
  s = await st(); ok('taking it off leaves nothing behind', !s.cycleDays.some(x => x.date === '2026-10-05'));

  // 5. other tabs: a quiet row, no sky stars, nothing on the All count
  await p.click('[data-tab="all"]'); await p.click('[data-day="2026-10-17"]'); await p.waitForTimeout(200);
  ok('the day card shows a Period row on other tabs', /Period\s*medium, tired, low mood/i.test(await p.locator('.daycard').innerText()));
  ok('no stars in the sky from it', !s.moments.some(m => /period|cycle/i.test(m.text)));
  ok('the All calendar doesn\'t count it', await p.locator('.cal2 [data-day="2026-10-16"].lv0').count() === 1);

  // 6. switching the tab off keeps the data
  await p.click('[data-addtab]'); await p.waitForTimeout(200); await p.click('[data-opt="cycle"]'); await p.waitForTimeout(200); await p.click('#sheet [data-close]');
  s = await st(); ok('switching Cycle off hides it and keeps your data', await p.locator('[data-tab="cycle"]').count() === 0 && s.cycleDays.length === 5 && !/Period/.test(await p.locator('.daycard').innerText()));

  // 7. backups carry it and check it
  const chk = await p.evaluate(async () => { const S = await import('./js/store.js'); return [!!S.checkBackup(JSON.stringify({ v: 1, moments: [], cycleDays: [{ id: 'x', date: '2026-10-01', period: 1, flow: 0, feels: [] }] })).data, S.checkBackup(JSON.stringify({ v: 1, moments: [], cycleDays: [{ id: 'x', date: 'soon' }] })).problem]; });
  ok('backups: cycle days are checked like everything else', chk[0] === true && chk[1] === 'damaged', JSON.stringify(chk));

  await p.click('[data-addtab]'); await p.waitForTimeout(200); await p.click('[data-opt="cycle"]'); await p.waitForTimeout(200); await p.click('#sheet [data-close]');
  await p.click('[data-tab="cycle"]'); await p.waitForTimeout(200);
  await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await p.click('[data-day="2026-10-16"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/cy-dark.png' });

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.join('\n') || 'no errors');
})();
