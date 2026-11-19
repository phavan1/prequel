// v124: two things from Phavan's first open on his iPad. (1) Move's first setup asks km or miles too, next to kg or lb.
// (2) On a wide screen, Me with nothing in its first column (a new person, or goals and Move switched off) left an
// empty half and pushed everything right: now it's one centred column. Two columns as before when there's something.
// Throwaway profiles. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/firstrun.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  // (1) first setup on Move
  let p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(200);
  await p.evaluate(async () => { const S = await import('./js/store.js'), s = S.get(); s.newsSeen = 999; s.settings.areasAsked = true; delete s.moveSetup; delete s.distUnit; S.save(); });
  await p.goto(BASE + '#/move'); await p.waitForTimeout(500);
  const txt = await p.locator('main').innerText();
  ok('the first setup asks "Do you lift in kg or lb?" and "Do you go by km or miles?"', /Do you lift in kg or lb\?/.test(txt) && /Do you go by km or miles\?/.test(txt) && await p.locator('[data-dpick]').count() === 2, '');
  ok('…km picked to start (the guess here)', (await p.locator('[data-dpick="km"]').getAttribute('aria-pressed')) === 'true');
  await p.screenshot({ path: OUT + '/fr-setup.png', fullPage: true });
  await p.click('[data-pick="walk"]'); await p.click('[data-dpick="mi"]'); await p.waitForTimeout(100);
  ok('tapping miles picks it', (await p.locator('[data-dpick="mi"]').getAttribute('aria-pressed')) === 'true' && (await p.locator('[data-dpick="km"]').getAttribute('aria-pressed')) === 'false');
  await p.click('[data-picksave]'); await p.waitForTimeout(400);
  ok('That\'s me saves miles', await p.evaluate(async () => (await import('./js/store.js')).get().distUnit) === 'mi');
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/move'); await p.waitForTimeout(400);
  ok('…and it isn\'t asked again', await p.locator('[data-dpick]').count() === 0);
  await p.close();
  // (2) Me on an iPad-wide screen
  p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(200);
  await p.evaluate(async () => { const S = await import('./js/store.js'), s = S.get(); s.newsSeen = 999; s.settings.areasAsked = true; s.settings.off = ['goals', 'move']; S.save(); });
  await p.goto(BASE + '#/me'); await p.waitForTimeout(600);
  const geo = await p.evaluate(() => { const d = document.querySelector('.dcols.me3'), m = document.querySelector('main').getBoundingClientRect(), t = document.querySelector('.dcols.me3 .tiles').getBoundingClientRect();
    return { solo: d.classList.contains('solo'), mid: (t.left + t.right) / 2, mainMid: (m.left + m.right) / 2, w: t.width }; });
  ok('nothing in the first column → one centred column', geo.solo && Math.abs(geo.mid - geo.mainMid) < 4 && geo.w <= 562, JSON.stringify(geo));
  await p.screenshot({ path: OUT + '/fr-me-ipad.png' });
  await p.evaluate(async () => { const S = await import('./js/store.js'), s = S.get(); s.settings.off = []; S.save(); });
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/me'); await p.waitForTimeout(600);
  ok('with goals on (something in the first column) → two columns as before', await p.evaluate(() => !document.querySelector('.dcols.me3').classList.contains('solo')));
  await p.close();
  // phones: unchanged
  p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500); await p.mouse.click(5, 5);
  await p.evaluate(async () => { const S = await import('./js/store.js'), s = S.get(); s.newsSeen = 999; s.settings.areasAsked = true; s.settings.off = ['goals', 'move']; S.save(); });
  await p.goto(BASE + '#/me'); await p.waitForTimeout(500);
  const pw = await p.evaluate(() => document.querySelector('.dcols.me3 .tiles').getBoundingClientRect().width);
  ok('phone: the tiles still fill the width', pw > 330, String(pw));
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('firstrun: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
