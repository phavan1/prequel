// v102: Keep it up is slower, the pillow glides, a finger drags from anywhere (no jumps), and a laptop can play with
// the mouse or by holding ← → / A D. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/kuctl.js
const { chromium, devices } = require('playwright');
const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  // a laptop
  let p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
  await p.evaluate(async () => { const S = await import('./js/store.js'); S.get().newsSeen = 999; S.get().settings.areasAsked = true; S.save(); document.querySelectorAll('.hello').forEach(e => e.remove()); });
  await p.goto(BASE + '#/keepup'); await p.waitForTimeout(600);
  ok('laptop: the start screen says mouse or ← → / A D', /Move your mouse, or hold ← → \(or A and D\)/.test(await p.locator('#kuOver').innerText()));
  const d = await p.evaluate(() => document.querySelector('main').__game().d);
  ok('slower: the rise takes 0.85 s (was 0.62 s)', Math.abs(d.V0 / d.G - 0.85) < 0.01, (d.V0 / d.G).toFixed(2));
  await p.keyboard.press('Space'); await p.waitForTimeout(200);
  const g = () => p.evaluate(() => document.querySelector('main').__game().s);
  const x0 = (await g()).px; await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(250); const x1 = (await g()).px; await p.waitForTimeout(150); const x2 = (await g()).px; await p.keyboard.up('ArrowLeft');
  ok('holding ← glides the pillow left, steadily', x1 < x0 - 40 && x2 < x1 - 20, [x0, x1, x2].map(Math.round).join(' → '));
  await p.keyboard.down('KeyD'); await p.waitForTimeout(300); const x3 = (await g()).px; await p.keyboard.up('KeyD');
  ok('D moves it right', x3 > x2 + 40, Math.round(x2) + ' → ' + Math.round(x3));
  if ((await g()).dead) { await p.click('#kuGo'); await p.waitForTimeout(150); } // it may have dropped while we tested the keys
  await p.mouse.move(300, 600); await p.waitForTimeout(300);
  ok('the mouse: the pillow follows it', Math.abs((await g()).px - 300) < 30, String(Math.round((await g()).px)));
  await p.context().close();
  // a phone: a finger drags from anywhere
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
  await p.evaluate(async () => { const S = await import('./js/store.js'); S.get().newsSeen = 999; S.get().settings.areasAsked = true; S.save(); document.querySelectorAll('.hello').forEach(e => e.remove()); });
  await p.goto(BASE + '#/keepup'); await p.waitForTimeout(600);
  ok('phone: the start screen says slide your finger anywhere', /Slide your finger anywhere/.test(await p.locator('#kuOver').innerText()));
  await p.click('#kuGo'); await p.waitForTimeout(150);
  const px0 = (await p.evaluate(() => document.querySelector('main').__game().s)).px;
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: 300 }] });
  await touch('touchStart', 40); await p.waitForTimeout(80);
  const pxDown = (await p.evaluate(() => document.querySelector('main').__game().s)).px;
  for (let x = 40; x <= 100; x += 10) { await touch('touchMove', x); await p.waitForTimeout(30); }
  await p.waitForTimeout(200); const pxMoved = (await p.evaluate(() => document.querySelector('main').__game().s)).px; await touch('touchEnd');
  ok('touching far from the pillow doesn\'t make it jump there', Math.abs(pxDown - px0) < 5, Math.round(px0) + ' → ' + Math.round(pxDown));
  ok('dragging 60 px moves it 60 px', Math.abs((pxMoved - px0) - 60) < 8, Math.round(px0) + ' → ' + Math.round(pxMoved));
  ok('the game canvas takes every touch (no scrolling or zooming)', await p.evaluate(() => getComputedStyle(document.getElementById('ku')).touchAction) === 'none');
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('kuctl: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
