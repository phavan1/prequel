// v40: the "What's new" window (v44: latest only + "See all updates"). Shown once after an update (after the hello), never to a brand-new user, and kept
// in Settings → What's new. Fictional data only, in throwaway profiles. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/news.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const SAMPLE = path.join(__dirname, 'sample-backup.json');
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const open = async (p, hash) => { await p.goto(BASE + hash); await p.reload(); await p.waitForTimeout(3600); }; // a real reopen, not just a new address
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-15T10:00:00') });
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  const latest = await (async () => { await p.goto(BASE + '#/home'); await p.waitForTimeout(500); return p.evaluate(async () => (await import('./js/news.js')).LATEST); })();
  // 1. brand-new user: no window, marked as seen
  await open(p, '#/home');
  ok('a brand-new user doesn\'t get the window', await p.locator('.newshead').count() === 0);
  ok('...and it counts as seen', (await st()).newsSeen === latest);
  // 2. an existing user updating from before the window existed: sees the latest update once
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(400);
  await p.setInputFiles('#importFile', SAMPLE); await p.waitForTimeout(500); await p.click('#sheet [data-yes]'); await p.waitForTimeout(900);
  await p.evaluate(async () => { const s = await import('./js/store.js'); delete s.get().newsSeen; await s.saveNow(); });
  await open(p, '#/home');
  await p.screenshot({ path: OUT + '/n-window.png' });
  ok('after an update, the window shows (after the hello)', await p.locator('.newshead').count() === 1 && await p.locator('.hello').count() === 0);
  ok('it shows the latest update', (await p.locator('.newslist .newsday').count()) === 1);
  await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  await open(p, '#/home');
  ok('closed: it doesn\'t come back on the next open', await p.locator('.newshead').count() === 0);
  // 3. skipping updates shows each missed one, newest first (at most 3)
  await p.evaluate(async l => { const s = await import('./js/store.js'); s.get().newsSeen = l - 2; await s.saveNow(); }, latest);
  await open(p, '#/home');
  // (v44: only the latest shows, with "See all updates" for the rest, in the same window)
  const days = await p.locator('.newslist .newsday').count();
  ok('two missed updates: only the latest shows', days === 1, String(days));
  ok('...with "You also missed 1 earlier update"', /You also missed 1 earlier update/.test(await p.locator('#sheet').innerText()));
  await p.screenshot({ path: OUT + '/n-missed.png' });
  await p.click('#sheet [data-allnews]'); await p.waitForTimeout(200);
  const allN = await p.evaluate(async () => (await import('./js/news.js')).NEWS.length);
  ok('"See all updates" turns the same window into the full list', (await p.locator('.newslist .newsday').count()) === allN && await p.locator('#sheet').count() === 1);
  await p.screenshot({ path: OUT + '/n-all.png' });
  await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  ok('closing it is the end: no second window', await p.locator('#sheet').count() === 0);
  // 4. Settings keeps all of it
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(400);
  ok('Settings has a "What\'s new" row with the version', /What's new/.test(await p.locator('[data-news]').innerText()) && new RegExp('version ' + latest).test(await p.locator('[data-news]').innerText()));
  await p.click('[data-news]'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/n-settings.png' });
  const all = await p.evaluate(async () => (await import('./js/news.js')).NEWS.length);
  ok('Settings → What\'s new lists every update', (await p.locator('.newslist .newsday').count()) === all);
  ok('every news entry matches a version number', await p.evaluate(async () => { const n = (await import('./js/news.js')).NEWS; return n.every((x, i) => typeof x.v === 'number' && x.items.length && (!i || x.v < n[i - 1].v)); }));
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.join('\n') || 'no errors');
})();
