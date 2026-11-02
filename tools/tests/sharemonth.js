// v85: the My month share card can show any month with something in it (it only ever showed this month, so on
// 1 November October seemed to vanish). Throwaway profile, a made-up October and a little of November.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/sharemonth.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-02T14:00:00') });
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    for (let d = 1; d <= 31; d += 2) { const k = '2026-10-' + String(d).padStart(2, '0'), ts = new Date(k + 'T09:00:00').getTime();
      st.sessions.push({ id: 's' + d, date: k, ts, workoutId: 'fbA', workoutName: 'Full Body A', exercises: [] });
      st.moments.push({ id: 'm' + d, area: 'move', text: 'Full Body A', date: k, ts });
      st.weather.push({ id: 'w' + d, date: k, ts, types: ['Clear sun'] }); }
    st.rests.push({ id: 'r1', date: '2026-11-01', start: 1, end: 2, feel: 'rested' });
    st.moments.push({ id: 'mx', area: 'rest', text: 'Rested', date: '2026-11-01', ts: 5 });
    st.weather.push({ id: 'wa', date: '2026-08-10', ts: 1, types: ['Drizzle'] });
    S.save(); document.querySelectorAll('.hello').forEach(e => e.remove());
  });
  await p.goto(BASE + '#/me'); await p.goto(BASE + '#/share?t=month'); await p.waitForTimeout(1500);
  const chips = await p.locator('[data-mm]').allInnerTexts();
  ok('My month lists this month and every month with something in it, newest first', JSON.stringify(chips) === '["November 2026","October 2026","August 2026"]', JSON.stringify(chips));
  ok('it opens on this month', (await p.locator('[data-mm="2026-11"]').getAttribute('aria-pressed')) === 'true');
  const nov = await p.evaluate(() => document.getElementById('card').toDataURL('image/png'));
  await p.click('[data-mm="2026-10"]'); await p.waitForTimeout(500);
  const oct = await p.evaluate(() => document.getElementById('card').toDataURL('image/png'));
  ok('tapping October draws October', (await p.locator('[data-mm="2026-10"]').getAttribute('aria-pressed')) === 'true' && oct !== nov);
  fs.writeFileSync(OUT + '/card-month-oct.png', Buffer.from(oct.split(',')[1], 'base64'));
  await p.screenshot({ path: OUT + '/sh-month.png' });
  await p.click('[data-look-i="1"]'); await p.waitForTimeout(300);
  ok('another look keeps October', (await p.locator('[data-mm="2026-10"]').getAttribute('aria-pressed')) === 'true');
  await p.click('[data-kind="sky"]').catch(() => {}); await p.waitForTimeout(200);
  ok('the month buttons only show on My month', await p.locator('[data-mm]').count() === 0 || await p.locator('.milepick').isHidden());
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('sharemonth: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
