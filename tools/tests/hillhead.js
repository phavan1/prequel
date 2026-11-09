// v100: on Your moving journey's hill, his head (and every flag number) stays inside the picture, wherever he is on
// the hill: the picture grows upward to fit. Checks 3, 10 (planting a flag), 20, 24 and 60 things done.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/hillhead.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  for (const n of [3, 10, 20, 24, 60]) {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.clock.install({ time: new Date('2026-11-09T12:00:00') });
    await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
    await p.evaluate(async n => { const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
      for (let i = 0; i < n; i++) { const d = S.addDays('2026-11-08', -i * (n === 10 ? 0.5 : 2) | 0); st.sessions.push({ id: 's' + i, date: d, ts: new Date(d + 'T09:00').getTime() + i, workoutId: 'a', workoutName: 'A', exercises: [] }); }
      S.save(); document.querySelectorAll('.hello').forEach(e => e.remove()); }, n);
    for (const r of ['journey?from=me', 'me']) {
      await p.goto(BASE + '#/days'); await p.goto(BASE + '#/' + r); await p.waitForTimeout(700);
      const sel = r === 'me' ? 'svg.jscenehill' : '.card svg.jhill';
      const m = await p.evaluate(s => { const v = document.querySelector(s); if (!v) return null; const vb = v.viewBox.baseVal, out = []; v.querySelectorAll('image, text').forEach(e => { const bb = e.getBBox(); out.push(bb.y); }); return { top: vb.y, min: Math.min(...out) }; }, sel);
      ok(n + ' done, ' + (r === 'me' ? 'Me' : 'journey') + ': his head and the flag numbers are inside the picture', m && m.min >= m.top - 0.5, JSON.stringify(m));
      if (n === 20) await p.locator(sel).screenshot({ path: OUT + '/hill-' + n + '-' + (r === 'me' ? 'me' : 'journey') + '.png' });
    }
    await p.context().close();
  }
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('hillhead: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
