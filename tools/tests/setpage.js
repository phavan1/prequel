// v106: Settings, redesigned. A hello (your name, kind words), your backup up top, "Make it yours" as one card whose
// area cards open in a sheet, Days tabs as chips, Look as three little pictures, Weights in, More, Start fresh.
// Throwaway profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/setpage.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const SAMPLE = path.join(__dirname, 'sample-backup.json');
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-14T09:00:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(2500);
  const set = fn => p.evaluate(async f => { const S = await import('./js/store.js'), st = S.get(); new Function('st', f)(st); S.save(); }, fn);
  await set("st.newsSeen = 999; st.settings.name = 'Phavan'; delete st.lastBackup;");
  const open = async () => { await p.goto(BASE + '#/home'); await p.goto(BASE + '#/settings'); await p.waitForTimeout(500); };
  await open();
  ok('a hello with what he calls you', /Hi, Phavan/.test(await p.locator('.hiya').innerText()) && /He calls you Phavan/.test(await p.locator('.hiya').innerText()));
  ok('no backup yet: the strip says so, in the warm colour', /No backup saved yet/.test(await p.locator('.safe').innerText()) && await p.locator('.safe.due').count() === 1);
  ok('Make it yours is one card, with all eight areas on', /All 8 areas are on/.test(await p.locator('[data-areas]').innerText()) && await p.locator('[data-areas] .sico').count() === 8 && await p.locator('main [data-area]').count() === 0);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  ok('the page is shorter (under about 1.6 phone screens)', h < 1400, h + 'px');
  await p.screenshot({ path: OUT + '/sp-settings.png', fullPage: true });
  // the area sheet
  await p.click('[data-areas]'); await p.waitForTimeout(400);
  ok('tapping it opens the eight area cards, with what each is', await p.locator('#sheet .atile').count() === 8 && /The jar of small things you did/.test(await p.locator('#sheet').innerText()));
  await p.click('#sheet [data-area="weather"]'); await p.waitForTimeout(300);
  ok('tapping a card switches it off: dashed, "Off", and a kind toast', (await p.locator('#sheet [data-area="weather"]').getAttribute('aria-pressed')) === 'false' && /Off/.test(await p.locator('#sheet [data-area="weather"]').innerText()) && /Weather is hidden/.test(await p.locator('.toast').innerText().catch(() => '')));
  await p.screenshot({ path: OUT + '/sp-sheet.png' });
  await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  ok('Done closes it, and the card says Weather is off (its icon dashed)', await p.locator('#sheet').count() === 0 && /7 of 8 areas on · Weather is off/.test(await p.locator('[data-areas]').innerText()) && await p.locator('[data-areas] .sico.offi').count() === 1);
  ok('…the Weather chip leaves the Days tabs while Weather is off', await p.locator('[data-dtab="weather"]').count() === 0);
  await p.click('[data-areas]'); await p.waitForTimeout(300); await p.click('#sheet [data-area="weather"]'); await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  ok('switching it back on', /All 8 areas are on/.test(await p.locator('[data-areas]').innerText()));
  // chips, look, weights
  await p.click('[data-dtab="music"]'); await p.waitForTimeout(300);
  ok('a Days tab chip turns on with a tick', (await p.locator('[data-dtab="music"]').getAttribute('aria-pressed')) === 'true' && /✓ On repeat/.test(await p.locator('[data-dtab="music"]').innerText()));
  await p.click('[data-look="dark"]'); await p.waitForTimeout(300);
  ok('Look: tapping Cosy dark switches the theme, and says "✓ on" under it', await p.evaluate(() => document.documentElement.dataset.theme) === 'dark' && (await p.locator('[data-look="dark"]').getAttribute('aria-pressed')) === 'true');
  await p.screenshot({ path: OUT + '/sp-dark.png', fullPage: true });
  await p.click('[data-look="light"]'); await p.waitForTimeout(300);
  await p.click('[data-wunit="lb"]'); await p.waitForTimeout(300);
  ok('Weights in: lb is picked', (await p.locator('[data-wunit="lb"]').getAttribute('aria-pressed')) === 'true');
  await p.keyboard.press('Escape'); await p.goto(BASE + '#/home'); await p.goto(BASE + '#/settings'); await p.waitForTimeout(400);
  await p.locator('#sheet [data-close]').click().catch(() => {}); await p.click('[data-wunit="kg"]'); await p.waitForTimeout(200);
  // backup
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.safe [data-export]')]); await p.waitForTimeout(400);
  ok('Save on the strip saves a backup, and the strip says when, in words', !!dl && /Backed up 14 November/.test(await p.locator('.safe').innerText()) && await p.locator('.safe.due').count() === 0, await p.locator('.safe').innerText());
  // more
  const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null), p.click('[data-import]')]);
  ok('Restore a backup asks for a file', !!fc);
  ok('What\'s new says which version this is', /version \d+/.test(await p.locator('[data-news]').innerText()));
  await p.click('[data-words]'); await p.waitForTimeout(300);
  ok('the hello opens your name and kind words', await p.locator('#sName').count() === 1);
  await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  await p.click('[data-fresh]'); await p.waitForTimeout(300);
  ok('Start fresh still asks first', /Start fresh\?/.test(await p.locator('#sheet').innerText()));
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('setpage: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
