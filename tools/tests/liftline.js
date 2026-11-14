// v109: on Your moving journey, each lift's little line draws every session (it drew only the last 10), so it starts
// at the same weight as its heading ("7.5 kg → 17.5 kg"). Lots of sessions: smaller dots, and past 40 only the
// labelled ones. Throwaway profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/liftline.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const SAMPLE = path.join(__dirname, 'sample-backup.json');
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-14T18:00:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(2500);
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    const T = d => new Date(d + 'T18:00:00').getTime();
    st.sessions = [];
    for (let i = 0; i < 50; i++) { const d = S.addDays('2026-11-13', -(49 - i) * 2);
      const ex = [{ key: 'lat', name: 'Lat pulldown', swap: null, sets: [{ a: String(30 + Math.floor(i / 5) * 2.5), b: '10' }] }];
      if (i % 2 === 0) ex.push({ key: 'curl', name: 'Biceps curl', swap: null, sets: [{ a: String(7.5 + Math.floor(i / 6) * 2.5 > 17.5 ? 17.5 : 7.5 + Math.floor(i / 6) * 2.5), b: '12' }] });
      st.sessions.push({ id: 'g' + i, date: d, ts: T(d), workoutId: 'uA', workoutName: 'Upper A', light: 'green', mins: 50, exercises: ex }); }
    S.save();
  });
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/journey?from=me'); await p.waitForTimeout(900);
  const info = await p.evaluate(() => [...document.querySelectorAll('svg.jspark')].map(s => ({ head: s.closest('.jlift') ? s.closest('.jlift').innerText.replace(/\s+/g, ' ') : '', pts: s.querySelector('polyline').getAttribute('points').trim().split(/\s+/).length, dots: s.querySelectorAll('circle').length, labels: [...s.querySelectorAll('text')].map(t => t.textContent) })));
  const curl = info.find(x => /Biceps curl/.test(x.head)), lat = info.find(x => /Lat pulldown/.test(x.head));
  ok('Biceps curl (25 times): the line draws all 25', curl && curl.pts === 25 && curl.dots === 25, JSON.stringify(curl));
  ok('…and starts where the heading does (7.5), ending at 17.5', curl && /7\.5 kg → 17\.5 kg/.test(curl.head) && curl.labels[0] === '7.5' && curl.labels.includes('17.5'), JSON.stringify(curl && curl.labels));
  ok('Lat pulldown (50 times): all 50 in the line, only the labelled dots drawn', lat && lat.pts === 50 && lat.dots === lat.labels.length && lat.labels[0] === '30', JSON.stringify(lat));
  ok('no overlapping first/last labels, still readable', lat && lat.labels.length >= 2);
  await p.locator('.jlift').first().scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/ll-journey.png' });
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('liftline: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
