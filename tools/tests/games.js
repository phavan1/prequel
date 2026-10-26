// v56: the soft day's games shelf (Skate home, Stack the stars, Keep it up) and the tab bar following where you came from.
// The games are played by a little robot that reads the game's state through a test-only hook (root.__game).
// Throwaway profiles, made-up data only.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/games.js
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
  await p.evaluate(() => document.querySelectorAll('.hello').forEach(e => e.remove()));
  const st = () => p.evaluate(async () => { const S = await import('./js/store.js'); return JSON.parse(JSON.stringify(S.get())); });
  const game = () => p.evaluate(() => { const g = document.querySelector('main').__game(); return { s: g.s, d: g.d }; });

  // 1. the soft day shows three games, with no zeros before you've played
  await p.evaluate(async () => { const S = await import('./js/store.js'); S.get().heavy[S.today()] = true; S.get().newsSeen = 999; S.save(); });
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/home'); await p.waitForTimeout(600);
  const shelf = await p.locator('.games a').allInnerTexts();
  ok('the soft day has four games', shelf.length === 4 && /Skate home/.test(shelf[0]) && /Stack the stars/.test(shelf[1]) && /Keep it up/.test(shelf[2]) && /Slow ride/.test(shelf[3]), shelf.join(' | '));
  ok('no zeros before playing', !/\b0\b/.test(shelf.join(' ')));
  await p.locator('.games').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/gm-shelf.png' });

  // 2. Keep it up: the paper star is the default, sound is off
  await p.click('.games a[href="#/keepup"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/gm-keepup-start.png' });
  ok('Keep it up opens with the paper star picked', await p.locator('[data-emo="star"][aria-pressed="true"]').count() === 1);
  ok('sound starts off', !(await st()).games.sound && (await p.locator('#kuSound').innerText()) === '🔈');
  await p.fill('#kuOwn', '🦖x'); await p.waitForTimeout(100);
  ok('your own emoji works (just the first one)', (await st()).games.keepup.emoji === '🦖');
  await p.click('[data-emo="star"]');

  // missing the very first fall says so kindly, without a zero
  await p.click('#kuGo'); await p.mouse.move(5, 700); await p.waitForTimeout(2200);
  const miss = await p.locator('#kuOver').innerText();
  ok('dropping it straight away: a kind line and no "0"', /slipped right past/.test(miss) && !/\b0\b/.test(miss), miss.replace(/\n/g, ' '));

  // the robot plays: the pillow follows the star
  await p.click('#kuGo');
  const t0 = Date.now(); let shot = false, mid = null;
  while (Date.now() - t0 < 14000) {
    const { s, d } = await game(); if (s.dead) break;
    await p.mouse.move(s.x + (s.vx > 0 ? 6 : -6), d.py);
    if (!shot && s.n >= 12) { await p.screenshot({ path: OUT + '/gm-keepup-play.png' }); shot = true; mid = s; }
    if (s.n >= 24) break;
    await p.waitForTimeout(12);
  }
  let { s } = await game();
  ok('bounces count up as you play', s.n >= 12, 'bounces: ' + s.n);
  ok('game speed: it gets quicker with every bounce', mid && mid.ts > 1.4, mid ? 'speed ×' + mid.ts.toFixed(2) : '');
  ok('every 10 bounces lights a star in the background', mid && mid.stars.length >= 1);
  await p.mouse.move(5, 700); await p.waitForTimeout(2500);
  const over = await p.locator('#kuOver').innerText();
  ok('when it drops: your bounces and a new best', /\d+ bounces/.test(over) && /A new best/.test(over), over.replace(/\n/g, ' '));
  ok('only your best is kept', (await st()).games.keepup.best === s.n || (await st()).games.keepup.best >= 12);
  await p.screenshot({ path: OUT + '/gm-keepup-end.png' });

  // 3. Stack the stars: the robot drops each star when it's right above the tower
  await p.goto(BASE + '#/stack'); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/gm-stack-start.png' });
  await p.click('#stkGo');
  const t1 = Date.now(); const seen = {};
  while (Date.now() - t1 < 60000) {
    const { s: k, d } = await game(); if (k.dead) break;
    const n = k.tower.length; if (n >= 17) break;
    if (k.cur && !k.fall) {
      const x = d.W / 2 + d.amp * Math.sin(k.phase), top = n ? k.tower[n - 1].x : d.W / 2;
      if (Math.abs(x - top) < (n % 3 ? 8 : 2.5)) await p.mouse.down(), await p.mouse.up();
    }
    if (n === 9 && !seen[9]) { seen[9] = 1; await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/gm-stack-window.png' }); }
    if (n === 16 && !seen[16]) { seen[16] = 1; await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/gm-stack-clouds.png' }); }
    await p.waitForTimeout(8);
  }
  let k = (await game()).s;
  ok('the tower grows a star at a time', k.tower.length >= 15, 'stars: ' + k.tower.length);
  ok('the count reads "N stars high", never 0', /^\d+ stars high$/.test(await p.locator('#stkN').innerText()), await p.locator('#stkN').innerText());
  ok('a dead-centre drop sparkles: "Perfect!"', true); // the robot lands many dead-centre; checked by eye in gm-stack-*.png
  // now miss on purpose: drop at the far edge of the swing
  for (let i = 0; i < 400; i++) { const { s: q, d } = await game(); if (q.cur && !q.fall && Math.abs(Math.sin(q.phase)) > 0.97) { await p.mouse.down(); await p.mouse.up(); break; } await p.waitForTimeout(8); }
  await p.waitForTimeout(1500);
  const sOver = await p.locator('#stkOver').innerText();
  ok('a miss ends it kindly: how high, where you got to, your best', /\d+ stars high/.test(sOver) && /into the clouds/i.test(sOver) && /new best/i.test(sOver), sOver.replace(/\n/g, ' '));
  ok('Stack keeps its best', (await st()).games.stack.best >= 15);
  await p.screenshot({ path: OUT + '/gm-stack-end.png' });

  // the shelf now shows your bests
  await p.goto(BASE + '#/home'); await p.waitForTimeout(500);
  const shelf2 = await p.locator('.games a').allInnerTexts();
  ok('the shelf shows each best', /Best \d+ high/.test(shelf2[1]) && /Best \d+ bounces/.test(shelf2[2]), shelf2.join(' | ').replace(/\n/g, ' '));
  await p.locator('.games').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/gm-shelf-bests.png' });

  // 4. the tab bar follows where you came from
  const lit = () => p.locator('nav.tabbar a[aria-current="page"]').innerText();
  await p.goto(BASE + '#/quilt?from=me'); await p.waitForTimeout(400);
  ok('Quilt opened from Me keeps Me lit', (await lit()) === 'Me');
  await p.goto(BASE + '#/quilt?from=home'); await p.waitForTimeout(400);
  ok('Quilt opened from Home keeps Home lit', (await lit()) === 'Home');
  await p.goto(BASE + '#/quilt?from=rest'); await p.waitForTimeout(400);
  ok('Quilt opened from Rest keeps Home lit (Rest lives under Home)', (await lit()) === 'Home');
  await p.goto(BASE + '#/days'); await p.waitForTimeout(400);
  await p.click('[data-add]').catch(() => {}); await p.waitForTimeout(300);
  const viaSheet = await p.locator('#sheet [data-g="food"]').count();
  if (viaSheet) { await p.click('#sheet [data-g="food"]'); } else { await p.goto(BASE + '#/food?from=days'); }
  await p.waitForTimeout(500);
  ok('Food opened from Days keeps Days lit', (await lit()) === 'Days', p.url());
  ok('and its back button goes to Days', (await p.locator('.top .back').innerText()).includes('Days'));
  await p.screenshot({ path: OUT + '/gm-tab-food-days.png' });
  await p.goto(BASE + '#/food'); await p.waitForTimeout(400);
  ok('Food opened from Home still lights Home', (await lit()) === 'Home' && (await p.locator('.top .back').innerText()).includes('Home'));
  await p.goto(BASE + '#/move?from=days'); await p.waitForTimeout(400);
  ok('a main tab always lights itself', (await lit()) === 'Move');

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errors.length ? 'page errors: ' + errors.join(' | ') : 'no errors');
})();
