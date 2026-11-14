// v108: Cosy dark in three colours. Settings → Look shows "Cosy dark colour" (Cocoa, Midnight, Plum) only when the look
// can be dark; picking one recolours the app straight away, sets the phone's status bar colour, and is remembered.
// Match my phone uses the chosen colour when the phone is dark. Throwaway profile.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/tones.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const SAMPLE = path.join(__dirname, 'sample-backup.json');
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-14T20:30:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(2500);
  await p.evaluate(async () => { const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999; st.settings.theme = 'light'; delete st.settings.darkTone; S.save(); });
  const open = async () => { await p.goto(BASE + '#/home'); await p.goto(BASE + '#/settings'); await p.waitForTimeout(500); };
  const root = () => p.evaluate(() => ({ theme: document.documentElement.dataset.theme, tone: document.documentElement.dataset.tone, room: getComputedStyle(document.body).backgroundColor, meta: document.querySelector('meta[name="theme-color"]').content }));
  await open(); await p.click('[data-look="light"]'); await p.waitForTimeout(300);
  ok('in Light, there\'s no dark colour row', await p.locator('[data-darktone]').count() === 0);
  await p.click('[data-look="dark"]'); await p.waitForTimeout(300);
  ok('in Cosy dark, three colours show, with their names, Cocoa picked', JSON.stringify(await p.locator('[data-darktone]').allInnerTexts()).replace(/✓/g, '') === '["Cocoa","Midnight","Plum"]' && (await p.locator('[data-darktone="cocoa"]').getAttribute('aria-pressed')) === 'true');
  let r = await root(); ok('Cocoa is the brown one it always was', r.tone === 'cocoa' && r.room === 'rgb(28, 24, 21)' && r.meta === '#1C1815', JSON.stringify(r));
  await p.click('[data-darktone="midnight"]'); await p.waitForTimeout(300); r = await root();
  ok('Midnight: navy, straight away, and the status bar matches', r.theme === 'dark' && r.tone === 'midnight' && r.room === 'rgb(17, 21, 31)' && r.meta === '#11151F', JSON.stringify(r));
  ok('…its button is pressed, with a tick', (await p.locator('[data-darktone="midnight"]').getAttribute('aria-pressed')) === 'true' && /✓/.test(await p.locator('[data-darktone="midnight"]').evaluate(e => getComputedStyle(e, '::after').content)));
  await p.locator('.looks').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/tn-settings-midnight.png' });
  await p.click('[data-darktone="plum"]'); await p.waitForTimeout(300); r = await root();
  ok('Plum: purple', r.tone === 'plum' && r.room === 'rgb(24, 19, 29)' && r.meta === '#18131D', JSON.stringify(r));
  await p.reload(); await p.waitForTimeout(1500); await p.evaluate(() => document.querySelectorAll('.hello').forEach(e => e.remove())); r = await root();
  ok('it\'s remembered after closing and opening', r.tone === 'plum' && r.room === 'rgb(24, 19, 29)');
  await p.goto(BASE + '#/home'); await p.waitForTimeout(600);
  ok('the room\'s floor follows the colour', await p.evaluate(() => getComputedStyle(document.querySelector('.room .floor')).backgroundColor) === 'rgb(44, 34, 54)');
  await p.screenshot({ path: OUT + '/tn-home-plum.png' });
  await open(); await p.click('[data-look="auto"]'); await p.waitForTimeout(300); r = await root();
  ok('Match my phone (phone in dark): dark, in the chosen colour, and the row stays', r.theme === 'dark' && r.tone === 'plum' && await p.locator('[data-darktone]').count() === 3);
  await p.click('[data-look="light"]'); await p.waitForTimeout(300); r = await root();
  ok('back to Light: cream again', r.theme === 'light' && r.room === 'rgb(250, 243, 220)' && r.meta === '#FAF3DC', JSON.stringify(r));
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('tones: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
