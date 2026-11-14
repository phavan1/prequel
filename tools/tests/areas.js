// v101: "Make it yours". Eight areas you can switch off (hidden everywhere, never deleted), the tab bar and Home's
// tiles spreading over what's left, the sky resting when nothing feeds it, and the first-open question.
// Throwaway profiles, made-up data. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/areas.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
const AREAS = ['food', 'move', 'rest', 'mind', 'weather', 'wins', 'goals', 'wall'];
async function fresh(b, seed = true) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-09T18:00:00') });
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1200);
  if (seed) await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    for (let i = 1; i <= 30; i++) { const d = S.addDays('2026-11-09', -i), ts = new Date(d + 'T09:00').getTime();
      st.sessions.push({ id: 's' + i, date: d, ts, workoutId: 'a', workoutName: 'A', exercises: [] }); st.moments.push({ id: 'mm' + i, area: 'move', text: 'A', date: d, ts });
      st.moments.push({ id: 'w' + i, area: 'win', text: 'Drank water', date: d, ts: ts + 1 });
      const e = new Date(d + 'T07:00').getTime(); st.rests.push({ id: 'r' + i, date: d, start: e - 8 * 3600e3, end: e, feel: 'okay' });
      st.weather.push({ id: 'x' + i, date: d, ts, types: ['Clear sun'] }); st.foods.push({ id: 'f' + i, date: d, ts, name: 'Toast', tags: ['Cooked it myself'] }); }
    st.mind.push({ id: 'n1', text: 'that', created: 1, letGo: Date.now() - 864e5 * 10 }); st.letters.push({ id: 'l1', ts: 1, text: 'hi' });
    st.settings.areasAsked = true; S.save(); document.querySelectorAll('.hello').forEach(e => e.remove()); });
  return p;
}
const setOff = (p, list) => p.evaluate(async list => { const S = await import('./js/store.js'); S.get().settings.off = list; S.save(); }, list);
const go = async (p, r) => { await p.goto(BASE + '#/settings'); await p.goto(BASE + '#/' + r); await p.waitForTimeout(600); };
const tabs = p => p.locator('.tabbar a').allInnerTexts();
(async () => {
  const b = await chromium.launch();
  // 1. everything on: nothing changes
  let p = await fresh(b);
  await go(p, 'home');
  ok('all on: five tabs and four tiles on Home', JSON.stringify(await tabs(p)) === '["Home","Days","Move","Mind","Me"]' && await p.locator('.quick a').count() === 4 && await p.locator('.room .hoop').count() === 1 && await p.locator('.room .window').count() === 1);
  // 2. Settings: Make it yours
  await go(p, 'settings');
  ok('Settings shows one Make it yours card, all eight on', /All 8 areas are on/.test(await p.locator('[data-areas]').innerText()));
  await p.click('[data-areas]'); await p.waitForTimeout(300); // v106: the area cards open in a sheet
  ok('Settings lists the eight areas, all on', await p.locator('[data-area]').count() === 8 && await p.locator('[data-area][aria-pressed="true"]').count() === 8);
  await p.click('#sheet [data-area="food"]'); await p.waitForTimeout(300);
  ok('switching Food off says nothing is deleted', /Food is hidden\. Nothing is deleted\./.test(await p.locator('.toast').innerText().catch(() => '')));
  await p.locator('#sheet .sheet').screenshot({ path: OUT + '/ar-settings.png' });
  ok('…the card in the sheet goes dashed and says Off', /Off/.test(await p.locator('#sheet [data-area="food"]').innerText()) && (await p.locator('#sheet [data-area="food"]').getAttribute('aria-pressed')) === 'false');
  await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  ok('…and the Make it yours card says Food is off', /7 of 8 areas on · Food is off/.test(await p.locator('[data-areas]').innerText()));
  await go(p, 'home');
  ok('Food off: three tiles, spread evenly', await p.locator('.quick a').count() === 3 && !/Food/.test(await p.locator('.quick').innerText()) && /repeat\(3/.test(await p.locator('.quick').getAttribute('style')));
  await go(p, 'food'); ok('…and the Food page sends you Home', /#\/home$/.test(p.url()));
  const kept = await p.evaluate(async () => (await import('./js/store.js')).get().foods.length);
  ok('…with every food log kept', kept === 30, String(kept));
  await go(p, 'settings'); await p.click('[data-areas]'); await p.waitForTimeout(300); await p.click('#sheet [data-area="food"]'); await p.waitForTimeout(200); await go(p, 'home');
  ok('switching it back on brings it all back', await p.locator('.quick a').count() === 4);
  await p.context().close();
  // 3. each area off on its own
  const checks = {
    move: async p => { await go(p, 'home'); const t = await tabs(p); await go(p, 'me'); return !t.includes('Move') && t.length === 4 && await p.locator('.jscene').count() === 0; },
    mind: async p => { await go(p, 'home'); const t = await tabs(p); await go(p, 'me'); const me = await p.locator('main').innerText(); await go(p, 'lookback'); const lb = await p.locator('main').innerText(); await go(p, 'sky'); return !t.includes('Mind') && !/lantern|letter\b/.test(me + lb) && await p.locator('#letBtn').count() === 0; },
    rest: async p => { await go(p, 'home'); const h = await p.locator('.room .hoop').count(), q = await p.locator('.quick').innerText(); await go(p, 'me'); const me = await p.locator('main').innerText(); await go(p, 'lookback'); const lb = await p.locator('main').innerText(); return h === 0 && !/Rest/.test(q) && !/nights/.test(me.replace(/\d+ nights? sewn/, '')) && !/two weeks of nights/.test(lb) && /Your quilt/.test(me); },
    weather: async p => { await go(p, 'home'); const w = await p.locator('a[href="#/weather"]').count(); await go(p, 'me'); const me = await p.locator('main').innerText(); await go(p, 'lookback'); return w === 0 && !/Weather/.test(me) && !/weather ribbon/.test(await p.locator('main').innerText()); },
    wins: async p => { await go(p, 'home'); const q = await p.locator('.quick').innerText(); await go(p, 'me'); const me = await p.locator('main').innerText(); await go(p, 'lookback'); return !/Jar/.test(q) && !/tiny win/.test(me + await p.locator('main').innerText()); },
    goals: async p => { await go(p, 'home'); const q = await p.locator('.quick').innerText(); await go(p, 'me'); return !/Goals/.test(q) && !/Your goals/.test(await p.locator('main').innerText()); },
    wall: async p => { await go(p, 'me'); const w = await p.locator('.wallstack').count(); await go(p, 'wall'); return w === 0 && /#\/home$/.test(p.url()); }
  };
  for (const a of Object.keys(checks)) { p = await fresh(b); await setOff(p, [a]); ok(a + ' off: hidden in every place on the list', await checks[a](p)); await p.context().close(); }
  // 4. the bare minimum: every area off
  p = await fresh(b); await setOff(p, AREAS);
  await go(p, 'home');
  ok('all off: only Home and Me in the tab bar', JSON.stringify(await tabs(p)) === '["Home","Me"]', JSON.stringify(await tabs(p)));
  ok('…Home keeps its room and sky (old stars), no tiles, no hoop', await p.locator('.quick').count() === 0 && await p.locator('.room .hoop').count() === 0 && await p.locator('.room .window').count() === 1);
  await p.screenshot({ path: OUT + '/ar-home-min.png' });
  await go(p, 'sky'); ok('…the sky rests, with a line instead of a count', /Your sky is resting/.test(await p.locator('#stats').innerText()));
  await go(p, 'me'); await p.screenshot({ path: OUT + '/ar-me-min.png', fullPage: true });
  ok('…Me has no goals, journey, wall, counts or Looking back', !/Your goals|Looking back/.test(await p.locator('main').innerText()) && await p.locator('.jscene, .wallstack, .count, .ttile.look').count() === 0);
  await go(p, 'days'); ok('…Days sends you Home', /#\/home$/.test(p.url()));
  const rc = await p.evaluate(async () => { const R = await import('./js/recap.js'), d = R.recapData('2026-10'); R.drawRecap('2026-10', 'X', {}); return { tiles: d.tiles.length, w: d.weather.length, q: d.quilt.length }; });
  ok('…the recap leaves them out and still draws', rc.tiles === 0 && rc.w === 0 && rc.q === 0, JSON.stringify(rc));
  await p.context().close();
  // 5. recap with Weather and Rest off: the poster closes up
  p = await fresh(b); await setOff(p, ['weather', 'rest']);
  const url = await p.evaluate(async () => { const R = await import('./js/recap.js'), C = await import('./js/cards.js'); await C.fontsReady(); await document.fonts.load('400 100px Bangers'); return R.drawRecap('2026-10', 'SIDE QUEST SEASON', {}).toDataURL('image/jpeg', 0.7); });
  fs.writeFileSync(OUT + '/ar-recap.jpg', Buffer.from(url.split(',')[1], 'base64')); ok('recap with Weather and Rest off draws', url.length > 1000);
  await p.context().close();
  // 6. a brand-new person: asked once, everything ticked
  p = await fresh(b, false); await p.evaluate(() => document.querySelectorAll('.hello').forEach(e => e.remove()));
  await p.waitForTimeout(2600);
  ok('first open: "What would you like Prequel for?", all ticked', /What would you like Prequel for\?/.test(await p.locator('#sheet').innerText().catch(() => '')) && await p.locator('#sheet [data-pick-area][aria-pressed="true"]').count() === 8);
  await p.screenshot({ path: OUT + '/ar-first.png' });
  await p.click('#sheet [data-pick-area="mind"]'); await p.click('#sheet [data-pick-area="food"]'); await p.click('#sheet [data-areas-ok]'); await p.waitForTimeout(400);
  ok('unticking Food and Mind, then Looks good: they\'re hidden', !(await tabs(p)).includes('Mind') && !/Food/.test(await p.locator('.quick').innerText()));
  await p.reload(); await p.waitForTimeout(3200);
  ok('…and it never asks again', await p.locator('#sheet').count() === 0);
  await p.context().close();
  // 7. someone already using Prequel isn't asked
  p = await fresh(b, false);
  await p.evaluate(async () => { const S = await import('./js/store.js'), st = S.get(); delete st.settings.areasAsked; st.moments.push({ id: 'a', area: 'win', text: 'x', date: '2026-11-01', ts: 1 }); S.save(); });
  await p.waitForTimeout(500); await p.reload(); await p.waitForTimeout(3200);
  ok('someone with data already: not asked, everything on', await p.locator('#sheet h2').count() === 0 || !/What would you like/.test(await p.locator('#sheet').innerText()));
  await p.context().close();
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('areas: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
