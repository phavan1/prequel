// v77: Your wall, a month poster to print (A4 landscape, colour). Throwaway profile, made-up plans only.
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
  await p.clock.install({ time: new Date('2026-11-22T10:00:00') }); // late in November: it offers December
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  await p.evaluate(async () => { const S = await import('./js/store.js'); S.get().newsSeen = 999; S.save(); document.querySelectorAll('.hello').forEach(e => e.remove()); });

  await p.goto(BASE + '#/me'); await p.waitForTimeout(500);
  ok('Me has a "Your wall" row', await p.locator('a[href="#/wall?from=me"]').count() === 1);
  await p.click('a[href="#/wall?from=me"]'); await p.waitForTimeout(500);
  ok('late in the month it offers next month', /December 2026/.test(await p.locator('.wmonth').innerText()));
  ok('Me stays lit', await p.locator('.tabbar a[aria-current="page"][href="#/me"]').count() === 1);
  // add a few plans
  const add = async (day, text, ic) => {
    await p.click('[data-wday="2026-12-' + day + '"]'); await p.waitForTimeout(200);
    await p.fill('#wTxt', text); if (ic) await p.click('[data-wic="' + ic + '"]'); await p.click('[data-wadd]'); await p.waitForTimeout(150);
    await p.click('#sheet [data-close]'); await p.waitForTimeout(150);
  };
  await add('03', 'Essay due', 'book'); await add('03', 'Gym with Sam', 'move'); await add('09', 'Dentist 10am', 'care');
  await add('14', "Mum's birthday", 'cake'); await add('19', 'Flight to Chennai', 'trip'); await add('24', 'Christmas Eve dinner with everyone', 'star'); await add('31', 'New Year party', 'music');
  let s = await st();
  ok('plans are saved by day', s.wall.plans['2026-12-03'].length === 2 && s.wall.plans['2026-12-14'][0].ic === 'cake');
  ok('a long one is kept to 28 letters', s.wall.plans['2026-12-24'][0].t.length <= 28, s.wall.plans['2026-12-24'][0].t);
  // three a day at most
  await p.click('[data-wday="2026-12-03"]'); await p.fill('#wTxt', 'Laundry'); await p.click('[data-wadd]'); await p.waitForTimeout(150);
  ok('three a day at most, kindly', /Three is plenty/.test(await p.locator('#sheet').innerText()));
  await p.screenshot({ path: OUT + '/wall-day.png' });
  await p.click('[data-wdel]'); await p.waitForTimeout(150);
  ok('× takes one off', (await st()).wall.plans['2026-12-03'].length === 2);
  await p.click('#sheet [data-close]'); await p.waitForTimeout(150);
  await p.fill('[data-wish="0"]', 'walk in the mornings'); await p.fill('[data-wish="1"]', 'call home on Sundays');
  ok('wishes are saved for the month', (await st()).wall.wishes['2026-12'][1] === 'call home on Sundays');
  await p.screenshot({ path: OUT + '/wall-page.png', fullPage: true });
  // the poster
  await p.click('[data-poster]'); await p.waitForTimeout(2500);
  ok('the poster sheet shows a preview and a way to save', await p.locator('#sheet img.wprev').count() === 1 && await p.locator('#sheet [data-savepdf], #sheet [data-sharepdf]').count() >= 1);
  const pdf = await p.evaluate(async () => { const f = document.querySelector('main').__poster; const t = new TextDecoder('latin1').decode(new Uint8Array(await f.arrayBuffer())); return { name: f.name, size: f.size, box: (t.match(/MediaBox \[([^\]]+)\]/) || [])[1], pages: (t.match(/\/Type \/Page /g) || []).length }; });
  ok('a one-page A4 landscape PDF', pdf.pages === 1 && /^0 0 841\.89 595\.28$/.test(pdf.box) && /December 2026 poster\.pdf/.test(pdf.name), JSON.stringify(pdf));
  await p.screenshot({ path: OUT + '/wall-ready.png' });
  const png = await p.evaluate(async () => { const W = await import('./js/screens/wall.js'), C = await import('./js/cards.js'); await C.fontsReady(); const [a] = await C.loadArt(['stickynote']); return W.drawPoster('2026-12', a).toDataURL('image/png'); });
  fs.writeFileSync(OUT + '/wall-poster.png', Buffer.from(png.split(',')[1], 'base64'));
  // a month with nothing planned still makes a calm poster
  const png2 = await p.evaluate(async () => { const W = await import('./js/screens/wall.js'), C = await import('./js/cards.js'); const [a] = await C.loadArt(['stickynote']); return W.drawPoster('2027-01', a).toDataURL('image/png'); });
  fs.writeFileSync(OUT + '/wall-poster-empty.png', Buffer.from(png2.split(',')[1], 'base64'));
  ok('posters draw for a full and an empty month', png.length > 100000 && png2.length > 50000);
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('wall: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
