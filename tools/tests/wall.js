// v77, v78: Your wall, a month poster to print (A4 landscape, colour, comic style). Throwaway profile, made-up plans only.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/wall.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-26T10:00:00') }); // from the 25th: it offers December
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  await p.evaluate(async () => { const S = await import('./js/store.js'); S.get().newsSeen = 999; S.save(); document.querySelectorAll('.hello').forEach(e => e.remove()); });

  // v79 had a Home nudge from the 25th; v82 removed it
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/home'); await p.waitForTimeout(500);
  ok('no reminder on Home to make a planner (v82: it felt like pressure)', await p.locator('a.wallnudge').count() === 0 && !/poster is ready to make/.test(await p.locator('main').innerText()));
  await p.goto(BASE + '#/me'); await p.waitForTimeout(500);
  const wc = await p.locator('a.wallcard').innerText().catch(() => '');
  ok('Me shows Your wall as a mini poster (month and sticker)', /YOUR WALL/.test(wc) && /DECEMBER/.test(wc) && /ready to print/.test(wc), wc.replace(/\n/g, ' '));
  await p.locator('a.wallcard').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/wall-me.png' });
  await p.click('a.wallcard'); await p.waitForTimeout(500);
  ok('late in the month it offers next month', /December 2026/.test(await p.locator('.wmonth').innerText()));
  ok('Me stays lit', await p.locator('.tabbar a[aria-current="page"][href="#/me"]').count() === 1);
  // add a few plans
  const add = async (day, text, ic, imp) => {
    await p.click('[data-wday="2026-12-' + day + '"]'); await p.waitForTimeout(200);
    await p.fill('#wTxt', text); if (ic) await p.click('[data-wic="' + ic + '"]'); if (imp) await p.click('[data-wimp]'); await p.click('[data-wadd]'); await p.waitForTimeout(150);
    await p.click('#sheet [data-close]'); await p.waitForTimeout(150);
  };
  await add('03', 'APDS Interview, 2pm', 'book', true); await add('03', 'Gym with Sam', 'move'); await add('09', 'Dentist 10am', 'care', true);
  await add('14', "Mum's birthday", 'cake', true); await add('19', 'Flight to Chennai', 'trip'); await add('24', 'Christmas Eve dinner with everyone at home', 'star'); await add('31', 'New Year party', 'music');
  await add('16', 'AI Project 3 due', 'book', true); await add('16', 'Coffee with Priya after class', 'friends'); await add('11', 'Gig night', 'music');
  let s = await st();
  ok('plans are saved by day', s.wall.plans['2026-12-03'].length === 2 && s.wall.plans['2026-12-14'][0].ic === 'cake');
  ok('a long one is kept to 40 letters', s.wall.plans['2026-12-24'][0].t.length <= 40, s.wall.plans['2026-12-24'][0].t);
  ok('★ Important is saved', s.wall.plans['2026-12-03'][0].imp === true && !s.wall.plans['2026-12-03'][1].imp);
  ok('the calendar shows a red star on important days', await p.locator('[data-wday="2026-12-03"] .wstar').count() === 1);
  // three a day at most
  await p.click('[data-wday="2026-12-03"]'); await p.fill('#wTxt', 'Laundry'); await p.click('[data-wadd]'); await p.waitForTimeout(150);
  ok('three a day at most, kindly', /Three is plenty/.test(await p.locator('#sheet').innerText()));
  await p.screenshot({ path: OUT + '/wall-day.png' });
  await p.locator('[data-wdel]').last().click(); await p.waitForTimeout(150);
  ok('× takes one off', (await st()).wall.plans['2026-12-03'].length === 2);
  await p.locator('[data-wtog]').nth(1).click(); await p.waitForTimeout(150);
  ok('★ on a saved plan marks it important', (await st()).wall.plans['2026-12-03'][1].imp === true);
  await p.locator('[data-wtog]').nth(1).click(); await p.waitForTimeout(150);
  await p.click('#sheet [data-close]'); await p.waitForTimeout(150);
  // the sticker: Prequel picks, shuffle, or your own
  const stk = () => p.locator('.wsticker').innerText();
  const first = await stk(); ok('Prequel picks a phrase for the sticker', first.length > 5, first);
  await p.click('[data-shuffle]'); await p.waitForTimeout(150); const second = await stk();
  ok('Shuffle gives another', second !== first, second);
  await p.click('[data-ownphrase]'); await p.fill('#wPh', 'my december era'); await p.click('[data-phok]'); await p.waitForTimeout(150);
  ok('your own phrase, in capitals', (await stk()) === 'MY DECEMBER ERA' && (await st()).wall.phrase['2026-12'] === 'MY DECEMBER ERA');
  ok('no wishes any more', await p.locator('[data-wish]').count() === 0);
  await p.screenshot({ path: OUT + '/wall-page.png', fullPage: true });
  // the poster
  await p.click('[data-poster]'); await p.waitForTimeout(2500);
  ok('the poster sheet shows a preview, PDF to print and Save as picture (v84)', await p.locator('#sheet img.wprev').count() === 1 && await p.locator('#sheet [data-out="pdf"]').count() === 1 && await p.locator('#sheet [data-out="png"]').count() === 1);
  const pPng = await p.evaluate(() => { const f = document.querySelector('main').__png; return f && f.name + ' ' + f.type; });
  ok('the planner comes as a picture too', /poster\.png image\/png$/.test(pPng || ''), pPng);
  const pdf = await p.evaluate(async () => { const f = document.querySelector('main').__poster; const t = new TextDecoder('latin1').decode(new Uint8Array(await f.arrayBuffer())); return { name: f.name, size: f.size, box: (t.match(/MediaBox \[([^\]]+)\]/) || [])[1], pages: (t.match(/\/Type \/Page /g) || []).length }; });
  ok('a one-page A4 landscape PDF', pdf.pages === 1 && /^0 0 841\.89 595\.28$/.test(pdf.box) && /December 2026 poster\.pdf/.test(pdf.name), JSON.stringify(pdf));
  await p.screenshot({ path: OUT + '/wall-ready.png' });
  await p.click('#sheet [data-close]').catch(() => {});
  ok('making the poster is remembered', !!(await st()).wall.made['2026-12']);
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/home'); await p.waitForTimeout(400);
  ok('…and still no reminder on Home', await p.locator('a.wallnudge').count() === 0);
  const png = await p.evaluate(async () => { const W = await import('./js/screens/wall.js'), C = await import('./js/cards.js'); await C.fontsReady(); await document.fonts.load('400 100px Bangers'); return W.drawPoster('2026-12').toDataURL('image/png'); });
  fs.writeFileSync(OUT + '/wall-poster.png', Buffer.from(png.split(',')[1], 'base64'));
  // a month with nothing planned still makes a calm poster
  const png2 = await p.evaluate(async () => { const W = await import('./js/screens/wall.js'); return W.drawPoster('2027-03').toDataURL('image/png'); });
  fs.writeFileSync(OUT + '/wall-poster-empty.png', Buffer.from(png2.split(',')[1], 'base64'));
  ok('posters draw for a full and an empty month', png.length > 100000 && png2.length > 50000);
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('wall: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
