// v120: Just say it learns your words (a small naive Bayes model on the phone), and the fixes from Phavan's first try:
// a weak guess (a brand, or only part of what you said) asks "Is this it?"; dictation's "For tortillas" means 4;
// an × on every row and Leave out in Find it; words tried one by one. Settings → More can forget what it learned.
// Throwaway profiles. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/saylearn.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
const N = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-18T08:10:00+11:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  await p.evaluate(async N => { const S = await import('./js/store.js'), s = S.get(); s.newsSeen = 999; s.meals = [];
    s.myFoods = [{ id: 'fK', name: 'Kozhi curry', unit: '1 bowl', unitG: 250, n: [330, 30, 9, 18].concat(N.slice(4)), recipe: [{ name: 'Chicken breast', grams: 300 }], uses: 5, created: 1 },
      { id: 'fF', name: 'Filter coffee', unit: '1 cup', unitG: 150, n: [90, 3, 10, 4].concat(N.slice(4)), uses: 3, created: 2 },
      { id: 'fC', name: 'Cold coffee', unit: '1 glass', unitG: 250, n: [180, 6, 26, 6].concat(N.slice(4)), uses: 3, created: 3 }];
    delete s.sayModel; S.save(); }, N);
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/food'); await p.waitForTimeout(1500);
  const rows = () => p.locator('#sheet .tick').evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  const say = async t => { if (!(await p.locator('#sayIn').count())) { await p.click('[data-say]'); await p.waitForTimeout(250); } await p.fill('#sayIn', t); await p.waitForTimeout(700); return rows(); };
  const close = async () => { if (await p.locator('#sheet [data-close]').count()) { await p.locator('#sheet [data-close]').last().click(); await p.waitForTimeout(250); } };

  // the parser: dictation's sound-alike numbers and the words around the food
  const r = await p.evaluate(async () => { const S = await import('./js/say.js'); return ['For tortillas', 'to dosas', 'I had 2 dosas for breakfast', 'won apple', 'for breakfast I had idli'].map(t => { const x = S.readMeal(t)[0]; return [x.qty, x.name]; }); });
  ok('"For tortillas" is 4, "to dosas" 2, "won apple" 1', r[0][0] === 4 && r[0][1] === 'tortillas' && r[1][0] === 2 && r[1][1] === 'dosas' && r[3][0] === 1 && r[3][1] === 'apple', JSON.stringify(r));
  ok('"I had 2 dosas for breakfast" is 2 dosas', r[2][0] === 2 && r[2][1] === 'dosas', JSON.stringify(r[2]));

  // a weak guess asks
  let t = await say('chicken gravy');
  ok('chicken gravy (none of yours by that name) → "Is this it?" with the brand guess, not a tick', /^\? Is this it\? “chicken gravy” CAMPBELL'S Chicken Gravy/i.test(t[0]) && /Yes, that Find it Just log it Leave out/.test(t[0]) && (await p.locator('[data-saylog]').isDisabled()), t[0]);
  await p.screenshot({ path: OUT + '/sl-isit.png' });
  // fix it with Find it → your Kozhi curry, and log
  await p.locator('#sheet [data-find="0"]').click(); await p.waitForTimeout(200);
  ok('Find it has Leave out next to Cancel', await p.locator('#sheet .findbox [data-out]').count() === 1);
  await p.locator('#sheet .tick.finding input').fill('kozhi'); await p.waitForTimeout(300);
  await p.locator('#sheet [data-use][data-mine="fK"]').click(); await p.waitForTimeout(200);
  await p.click('[data-saylog]'); await p.waitForTimeout(400);
  let st = await p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  ok('logged Kozhi curry, and it learned "chicken gravy" → Kozhi curry', st.meals.some(m => m.name === 'Kozhi curry') && st.sayModel.foods.fK.s.chicken > 0 && st.sayModel.foods.fK.s.gravy > 0 && st.sayModel.learned === 1, JSON.stringify(st.sayModel.foods.fK));
  t = await say('chicken gravy');
  ok('next time: chicken gravy → ✓ Kozhi curry, "you usually"', /^✓ Kozhi curry you usually · 1 bowl · ~330 cal − 1 \+ ×$/.test(t[0]), t[0]);
  t = await say('second gravy');
  ok('dictation\'s "second gravy" → "Is this it? Kozhi curry" (one word it knows)', /^\? Is this it\? “second gravy” Kozhi curry/i.test(t[0]), t[0]);
  await p.locator('#sheet [data-yes="0"]').click(); await p.waitForTimeout(150);
  ok('Yes, that → ticked', /^✓ Kozhi curry/.test((await rows())[0]));
  await p.click('[data-saylog]'); await p.waitForTimeout(400);
  t = await say('second gravy');
  ok('…and after that, "second gravy" is sure too', /^✓ Kozhi curry you usually/.test(t[0]), t[0]);
  await close();

  // the × and Undo
  t = await say('2 kozhi curry, filter coffee');
  await p.locator('#sheet .tick').nth(1).locator('.rm').click(); await p.waitForTimeout(150);
  t = await rows();
  ok('× leaves a row out (Left out · Undo), Log this', /“filter coffee” left out Undo/.test(t[1]) && (await p.locator('[data-saylog]').innerText()) === 'Log this', t[1]);
  await p.locator('#sheet [data-undo="1"]').click(); await p.waitForTimeout(150);
  ok('Undo brings it back', /^✓ Filter coffee/.test((await rows())[1]) && (await p.locator('[data-saylog]').innerText()) === 'Log these 2');
  await close();

  // time of day: "coffee" in the morning was filter coffee, in the evening cold coffee
  const teach = async (fid, n) => { for (let i = 0; i < n; i++) { t = await say('coffee'); const first = t[0];
    if (!new RegExp(fid === 'fF' ? '^✓ Filter coffee' : '^✓ Cold coffee').test(first)) { await p.locator('#sheet [data-find="0"]').click(); await p.waitForTimeout(150); await p.locator('#sheet .tick.finding input').fill(fid === 'fF' ? 'filter' : 'cold'); await p.waitForTimeout(250); await p.locator('#sheet [data-use][data-mine="' + fid + '"]').click(); await p.waitForTimeout(150); }
    await p.click('[data-saylog]'); await p.waitForTimeout(350); } };
  await teach('fF', 2);                                                            // 8am
  await p.clock.setFixedTime(new Date('2026-11-18T19:30:00+11:00')); await teach('fC', 2); // 7:30pm
  t = await say('coffee'); const eve = t[0]; await close();
  await p.clock.setFixedTime(new Date('2026-11-19T08:05:00+11:00')); await p.goto(BASE + '#/home'); await p.goto(BASE + '#/food'); await p.waitForTimeout(800);
  t = await say('coffee'); const morn = t[0];
  ok('time of day: "coffee" at 8am → Filter coffee, at 7:30pm → Cold coffee', /^✓ Filter coffee/.test(morn) && /^✓ Cold coffee/.test(eve), morn + ' | ' + eve);
  await close();

  // Forget
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(400);
  ok('Settings → More shows Forget what Just say it learned', await p.locator('[data-forget]').count() === 1);
  await p.click('[data-forget]'); await p.waitForTimeout(200); await p.click('[data-forgetyes]'); await p.waitForTimeout(300);
  st = await p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  ok('…forgetting clears it, keeps the food log, and the row goes', !st.sayModel && st.meals.length >= 6 && await p.locator('[data-forget]').count() === 0, String(st.meals.length));
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/food'); await p.waitForTimeout(600);
  t = await say('chicken gravy');
  ok('…and "chicken gravy" asks again', /^\? Is this it\?/i.test(t[0]), t[0]);
  await close();
  // backups keep it
  const bk = await p.evaluate(async () => { const S = await import('./js/store.js'), Y = await import('./js/say.js'); Y.learn('chicken gravy', S.get().myFoods[0], 2, { fixed: true }); S.save(); const txt = S.exportJSON ? S.exportJSON() : JSON.stringify(S.get()); const c = S.checkBackup(txt); return { has: /"sayModel"/.test(txt), ok: !!c.data }; });
  ok('backups carry what it learned, and restore accepts them', bk.has && bk.ok, JSON.stringify(bk));
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('saylearn: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
