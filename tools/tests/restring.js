// v70: the rest ring draws a night that goes past 12am all the way round (it showed just a dot before midnight),
// whole nights stay on the day you woke up, and the yellow "Logging for" chip is readable on the dark Rest page.
// Throwaway profile, made-up data only. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/restring.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
  // made up: last night 11:40 pm to 9:00 am, logged with Woke up; yesterday three short pieces
  await p.evaluate(async () => {
    const S = await import('./js/store.js'); const st = S.get(); st.newsSeen = 999;
    const t = S.today(), y = new Date(); y.setDate(y.getDate() - 1); const yk = S.dateKey(y);
    const at = (key, h, m) => { const d = new Date(key + 'T00:00:00'); d.setHours(h, m, 0, 0); return d.getTime(); };
    st.rests = [
      { id: 'n1', date: t, start: at(yk, 23, 40), end: at(t, 9, 0), feel: 'rested' },
      { id: 'y1', date: yk, start: at(yk, 0, 30), end: at(yk, 7, 30), feel: 'okay' },
      { id: 'y2', date: yk, start: at(yk, 8, 30), end: at(yk, 10, 0), feel: 'groggy' },
      { id: 'y3', date: yk, start: at(yk, 16, 30), end: at(yk, 17, 20), feel: 'okay' }];
    S.save(); window.__yk = yk;
  });
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/rest'); await p.waitForTimeout(700); await p.evaluate(() => document.querySelectorAll('.hello').forEach(e => e.remove()));
  const today = await p.evaluate(() => {
    const svg = document.querySelector('.ring svg'), cs = [...svg.querySelectorAll('circle')].slice(1);
    const R = 90, C = 2 * Math.PI * R; // how many hours of the clock are coloured
    return { hours: cs.reduce((n, c) => n + parseFloat(c.getAttribute('stroke-dasharray')) / C * 24, 0), text: svg.textContent };
  });
  ok('last night (11:40 pm to 9 am) stays on today, whole', /9 h 20 m/.test(today.text) && /rested(?!, in)/.test(today.text), today.text);
  ok('the ring is coloured all the way from 11:40 to 9, not just a dot', today.hours > 9.2 && today.hours < 9.5, today.hours.toFixed(2) + ' h of the clock');
  await p.screenshot({ path: OUT + '/rr-today.png' });
  // yesterday: the yellow chip is readable, and yesterday keeps its own three pieces
  await p.evaluate(() => { location.hash = '#/rest?d=' + window.__yk; }); await p.waitForTimeout(700);
  const chip = await p.evaluate(() => { const c = document.querySelector('.datechip'), b = c.querySelector('b'); return { bg: getComputedStyle(c).backgroundColor, fg: getComputedStyle(b).color, sp: getComputedStyle(c.querySelector('span')).color, txt: c.innerText }; });
  const lum = s => { const [r, g, bb] = s.match(/\d+/g).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * bb; };
  const contrast = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  ok('the yellow chip says Yesterday in dark, readable text', /Yesterday/.test(chip.txt) && contrast(chip.fg, chip.bg) > 7 && contrast(chip.sp, chip.bg) > 4.5, 'contrast ' + contrast(chip.fg, chip.bg).toFixed(1) + ' / ' + contrast(chip.sp, chip.bg).toFixed(1));
  const yt = await p.locator('.ring svg').textContent();
  ok('yesterday keeps its three pieces (none of last night)', /in 3 parts/.test(yt) && /9 h 20 m/.test(yt), yt);
  await p.screenshot({ path: OUT + '/rr-yesterday.png' });
  // the chip on a light page still looks the same
  await p.evaluate(() => { location.hash = '#/food?d=' + window.__yk; }); await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + '/rr-food-chip.png', clip: { x: 0, y: 0, width: 390, height: 120 } });
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('restring: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
