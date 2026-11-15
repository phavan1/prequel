// v115: seeing a lantern float up. After "Let it go" on Mind, the bar offers "Watch it rise" (and still "Bring back"):
// it opens your sky on that lantern and you watch it climb. And whenever you open the sky with a lantern let go since
// your last look, the sky starts on it, so it doesn't rise somewhere off-screen in a busy sky.
// Uses the sample backup (a full sky). Throwaway profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/lanternrise.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const SAMPLE = path.join(__dirname, 'sample-backup.json');
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
// where the lantern body is on the canvas: its warm paper colour (#FFC98A), as the middle of those pixels
const findLantern = p => p.evaluate(() => { const c = document.getElementById('sky'), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data; let n = 0, sy = 0, sx = 0;
  for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 255) < 6 && Math.abs(d[i + 1] - 201) < 8 && Math.abs(d[i + 2] - 138) < 10) { const k = i / 4; sx += k % c.width; sy += Math.floor(k / c.width); n++; }
  return n ? { x: sx / n / c.width, y: sy / n / c.height, n } : null; });
async function letGo(p, text) {
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/mind'); await p.waitForTimeout(500);
  await p.fill('#jot', text); await p.click('[data-jot]'); await p.waitForTimeout(300);
  await p.locator('.sticky', { hasText: text }).locator('[data-letgo]').click(); await p.waitForTimeout(300);
}
async function watchRise(p, label) {
  const seen = []; for (let i = 0; i < 7; i++) { await p.waitForTimeout(i ? 700 : 400); seen.push(await findLantern(p)); if (i === 2) await p.screenshot({ path: OUT + '/rise-' + label + '.png' }); }
  const ys = seen.filter(Boolean).map(s => s.y);
  return { seen, rose: ys.length >= 5 && ys[0] - ys[ys.length - 1] > 0.2, onScreen: seen.filter(Boolean).every(s => s.x > 0.05 && s.x < 0.95 && s.y > 0.05 && s.y < 0.95) };
}
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(2500);
  await p.evaluate(async () => { const S = await import('./js/store.js'), s = S.get(); s.newsSeen = 999; s.mind = (s.mind || []).filter(n => !n.letGo); S.save(); });
  await p.goto(BASE + '#/sky'); await p.waitForTimeout(1000); // you've looked at your sky before

  await letGo(p, 'That awkward meeting');
  const snack = p.locator('#snack.show');
  ok('after Let it go, the bar offers Watch it rise and Bring back', /Watch it rise/.test(await snack.innerText()) && /Bring back/.test(await snack.innerText()));
  await p.waitForTimeout(2600); await p.screenshot({ path: OUT + '/rise-bar.png' }); // after the 'Put down' toast has gone
  await snack.locator('[data-watch]').click(); await p.waitForTimeout(200);
  ok('Watch it rise opens your sky, with Back to Mind', /#\/sky\?from=mind&lantern=/.test(p.url()) && /Mind/.test(await p.locator('.sky-top .back').innerText()) && !(await p.locator('#snack.show').count()));
  let w = await watchRise(p, 'watch');
  ok('…and you see that lantern float up, on screen the whole way', w.rose && w.onScreen, JSON.stringify(w.seen.map(s => s && s.y.toFixed(2))));
  await p.waitForTimeout(2500); const settled = await findLantern(p);
  ok('…then it stays up there in your sky', settled && Math.abs(settled.y - w.seen[w.seen.length - 1].y) < 0.06);
  await p.click('.sky-top .back'); await p.waitForTimeout(400);
  ok('Back takes you to Mind', /#\/mind/.test(p.url()));

  // didn't tap Watch it rise: the next time you open your sky (from Home), it starts on the new lantern
  await letGo(p, 'The parking ticket');
  await p.goto(BASE + '#/home'); await p.waitForTimeout(500); await p.goto(BASE + '#/sky'); 
  w = await watchRise(p, 'home');
  ok('opening the sky later still shows a new lantern rising, on screen', w.rose && w.onScreen, JSON.stringify(w.seen.map(s => s && s.y.toFixed(2))));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(300); await p.goto(BASE + '#/sky');
  w = await watchRise(p, 'again');
  ok('…but only once: next visit it is already up', !w.rose);

  // Bring back still works from the bar
  await letGo(p, 'Sent the wrong email');
  await p.locator('#snack.show [data-back]').click(); await p.waitForTimeout(300);
  const s = await p.evaluate(async () => (await import('./js/store.js')).get().mind.find(n => n.text === 'Sent the wrong email'));
  ok('Bring back on the bar still puts it on the board', s && !s.letGo);
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('lanternrise: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
