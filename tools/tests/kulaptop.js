// v119: Keep it up on a laptop. (1) Across a whole wide screen the ball flew sideways ~1,800 px/s while the pillow stayed
// 170 px wide: now it plays in a phone-width column in the middle. (2) After the first bounce the ball turned dark and
// see-through (the faint score number's fill leaked into the emoji): it stays bright. (3) "Best" readable in Cosy dark.
// Phones are unchanged. Throwaway profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/kulaptop.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
const game = p => p.evaluate(() => { const g = document.querySelector('main').__game(); return { s: { x: g.s.x, y: g.s.y, n: g.s.n, dead: g.s.dead, px: g.s.px }, d: g.d }; });
// how bright the ball is: the brightest quarter of pixels in a box around it, minus the background there
const glow = (p, x, y, r) => p.evaluate(([x, y, r]) => { const c = document.getElementById('ku'), k = c.width / innerWidth, g = c.getContext('2d');
  const d = g.getImageData(Math.round((x - r) * k), Math.round((y - r) * k), Math.round(2 * r * k), Math.round(2 * r * k)).data, L = [];
  for (let i = 0; i < d.length; i += 4) L.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]); L.sort((a, b) => b - a);
  const top = L.slice(0, Math.max(1, L.length >> 2)), bg = L.slice(-Math.max(1, L.length >> 3));
  return top.reduce((a, b) => a + b, 0) / top.length - bg.reduce((a, b) => a + b, 0) / bg.length; }, [x, y, r]);
async function open(b, w, h, dark) {
  const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(200);
  await p.evaluate(async d => { const S = await import('./js/store.js'), s = S.get(); s.newsSeen = 999; s.settings.theme = d ? 'dark' : 'light'; s.games = { keepup: { best: 16, runs: 3, emoji: '🥲' } }; S.save(); }, dark);
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/keepup'); await p.waitForTimeout(700);
  await p.evaluate(() => window.dispatchEvent(new Event('prequel-theme'))); await p.waitForTimeout(100);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, 1919, 917, true);
  let { d } = await game(p);
  ok('laptop: it plays in a column in the middle, 560 wide', d.PW === 560 && Math.abs(d.L - (1919 - 560) / 2) < 0.01 && d.R - d.L === 560, JSON.stringify({ PW: d.PW, L: d.L }));
  ok('laptop: "Best 16" is readable in Cosy dark', await p.evaluate(() => getComputedStyle(document.getElementById('kuBest')).color) !== 'rgb(35, 38, 47)');
  await p.click('#kuGo'); await p.waitForTimeout(150);
  let before = null, after = null, maxN = 0, inCol = true, died = false;
  for (let i = 0; i < 520; i++) {
    const { s } = await game(p); if (s.dead) { died = true; break; }
    if (s.x < d.L + d.r - 1 || s.x > d.R - d.r + 1 || s.px < d.L + d.pw / 2 - 1 || s.px > d.R - d.pw / 2 + 1) inCol = false;
    if (!before && s.n === 0 && s.y > 250 && s.y < 500) before = await glow(p, s.x, s.y, d.r);
    if (!after && s.n >= 1 && s.y > 250 && s.y < 500) { after = await glow(p, s.x, s.y, d.r); await p.screenshot({ path: OUT + '/ku-laptop.png' }); }
    maxN = s.n; await p.mouse.move(s.x + (i % 7 - 3) * 6, 600); await p.waitForTimeout(12);
  }
  ok('laptop: following the ball with the mouse keeps it up (8+ bounces)', maxN >= 8, maxN + (died ? ' then dropped' : ''));
  ok('laptop: the ball and pillow stay inside the column', inCol);
  ok('after the first bounce the ball is as bright as before (not faded)', before > 30 && after > before * 0.8, JSON.stringify({ before: Math.round(before), after: Math.round(after) }));
  await p.close();
  // a mouse held still where the ball lands catches it (no "right place but it falls through")
  p = await open(b, 1440, 900, false); d = (await game(p)).d;
  await p.click('#kuGo'); await p.waitForTimeout(50);
  const land = (await game(p)).s.x; // the first drop is nearly straight down
  await p.mouse.move(land, 600);
  let n1 = 0; for (let i = 0; i < 120; i++) { const { s } = await game(p); n1 = s.n; if (s.n >= 1 || s.dead) break; await p.waitForTimeout(16); }
  ok('a still mouse right under it catches the first drop', n1 === 1, String(n1));
  await p.close();
  // phones: unchanged
  p = await open(b, 390, 844, false); d = (await game(p)).d;
  ok('phone: the whole width, as before', d.PW === 390 && d.L === 0 && d.R === 390 && d.VX === 390 * 0.95, JSON.stringify({ PW: d.PW, L: d.L }));
  await p.close();
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('kulaptop: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
