// v117: the hill shows the stretch he's already walked as a worn, sandy track (under the dotted path), from the
// start to his feet; what's ahead stays plain dotted grass. On Me's journey card and on Your moving journey.
// Uses the sample backup plus made-up rep days. Throwaway profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/hillwalk.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const SAMPLE = path.join(__dirname, 'sample-backup.json');
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
const measure = (p, sel) => p.evaluate(sel => { const svg = document.querySelector(sel); if (!svg) return null; const t = svg.querySelector('.jtrod'), e = svg.querySelector('.jtrodedge'), d = svg.querySelector('.jpath'), im = svg.querySelector('image');
  if (!t) return { none: true }; const pts = s => s.getAttribute('d').slice(1).split('L').map(q => q.trim().split(/\s+/).map(Number));
  const tp = pts(t), dp = pts(d), kids = [...svg.children];
  return { x0: tp[0][0], y0: tp[0][1], x1: tp[tp.length - 1][0], y1: tp[tp.length - 1][1], start: dp[0], end: dp[dp.length - 1], him: +im.getAttribute('x') + +im.getAttribute('width') / 2, himFeet: +im.getAttribute('y') + +im.getAttribute('height') - 2,
    under: kids.indexOf(t) < kids.indexOf(d), edge: !!e && kids.indexOf(e) > kids.indexOf(d), colour: getComputedStyle(t).stroke, w: getComputedStyle(t).strokeWidth }; }, sel);
async function withDays(b, n, dark) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-16T06:00:00+11:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(2500);
  await p.evaluate(async ([n, dark]) => { const S = await import('./js/store.js'), s = S.get(); s.newsSeen = 999; s.settings.theme = dark ? 'dark' : 'light'; s.sessions = [];
    for (let i = 0; i < n; i++) { const dt = new Date(2026, 10, 16 - (n - 1 - i) * 2), k = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
      s.sessions.push({ id: 'z' + i, date: k, ts: dt.getTime(), workoutId: 'fbA', workoutName: 'Full Body A', exercises: [{ key: 'curl', name: 'Biceps curl', swap: null, sets: [{ a: '6', b: '10' }] }] }); } S.save(); }, [n, dark]);
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/me'); await p.waitForTimeout(900);
  await p.evaluate(() => { window.dispatchEvent(new Event('prequel-theme')); document.querySelectorAll('.hello').forEach(e => e.remove()); }); await p.waitForTimeout(200);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await withDays(b, 16, false);
  let m = await measure(p, '.jscene svg.jhill');
  ok('Me: a worn track from the start of the hill…', m && !m.none && Math.abs(m.x0 - m.start[0]) < 0.2 && Math.abs(m.y0 - m.start[1]) < 0.2, JSON.stringify(m));
  ok('…to his feet (not past him)', m && Math.abs(m.x1 - m.him) < 1.5 && Math.abs(m.y1 - m.himFeet) < 3 && m.x1 < m.end[0] - 20, JSON.stringify(m));
  ok('…under the dotted path, with a dotted edge on top, sandy and wide', m && m.under && m.edge && m.colour === 'rgb(217, 192, 143)' && m.w === '9px', JSON.stringify(m));
  await p.locator('.jscene').scrollIntoViewIfNeeded(); await p.locator('.jscene').screenshot({ path: OUT + '/hw-me.png' });
  await p.goto(BASE + '#/journey?from=me'); await p.waitForTimeout(700);
  m = await measure(p, 'main svg.jhill');
  ok('Your moving journey\'s hill has it too', m && !m.none && Math.abs(m.x1 - m.him) < 1.5, JSON.stringify(m));
  await p.locator('main svg.jhill').scrollIntoViewIfNeeded(); await p.locator('main svg.jhill').screenshot({ path: OUT + '/hw-page.png' });
  await p.close();
  // the week he plants a flag: the track reaches the flag he's holding
  p = await withDays(b, 10, false);
  m = await measure(p, '.jscene svg.jhill');
  const planted = await p.evaluate(() => !!document.querySelector('.jscene svg image[href*="flagplant"]'));
  ok('planting a flag: the track runs right up to him at the flag', planted && m && Math.abs(m.x1 - m.him) < 1.5, JSON.stringify(m));
  await p.close();
  p = await withDays(b, 16, true);
  m = await measure(p, '.jscene svg.jhill');
  ok('Cosy dark: the same sandy track', m && m.colour === 'rgb(217, 192, 143)');
  await p.locator('.jscene').scrollIntoViewIfNeeded(); await p.locator('.jscene').screenshot({ path: OUT + '/hw-me-dark.png' });
  await p.close();
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('hillwalk: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
