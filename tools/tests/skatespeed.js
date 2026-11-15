// v112: Skate home speeds up more gently (start 240, +4 a second, top 600 after about 90 s; it was 270 +9 to 760),
// and the game still starts, runs and ends. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/skatespeed.js
const { chromium } = require('playwright');
const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/skate'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  const v = await p.evaluate(async () => { const m = await import('./js/screens/skate.js'); return [0, 10, 30, 60, 90, 200].map(t => m.skateSpeed(t)); });
  ok('starts a little slower than before (240, was 270)', v[0] === 240, v.join(', '));
  ok('half a minute in: 360 (was 540)', v[2] === 360);
  ok('a minute in: 480 (was the 760 top)', v[3] === 480);
  ok('top speed 600, reached around 90 seconds, and it stays there', v[4] === 600 && v[5] === 600);
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/skate'); await p.waitForTimeout(800);
  await p.click('#skGo'); await p.waitForTimeout(2500);
  ok('the game still runs (start, a few seconds of skating)', await p.locator('canvas').count() >= 1 && errors.length === 0);
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('skatespeed: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
