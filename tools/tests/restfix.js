// v80: (1) a logged rest can be fixed (tap it: times, day, how you woke up), and its star follows;
// (2) Your wall's plans and phrase come back with a backup restore, and a damaged wall part is refused.
// Throwaway profile, made-up data only. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/restfix.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-02T13:00:00') });
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  // made up: logged 8 pm to 5 am by mistake (meant 6 am)
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    const s = new Date(2026, 10, 1, 20, 0).getTime(), e = new Date(2026, 10, 2, 5, 0).getTime();
    st.rests.push({ id: 'r1', date: '2026-11-02', start: s, end: e, feel: 'okay' });
    st.moments.push({ id: 'm1', area: 'rest', text: 'Rested 9 h, felt okay', date: '2026-11-02', ts: e, ref: 'r1' });
    st.wall = { plans: { '2026-12-03': [{ id: 'p1', t: 'APDS A2', ic: 'book', imp: true }] }, phrase: { '2026-12': 'MY DECEMBER ERA' }, made: {} };
    S.save(); document.querySelectorAll('.hello').forEach(x => x.remove());
  });
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/rest'); await p.waitForTimeout(500);
  ok('a logged rest can be tapped to fix it', await p.locator('[data-editrest="r1"]').count() === 1);
  await p.click('[data-editrest="r1"]'); await p.waitForTimeout(300);
  ok('it opens filled in (8:00 pm to 5:00 am, okay)', /Fix this rest/.test(await p.locator('#sheet h2').innerText()) && await p.inputValue('#rFrom') === '20:00' && await p.inputValue('#rTo') === '05:00' && await p.locator('#feelSeg [data-f="okay"][aria-pressed="true"]').count() === 1);
  await p.fill('#rTo', '06:00'); await p.click('#feelSeg [data-f="rested"]');
  await p.screenshot({ path: OUT + '/rf-sheet.png' });
  await p.click('#sheet [data-add]'); await p.waitForTimeout(300);
  let s = await st(); const r = s.rests.find(x => x.id === 'r1');
  ok('fixed in place: 8 pm to 6 am, 10 h, rested (no second rest)', s.rests.length === 1 && (r.end - r.start) === 10 * 3600e3 && r.feel === 'rested' && r.date === '2026-11-02');
  ok('its star in the sky follows', s.moments.find(m => m.ref === 'r1').text === 'Rested 10 h, felt rested');
  ok('the ring says 10 h', /10 h/.test(await p.locator('.ring svg').textContent()));
  await p.screenshot({ path: OUT + '/rf-after.png' });
  // the × still removes, not opens
  await p.click('[data-del="r1"]'); await p.waitForTimeout(300);
  ok('× still removes it', (await st()).rests.length === 0 && !(await p.locator('#sheet').count()));
  // Your wall in a backup
  const back = await p.evaluate(async () => { const S = await import('./js/store.js'); const json = S.exportJSON(); const c = S.checkBackup(json); if (!c.data) return { problem: c.problem };
    S.get().wall = { plans: {}, phrase: {}, made: {} }; S.save(); await S.restoreBackup(c.data, { withoutCopy: true }); const w = S.get().wall; return { plans: w.plans, phrase: w.phrase };
  });
  ok('a backup restore brings Your wall back (plans, stars, phrase)', back.plans && back.plans['2026-12-03'][0].t === 'APDS A2' && back.plans['2026-12-03'][0].imp === true && back.phrase['2026-12'] === 'MY DECEMBER ERA', JSON.stringify(back));
  const bad = await p.evaluate(async () => { const S = await import('./js/store.js'); const d = JSON.parse(S.exportJSON()); d.wall.plans['2026-12-03'] = 'oops'; return S.checkBackup(JSON.stringify(d)); });
  ok('a backup with a damaged Your wall part is refused whole', bad.problem === 'damaged' && bad.where === 'wall', JSON.stringify(bad));
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('restfix: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
