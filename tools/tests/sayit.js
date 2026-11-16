// v118: Just say it. A button on Food opens a sheet: one sentence ("5 dosas, chicken gravy, a coffee and grandma's
// zorblax"), typed or said with the keyboard's mic, becomes a list to tick: your own foods first, then the food
// lists, counts read from the words (digits, words, halves, grams), and anything not found offers Just log it,
// Find it or Leave out. Log these N logs them all. No AI, no internet.
// Throwaway profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/sayit.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-17T08:30:00+11:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  await p.evaluate(async () => { const S = await import('./js/store.js'), s = S.get(); s.newsSeen = 999;
    s.myFoods = [{ id: 'fD', name: 'Dosa', unit: '1 dosa', unitG: 80, n: [120, 3, 18, 4, 2, 1, 0, 0, 0, 0, 0, 0], uses: 9, created: 1 },
      { id: 'fG', name: 'Chicken gravy', unit: '1 bowl', unitG: 250, n: [310, 32, 10, 15, 3, 2, 0, 0, 0, 0, 0, 0], recipe: [{ name: 'Chicken breast', grams: 300 }], portions: 3, uses: 4, created: 2 }];
    s.meals = []; S.save(); });
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/food'); await p.waitForTimeout(1500); // the food lists load
  ok('Food has a Just say it button above the search', await p.locator('[data-say]').count() === 1 && await p.evaluate(() => { const a = document.querySelector('[data-say]'), b = document.querySelector('.fsearch'); return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); }));
  await p.screenshot({ path: OUT + '/say-food.png' });

  // the parser on its own
  const r = await p.evaluate(async () => { const S = await import('./js/say.js'); const one = t => S.readPart(t);
    return { split: S.splitMeal('5 dosas, chicken gravy and a coffee + toast then an apple'), g: one('200 g rice'), g2: one('150g of curd'), cups: one('two cups of coffee'), half: one('half a bowl of dal'), frac: one('1/2 chapati'),
      oneHalf: S.readMeal('one and a half chapatis').map(x => [x.qty, x.name]), some: one('some of aunty\'s sambar') }; });
  ok('splits on commas, "and", "+" and "then"', JSON.stringify(r.split) === JSON.stringify(['5 dosas', 'chicken gravy', 'a coffee', 'toast', 'an apple']), JSON.stringify(r.split));
  ok('grams: "200 g rice", "150g of curd"', r.g.grams === 200 && r.g.name === 'rice' && r.g2.grams === 150 && r.g2.name === 'curd', JSON.stringify([r.g, r.g2]));
  ok('words: "two cups of coffee" (2, cups), "half a bowl of dal" (0.5), "1/2 chapati", "one and a half chapatis" (1.5)',
    r.cups.qty === 2 && r.cups.unitWord === 'cups' && r.cups.name === 'coffee' && r.half.qty === 0.5 && r.half.name === 'dal' && r.frac.qty === 0.5 && JSON.stringify(r.oneHalf) === '[[1.5,"chapatis"]]', JSON.stringify([r.cups, r.half, r.frac, r.oneHalf]));
  ok('"some of aunty\'s sambar" keeps the name, count 1', r.some.qty === 1 && r.some.name === 'aunty\'s sambar', JSON.stringify(r.some));

  // everyday words find everyday foods (not "Coffee drops", "Dalma" or "Milk, sheep")
  const mt = await p.evaluate(async () => { const S = await import('./js/say.js'); const o = {}; for (const q of ['2 chapatis', '2 eggs', 'a banana', 'rice', 'a cup of tea', '4 idlis', 'an apple', 'parotta']) { const r = S.readMeal(q)[0]; o[q] = r.hit ? (r.hit.mine || r.hit.db).name : ''; } return o; });
  ok('everyday words find everyday foods', mt['2 chapatis'] === 'Chapati/Roti' && /^Egg, whole, cooked/.test(mt['2 eggs']) && /^Bananas, raw/.test(mt['a banana']) && /^Rice, white.*cooked/.test(mt.rice) && /^Tea, black, brewed/.test(mt['a cup of tea']) && mt['4 idlis'] === 'Idli' && /^Apples, raw/.test(mt['an apple']) && /paratha/i.test(mt.parotta), JSON.stringify(mt));
  // the sheet
  await p.click('[data-say]'); await p.waitForTimeout(300);
  ok('the sheet opens with the box focused and an example', await p.evaluate(() => document.activeElement && document.activeElement.id === 'sayIn') && /2 chapatis, dal/.test(await p.locator('#sheet').innerText()));
  await p.fill('#sayIn', '5 dosas, chicken gravy, a coffee and grandma\'s zorblax'); await p.waitForTimeout(700);
  const rows = await p.locator('#sheet .tick').evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  ok('it heard 4 things', /I heard 4 things/i.test(await p.locator('#sheet').innerText()) && rows.length === 4, rows.join(' | '));
  ok('dosas → your Dosa × 5, ~120 cal each', /^✓ Dosa yours · 1 dosa · ~120 cal each − 5 \+$/.test(rows[0]), rows[0]);
  ok('chicken gravy → your recipe × 1', /^✓ Chicken gravy your recipe · 1 bowl · ~310 cal − 1 \+$/.test(rows[1]), rows[1]);
  ok('a coffee → plain brewed coffee from the food lists', /^✓ Coffee, brewed/i.test(rows[2]), rows[2]);
  ok('grandma\'s zorblax → not found, with Just log it / Find it / Leave out', /“grandma's zorblax” not in your foods yet Just log it Find it Leave out/.test(rows[3]), rows[3]);
  ok('a total and Log these 3 (the unknown one isn\'t counted yet)', /^~[\d,]+ cal · \d+ g protein$/.test(await p.locator('.saytot small').innerText()) && (await p.locator('[data-saylog]').innerText()) === 'Log these 3', await p.locator('.saytot').innerText());
  await p.screenshot({ path: OUT + '/say-sheet.png' });
  // change things
  await p.locator('#sheet .tick').nth(0).locator('[data-dq="1"]').click(); await p.waitForTimeout(100);
  ok('+ makes it 6 dosas', /− 6 \+/.test(await p.locator('#sheet .tick').nth(0).innerText().then(t => t.replace(/\s+/g, ' '))));
  await p.locator('#sheet .tick').nth(2).locator('[data-tk]').click(); await p.waitForTimeout(100);
  ok('untick the coffee: it fades, the tick goes, Log these 2', await p.locator('#sheet .tick.off').count() === 1 && (await p.locator('#sheet .tick').nth(2).locator('[data-tk]').getAttribute('aria-pressed')) === 'false' && (await p.locator('[data-saylog]').innerText()) === 'Log these 2');
  await p.locator('#sheet [data-find="3"]').click(); await p.waitForTimeout(200);
  ok('Find it: a search box in its place', await p.locator('#sheet .tick.finding input').count() === 1);
  await p.locator('#sheet .tick.finding input').fill('sambar'); await p.waitForTimeout(300);
  ok('…typing shows matches, and keeps the cursor in the box', await p.locator('#sheet .tick.finding [data-use]').count() > 0 && await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('sayfind')));
  const picked = await p.locator('#sheet .tick.finding [data-use]').first().innerText();
  await p.locator('#sheet .tick.finding [data-use]').first().click(); await p.waitForTimeout(200);
  ok('…picking one turns it into a ticked row', /^✓ /.test((await p.locator('#sheet .tick').nth(3).innerText()).replace(/\s+/g, ' ').trim()) && (await p.locator('[data-saylog]').innerText()) === 'Log these 3', picked.split('\n')[0]);
  // typing more keeps what you changed
  await p.fill('#sayIn', '5 dosas, chicken gravy, a coffee and grandma\'s zorblax and mystery zorp'); await p.waitForTimeout(700);
  const rows2 = await p.locator('#sheet .tick').evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  ok('typing more keeps your changes (6 dosas, coffee unticked, the sambar pick)', /− 6 \+/.test(rows2[0]) && await p.locator('#sheet .tick.off').count() === 1 && /^✓ /.test(rows2[3]) && rows2.length === 5, rows2.join(' | '));
  await p.locator('#sheet [data-quick="4"]').click(); await p.waitForTimeout(100);
  ok('Just log it: ticked, no numbers yet', /^✓ Mystery zorp no numbers yet · fill them in later/.test((await p.locator('#sheet .tick').nth(4).innerText()).replace(/\s+/g, ' ').trim()), await p.locator('#sheet .tick').nth(4).innerText());
  await p.click('[data-saylog]'); await p.waitForTimeout(400);
  const s = await p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  const ms = s.meals.map(m => [m.name, m.qty, m.sure]);
  ok('Log logs 4: Dosa × 6, Chicken gravy × 1, the sambar, Mystery zorp (no numbers)', s.meals.length === 4 && ms[0][0] === 'Dosa' && ms[0][1] === 6 && ms[0][2] === true && ms[1][0] === 'Chicken gravy' && /sambar/i.test(ms[2][0]) && ms[2][2] === false && ms[3][0] === 'Mystery zorp' && !s.meals[3].n, JSON.stringify(ms));
  ok('…the sheet closes, says so, and they\'re on the day list', !(await p.locator('#sheet').count()) && /Logged 4 things/.test(await p.locator('body').innerText()) && await p.locator('.daylist .entry').count() === 4);
  ok('…and each one is in your sky like any log', s.moments.filter(m => m.kind === 'food' || m.type === 'food' || m.area === 'food').length >= 4 || s.moments.length >= 4);
  await p.screenshot({ path: OUT + '/say-logged.png' });
  // grams
  await p.click('[data-say]'); await p.waitForTimeout(300); await p.fill('#sayIn', '200 g dosa'); await p.waitForTimeout(700);
  ok('"200 g dosa" → 200 g, no stepper, ~300 cal', /^✓ Dosa yours · 200 g · ~300 cal$/.test((await p.locator('#sheet .tick').first().innerText()).replace(/\s+/g, ' ').trim()), await p.locator('#sheet .tick').first().innerText());
  await p.click('[data-saylog]'); await p.waitForTimeout(300);
  const g = await p.evaluate(async () => (await import('./js/store.js')).get().meals.slice(-1)[0].qty);
  ok('…logged as 2.5 dosas\' worth (80 g each)', g === 2.5, String(g));
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('sayit: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
