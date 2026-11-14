// v105: a slimmer Me. Goals still at the start sit on one line, a small Share button in the hero, the journey card says
// how your main lift has gone, and a shelf of four picture tiles (Your sky, Your quilt, On repeat, Looking back).
// The weather ribbon and two weeks of nights moved to their own Looking back page.
// Throwaway profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/slimme.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const SAMPLE = path.join(__dirname, 'sample-backup.json');
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
async function seed(p) {
  await p.clock.install({ time: new Date('2026-11-12T09:00:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(2500);
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    const T = (d, h) => new Date(d + 'T00:00:00').getTime() + h * 3600000;
    const days = []; for (let k = 70; k >= 1; k--) { const d = S.addDays('2026-11-12', -k); if ([1, 3, 5].includes(new Date(d).getDay())) days.push(d); }
    st.sessions = days.map((d, i) => ({ id: 'g' + i, date: d, ts: T(d, 18), workoutId: 'uA', workoutName: 'Upper A', light: 'green', mins: 55,
      exercises: [{ key: 'lat', name: 'Lat pulldown', swap: null, sets: [{ a: String(30 + Math.floor(i / 3) * 2.5), b: '10' }] }] }));
    for (let i = 1; i < 14; i++) { const d = S.addDays('2026-11-12', -i); st.rests.push({ id: 'rx' + i, date: d, start: T(d, -1.5), end: T(d, 7) }); }
    st.tapes = [{ id: 't2', date: '2026-10-20', start: '2026-10-20', end: null, title: 'Golden Hour', artist: 'JVKE', album: '' }];
    S.save();
  });
}
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', e => errors.push(e.message));
  await seed(p);
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/me'); await p.waitForTimeout(800);
  const main = await p.locator('main').innerText();
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  ok('Me is about one and a half phone screens, not two and a half', h < 1700, h + 'px');
  ok('no weather ribbon or nights chart on Me any more', await p.locator('svg.nights').count() === 0 && !/weather ribbon/.test(main));
  const tiles = await p.locator('.tiles .ttile .tt b').allInnerTexts();
  ok('four tiles: Your sky, Your quilt, On repeat, Looking back', JSON.stringify(tiles) === '["Your sky","Your quilt","On repeat","Looking back"]', JSON.stringify(tiles));
  const n = await p.evaluate(async () => (await import('./js/store.js')).get().moments.length);
  ok('the sky tile counts your stars and lanterns', new RegExp(n + ' stars · 4 lanterns').test(await p.locator('.ttile.sky').innerText()));
  ok('the quilt tile counts this month\'s nights', /1[01] nights sewn in November/.test(await p.locator('.ttile.quilt').innerText()), await p.locator('.ttile.quilt').innerText());
  const rep = await p.locator('.ttile.rep').innerText();
  ok('On repeat shows your song on the tape, and since when, in words', /Golden Hour/.test(rep) && /JVKE · since 20 October/.test(rep), rep.replace(/\n/g, ' '));
  ok('Looking back carries your tiny wins', /21 tiny wins/.test(await p.locator('.ttile.look').innerText()));
  ok('no zeros on the tiles', !/\b0\b/.test(await p.locator('.tiles').innerText()));
  ok('the journey card says how your main lift has gone', /Lat pulldown 30 kg → 5\d(\.5)? kg/.test(await p.locator('.jscene').innerText()), (await p.locator('.jscene .jlift1').innerText().catch(() => '')));
  const chips = await p.locator('.readyline .rchip').allInnerTexts();
  ok('goals still at the start sit on one line, with + New goal', chips.length >= 2 && chips[chips.length - 1] === '+ New goal' && await p.locator('.goal .fresh').count() === 0, JSON.stringify(chips));
  ok('goals with progress keep their cards', await p.locator('.goal .n').count() >= 1);
  await p.screenshot({ path: OUT + '/sm-me.png', fullPage: true });
  await p.locator('.readyline .rchip').first().click(); await p.waitForTimeout(400);
  ok('tapping a goal on the line opens it', await p.locator('#sheet').isVisible() && /Home-cooked|New foods|goal/i.test(await p.locator('#sheet').innerText()));
  await p.keyboard.press('Escape'); await p.goto(BASE + '#/home'); await p.goto(BASE + '#/me'); await p.waitForTimeout(500);
  await p.click('.readyline .rchip.new'); await p.waitForTimeout(400);
  ok('+ New goal opens the new goal sheet', await p.locator('#gName').count() === 1);
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/me'); await p.waitForTimeout(500);
  await p.click('.sharepill'); await p.waitForTimeout(600);
  ok('the Share button opens Share your story', /#\/share/.test(p.url()));
  await p.goto(BASE + '#/me'); await p.waitForTimeout(500);
  await p.click('.ttile.look'); await p.waitForTimeout(700);
  const lb = await p.locator('main').innerText();
  ok('Looking back is its own page, with counts, the weather ribbon and two weeks of nights', /Looking back/.test(lb) && /21\s*tiny wins/.test(lb) && /weather ribbon/.test(lb) && await p.locator('svg.nights .nday').count() === 14);
  ok('it keeps Me lit, and Back goes to Me', await p.locator('.tabbar a[aria-current="page"][href="#/me"]').count() === 1 && /Me/.test(await p.locator('.back').innerText()));
  await p.screenshot({ path: OUT + '/sm-lookback.png', fullPage: true });
  await p.click('.back'); await p.waitForTimeout(500); ok('Back lands on Me', /#\/me$/.test(p.url()));
  await p.click('.ttile.rep'); await p.waitForTimeout(600); ok('the On repeat tile opens On repeat', /#\/repeat/.test(p.url()));
  // laptop: fits on one screen
  const q = await b.newPage({ viewport: { width: 1440, height: 900 } }); q.on('pageerror', e => errors.push(e.message));
  await seed(q); await q.goto(BASE + '#/home'); await q.goto(BASE + '#/me'); await q.waitForTimeout(800);
  const lh = await q.evaluate(() => document.documentElement.scrollHeight);
  ok('on a laptop, Me fits about one screen', lh <= 1000, lh + 'px');
  await q.screenshot({ path: OUT + '/sm-me-laptop.png' });
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('slimme: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
