// v41: jars of 20–40 stars, shaped jars (jam, mason, cookie), different star sizes, the celebration (lid, swirl,
// shelf) incl. the belated one for jars that filled before v41; and Mind: calling a lantern back, readable sticky
// notes in Cosy dark, no zeros. Fictional data only, throwaway profiles. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/jars.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const SAMPLE = path.join(__dirname, 'sample-backup.json'); // 21 tiny wins: one jar of 20 already full
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-15T18:00:00') });
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(2600); await p.mouse.click(5, 5);
  await p.setInputFiles('#importFile', SAMPLE); await p.waitForTimeout(500); await p.click('#sheet [data-yes]'); await p.waitForTimeout(900);

  // 1. the belated celebration for the jar that filled before v41
  await p.goto(BASE + '#/wins'); await p.waitForTimeout(1200);
  ok('opening the jar celebrates the old full jar', await p.locator('#sheet .cstage').count() === 1);
  await p.screenshot({ path: OUT + '/jar-celebrate-lid.png' });
  await p.waitForTimeout(1600); await p.screenshot({ path: OUT + '/jar-celebrate-swirl.png' });
  await p.waitForTimeout(2600); await p.screenshot({ path: OUT + '/jar-celebrate-shelf.png' });
  let s = await st();
  ok('the old jar stays a jar of 20', s.jarPlan[0] === 20, JSON.stringify(s.jarPlan));
  ok('the new jar got a secret size from 20 to 40', s.jarPlan.length === 2 && s.jarPlan[1] >= 20 && s.jarPlan[1] <= 40, String(s.jarPlan[1]));
  ok('it counts as celebrated', s.jarsCelebrated === 1);
  await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.goto(BASE + '#/wins'); await p.waitForTimeout(900);
  ok('it doesn\'t celebrate again', await p.locator('#sheet .cstage').count() === 0);

  // 2. filling the current jar to its secret size celebrates it, with the earlier jar on the mini shelf
  s = await st();
  const need = s.jarPlan[1] - 1; // one star is already in the current jar
  await p.evaluate(async n => { const m = await import('./js/store.js'); for (let i = 0; i < n - 1; i++) m.addMoment('win', 'Test win ' + i, '2026-10-0' + (1 + (i % 9))); m.save(); }, need);
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/wins'); await p.waitForTimeout(900);
  if (await p.locator('#sheet [data-close]').count()) { await p.click('#sheet [data-close]'); await p.waitForTimeout(200); }
  await p.screenshot({ path: OUT + '/jar-nearly-full.png' });
  await p.fill('#ownWin', 'The last star'); await p.click('[data-write]'); await p.waitForTimeout(700);
  ok('the star that fills the jar starts the celebration', await p.locator('#sheet .cstage').count() === 1 && await p.locator('#sheet .cslot .jarsvg').count() === 1);
  await p.waitForTimeout(4800); await p.screenshot({ path: OUT + '/jar-celebrate-2.png' });
  ok('the words appear once the jar is on the shelf', /\d+ tiny wins/.test(await p.locator('#sheet .cwords').innerText()));
  await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  s = await st();
  ok('a third jar is ready with its own size', s.jarPlan.length === 3 && s.jarsCelebrated === 2);

  // 3. shapes on the shelf: jam (20), mason (30), cookie (38)
  await p.evaluate(async () => { const m = await import('./js/store.js'); const st = m.get(); st.jarPlan = [20, 30, 38, 25];
    const have = st.moments.filter(x => x.area === 'win').length; for (let i = have; i < 98; i++) m.addMoment('win', 'Shelf win ' + i, '2026-09-' + String(1 + (i % 28)).padStart(2, '0')); st.jarsCelebrated = 3; m.save(); });
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/wins'); await p.waitForTimeout(900);
  const shapes = await p.locator('.shelf .jarsvg').evaluateAll(els => els.map(e => e.getAttribute('class')));
  ok('the shelf shows a jam, a mason and a cookie jar', /jar-jam/.test(shapes[0]) && /jar-mason/.test(shapes[1]) && /jar-cookie/.test(shapes[2]), shapes.join(' | '));
  await p.evaluate(() => document.querySelector('.shelf').scrollIntoView({ block: 'center' })); await p.screenshot({ path: OUT + '/jar-shelf.png' });
  const radii = await p.locator('.jarbox .jarsvg path[fill]').evaluateAll(els => els.length);
  ok('the current jar draws its stars', radii > 0);
  await p.click('.shelf [data-jar="3"]'); await p.waitForTimeout(300);
  ok('a shelf jar shows its own size', /38 tiny wins/.test(await p.locator('#sheet').innerText()));
  await p.click('#sheet [data-close]');

  // 4. Mind: let go, bring it back straight away; and from the lantern list later
  await p.evaluate(async () => { const m = await import('./js/store.js'); const st = m.get(); st.settings.theme = 'dark';
    ['Robotics CAT', 'Getting a job', 'Buying an iPhone', 'Text a friend'].forEach((t, i) => st.mind.push({ id: 'n' + i, text: t, remindOn: null, created: i, letGo: null })); m.save(); window.dispatchEvent(new Event('prequel-theme')); });
  await p.goto(BASE + '#/mind'); await p.waitForTimeout(500);
  const green = await p.locator('.sticky').nth(3).evaluate(e => getComputedStyle(e).backgroundColor);
  ok('the green sticky note keeps its paper colour in Cosy dark', green === 'rgb(223, 240, 220)', green);
  await p.evaluate(() => document.querySelector('.notes').scrollIntoView({ block: 'center' })); await p.screenshot({ path: OUT + '/mind-dark-notes.png' });
  ok('no "0 lanterns" line', !/\b0 lanterns/.test(await p.locator('main').innerText()));
  await p.click('[data-letgo="n3"]'); await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/mind-recall-bar.png' });
  await p.click('#snack button'); await p.waitForTimeout(400);
  s = await st();
  ok('"Bring it back" right after letting go returns the note and its star', !s.mind.find(n => n.id === 'n3').letGo && !s.moments.some(m => m.ref === 'n3'));
  await p.click('[data-letgo="n1"]'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.letgo').open = true); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('.letgo').scrollIntoView({ block: 'center' })); await p.screenshot({ path: OUT + '/mind-lanterns.png' });
  await p.click('[data-recall="n1"]'); await p.waitForTimeout(300);
  s = await st();
  ok('"Bring back" in the lantern list works later too', !s.mind.find(n => n.id === 'n1').letGo);

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.join('\n') || 'no errors');
})();
