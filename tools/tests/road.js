// v68: Slow ride, an endless calm bike ride. Throwaway profiles, made-up data only.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/road.js
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

  // 1. the shelf card, before riding: no zeros
  await p.evaluate(async () => { const S = await import('./js/store.js'); S.get().heavy[S.today()] = true; S.get().newsSeen = 999; S.save(); });
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/home'); await p.waitForTimeout(600);
  const card = await p.locator('.games a[href^="#/road"]').innerText().catch(() => '');
  ok('the shelf has a Slow ride card', /Slow ride/.test(card) && /calm road/.test(card), card.replace(/\n/g, ' '));
  await p.locator('.games').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/rd-shelf.png' });

  // 2. a saved total carries on (pretend 12.3 km ridden already, which is by the lake)
  await p.evaluate(async () => { const S = await import('./js/store.js'); S.get().games = S.get().games || {}; S.get().games.road = { m: 12300, rides: 3 }; S.save(); });
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/home'); await p.waitForTimeout(400);
  const card2 = await p.locator('.games a[href^="#/road"]').innerText();
  ok('the card shows what you have ridden', /12\.3 km ridden/.test(card2), card2.replace(/\n/g, ' '));
  await p.click('.games a[href^="#/road"]'); await p.waitForTimeout(1200);
  ok('the ride carries on from the total', /^12\.3 km$/.test(await p.locator('#rdKm').innerText()));
  const place = await p.locator('#rdPlace').innerText();
  ok('the place name shows', place.length > 2, place);
  await p.screenshot({ path: OUT + '/rd-ride.png' });

  // 3. it moves on its own
  const m0 = await p.evaluate(() => document.querySelector('main').__road.pos);
  await p.waitForTimeout(3000);
  const m1 = await p.evaluate(() => document.querySelector('main').__road.pos);
  ok('the bike rides on by itself', m1 > m0, ((m1 - m0) * 0.6).toFixed(1) + ' m in 3 s');

  // 3b. gears: Easy to start, tap for Brisk and Breezy, it eases up to speed, and the gear is remembered
  ok('starts in Easy', /Easy/.test(await p.locator('#rdGear').innerText()));
  const sp = async () => { const a = await p.evaluate(() => document.querySelector('main').__road.pos); await p.waitForTimeout(2000); return ((await p.evaluate(() => document.querySelector('main').__road.pos)) - a) * 0.6 / 2 * 3.6; };
  const easy = await sp();
  await p.click('#rdGear'); ok('one tap: Brisk', /Brisk/.test(await p.locator('#rdGear').innerText()));
  await p.click('#rdGear'); ok('two taps: Breezy', /Breezy/.test(await p.locator('#rdGear').innerText()));
  await p.waitForTimeout(3500); const breezy = await sp();
  ok('Breezy is about 50 km/h and Easy about 22', easy > 15 && easy < 30 && breezy > 40 && breezy < 62, 'easy ' + easy.toFixed(0) + ', breezy ' + breezy.toFixed(0) + ' km/h');
  await p.screenshot({ path: OUT + '/rd-breezy.png' });
  await p.click('#rdGear'); ok('a third tap: back to Easy', /Easy/.test(await p.locator('#rdGear').innerText()));
  await p.click('#rdGear');

  // 4. drag to steer, and it drifts back when you let go
  await p.mouse.move(195, 600); await p.mouse.down(); await p.mouse.move(330, 600, { steps: 8 }); await p.waitForTimeout(700);
  const x1 = await p.evaluate(() => document.querySelector('main').__road.x);
  ok('dragging steers', Math.abs(x1) > 0.2, 'x ' + x1.toFixed(2));
  await p.screenshot({ path: OUT + '/rd-steer.png' });
  await p.mouse.up(); await p.waitForTimeout(2500);
  const x2 = await p.evaluate(() => document.querySelector('main').__road.x);
  ok('letting go drifts back to the middle', Math.abs(x2) < Math.abs(x1), 'x ' + x2.toFixed(2));

  // 5. jump ahead to the coast, check each place draws without errors
  for (const [km, name] of [[1, 'fields'], [7, 'forest'], [13, 'lake'], [19, 'hills'], [25, 'coast'], [31, 'village']]) {
    await p.evaluate(k => { document.querySelector('main').__road.pos = k * 1000 / 0.6; }, km); await p.waitForTimeout(500);
    await p.screenshot({ path: OUT + '/rd-' + name + '.png' });
  }
  const names = await p.evaluate(async () => (await import('./js/screens/road.js')).PLACES.map(x => x.name));
  ok('six places along the way', names.length === 6, names.join(', '));

  // 6. leaving saves the distance and says how far, kindly
  await p.evaluate(() => { document.querySelector('main').__road.pos = (12300 + 800) / 0.6; });
  await p.waitForTimeout(300);
  await p.click('.sk-back'); await p.waitForTimeout(400);
  const t = await p.locator('.toast').innerText().catch(() => '');
  ok('leaving: how far this ride and all together', /km this ride · .* km all together/.test(t), t);
  const rec = (await st()).games.road;
  ok('the distance is saved and never resets', rec.m > 13000 && rec.rides === 4, JSON.stringify(rec));
  ok('the gear is remembered (Brisk)', rec.gear === 1);

  // 7. Rest has the Wind down row, and the Rest tab stays lit
  await p.goto(BASE + '#/rest'); await p.waitForTimeout(500);
  ok('Rest has a Wind down row', await p.locator('a.winddown[href="#/road?from=rest"]').count() === 1);
  await p.locator('a.winddown').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/rd-rest.png' });
  await p.click('a.winddown'); await p.waitForTimeout(800);
  ok('opens full screen from Rest too', await p.locator('#rd').count() === 1);
  await p.click('.sk-back'); await p.waitForTimeout(400);
  ok('the back arrow goes back to Rest', /#\/rest/.test(p.url()), p.url());

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('road: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
