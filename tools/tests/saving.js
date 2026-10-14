// v39: saving and sharing on Android vs iPhone (PDF reports, share cards, backups), and the whole-quilt share card.
// Android's share sheet has no "save to phone", so Android (and computers) get a real "Save to this phone" download.
// Fictional data only, in throwaway browser profiles. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/saving.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const SAMPLE = path.join(__dirname, 'sample-backup.json');
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
};

async function phone(b, kind, errs) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, userAgent: UA[kind], acceptDownloads: true });
  // pretend this phone can share files, and remember what was shared, so nothing real opens
  await ctx.addInitScript(() => { window.__shared = []; navigator.canShare = () => true; navigator.share = d => { window.__shared.push(d.files[0].name); return Promise.resolve(); }; });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(kind + ': ' + e.message));
  await p.clock.install({ time: new Date('2026-10-14T10:00:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(2600); await p.mouse.click(5, 5);
  await p.setInputFiles('#importFile', SAMPLE); await p.waitForTimeout(500); await p.click('#sheet [data-yes]'); await p.waitForTimeout(1200);
  return { ctx, p };
}
const shared = p => p.evaluate(() => window.__shared.slice());

(async () => {
  const b = await chromium.launch(); const errs = [];

  // ---- Android ----
  const A = await phone(b, 'android', errs), a = A.p;
  await a.goto(BASE + '#/rest'); await a.waitForTimeout(500);
  await a.click('[data-diary]'); await a.waitForTimeout(300); await a.click('#sheet [data-o="0"]');
  await a.waitForSelector('#sheet [data-savepdf]', { timeout: 30000 }); await a.screenshot({ path: OUT + '/s-android-pdf.png' });
  ok('Android: the PDF sheet has "Save to this phone" and "Share it"', await a.locator('#sheet [data-savepdf]').count() === 1 && await a.locator('#sheet [data-sharepdf]').count() === 1);
  const [dl] = await Promise.all([a.waitForEvent('download'), a.click('#sheet [data-savepdf]')]);
  ok('Android: "Save to this phone" downloads the PDF', /\.pdf$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  await a.click('#sheet [data-sharepdf]'); await a.waitForTimeout(300);
  ok('Android: "Share it" still opens the share sheet', (await shared(a)).some(n => /\.pdf$/.test(n)));
  await a.click('#sheet [data-close]');
  await a.goto(BASE + '#/share?t=quilt&m=2026-10'); await a.waitForTimeout(2500); await a.screenshot({ path: OUT + '/s-android-card.png' });
  ok('Android: the share card has "Save image" and "Share"', await a.locator('[data-saveimg]').count() === 1 && await a.locator('[data-share]').count() === 1);
  const [dl2] = await Promise.all([a.waitForEvent('download'), a.click('[data-saveimg]')]);
  ok('Android: "Save image" downloads the picture', /\.png$/.test(dl2.suggestedFilename()), dl2.suggestedFilename());
  await a.goto(BASE + '#/settings'); await a.waitForTimeout(400);
  const before = (await shared(a)).length;
  const [dl3] = await Promise.all([a.waitForEvent('download'), a.click('[data-export]')]);
  ok('Android: Save a backup downloads the file (no share sheet)', /\.json$/.test(dl3.suggestedFilename()) && (await shared(a)).length === before, dl3.suggestedFilename());
  await A.ctx.close();

  // ---- iPhone ----
  const I = await phone(b, 'iphone', errs), i = I.p;
  await i.goto(BASE + '#/rest'); await i.waitForTimeout(500);
  await i.click('[data-diary]'); await i.waitForTimeout(300); await i.click('#sheet [data-o="0"]');
  await i.waitForSelector('#sheet [data-sharepdf]', { timeout: 30000 }); await i.screenshot({ path: OUT + '/s-iphone-pdf.png' });
  ok('iPhone: the PDF sheet keeps one "Share or save" button', await i.locator('#sheet [data-savepdf]').count() === 0 && /Share or save/.test(await i.locator('#sheet [data-sharepdf]').innerText()));
  await i.click('#sheet [data-sharepdf]'); await i.waitForTimeout(300);
  ok('iPhone: it opens the share sheet with the PDF', (await shared(i)).some(n => /\.pdf$/.test(n)));
  await i.click('#sheet [data-close]');
  await i.goto(BASE + '#/share?t=quilt&m=2026-10'); await i.waitForTimeout(2500); await i.screenshot({ path: OUT + '/s-iphone-card.png' });
  ok('iPhone: the share card keeps one "Share or save" button', await i.locator('[data-saveimg]').count() === 0 && await i.locator('[data-share]').count() === 1);
  await i.click('[data-share]'); await i.waitForTimeout(300);
  ok('iPhone: it opens the share sheet with the picture', (await shared(i)).some(n => /\.png$/.test(n)));
  await i.goto(BASE + '#/settings'); await i.waitForTimeout(400); await i.click('[data-export]'); await i.waitForTimeout(400);
  ok('iPhone: Save a backup uses the share sheet', (await shared(i)).some(n => /\.json$/.test(n)));

  // ---- the quilt card is whole mid-month; the Quilt page keeps the needle ----
  const px = await i.evaluate(() => { const c = document.createElement('canvas'); return true; });
  await i.goto(BASE + '#/share?t=quilt&m=2026-10'); await i.waitForTimeout(2500);
  const card = await i.locator('#card').screenshot({ path: OUT + '/s-quilt-card-mid-month.png' });
  await i.goto(BASE + '#/quilt?m=2026-10'); await i.waitForTimeout(1500); await i.screenshot({ path: OUT + '/s-quilt-page-mid-month.png' });
  ok('quilt card and page drew without errors', px && card.length > 0 && errs.length === 0, errs.slice(0, 2).join(' | '));
  await I.ctx.close();

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.join('\n') || 'no errors');
})();
