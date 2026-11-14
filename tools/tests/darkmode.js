// v107: dark mode, checked by contrast. Every visible word on the main pages (and a few opened states: a letter, a
// sealed envelope, Rest while asleep, the month-start recap nudge, Settings' area sheet) must stand out from what's
// actually behind it (contrast 3 or more). Faded-on-purpose things (future days, disabled buttons) are skipped.
// Throwaway profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/darkmode.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const SAMPLE = path.join(__dirname, 'sample-backup.json');
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
const AUDIT = () => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const mix = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = el => { const stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/url\(/.test(cs.backgroundImage)) return { grad: true }; const c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } }
    let col = parse(getComputedStyle(document.body).backgroundColor); for (let i = stack.length - 1; i >= 0; i--) col = mix(stack[i], col); return col; };
  const out = []; const seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    if (el.closest('svg')) continue;
    const fg = parse(cs.color); const bg = bgOf(el); if (!fg || bg.grad) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    if (op < 0.99 || el.closest('button:disabled, [aria-disabled="true"]')) continue; // faded on purpose (future days, disabled arrows, mid-animation)
    const f2 = mix({ ...fg, a: fg.a * op }, bg); const L1 = lum(f2), L2 = lum(bg); const cr = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    if (cr < 3) out.push({ cr: +cr.toFixed(2), text: n.textContent.trim().slice(0, 40), cls: (el.className && el.className.baseVal === undefined ? el.className : '') + ' <' + el.tagName.toLowerCase() + '> in ' + ((el.closest('[class]') || {}).className || '').toString().slice(0, 40), fg: cs.color, bg: 'rgb(' + [bg.r, bg.g, bg.b].map(Math.round) + ')' }); }
  return out;
};
async function setup(b, when) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date(when) });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(2500);
  await p.evaluate(async () => { const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999; st.settings.theme = 'dark'; st.settings.dayTabs = ['win', 'weather', 'cycle', 'music'];
    st.letters.push({ id: 'lt1', ts: new Date('2026-10-27T10:00:00').getTime(), text: 'Everything is gonna be alright.', weather: 'Clear sun' }); S.save(); });
  return p;
}
async function check(p, label, url, act) {
  await p.goto(BASE + '#/me'); await p.goto(BASE + url); await p.waitForTimeout(800);
  await p.evaluate(() => { window.dispatchEvent(new Event('prequel-theme')); document.querySelectorAll('.hello').forEach(e => e.remove()); }); await p.waitForTimeout(150);
  if (act) { await act(p); await p.waitForTimeout(500); }
  const dark = await p.evaluate(() => document.documentElement.dataset.theme) === 'dark';
  const bad = await p.evaluate(AUDIT);
  ok(label + ': every word readable in Cosy dark', dark && bad.length === 0, dark ? bad.slice(0, 3).map(x => x.cr + ' "' + x.text + '"').join(' | ') : 'not dark');
  if (bad.length) await p.screenshot({ path: OUT + '/dm-' + label.replace(/\W+/g, '-') + '.png', fullPage: true });
}
(async () => {
  const b = await chromium.launch();
  let p = await setup(b, '2026-11-14T20:30:00');
  for (const r of ['home', 'weather', 'move', 'food', 'rest', 'mind', 'days', 'me', 'quilt', 'journey', 'wall', 'settings', 'share', 'repeat', 'lookback', 'sky'])
    await check(p, r, '#/' + r + '?from=me');
  await check(p, 'letters, sealed', '#/letters');
  await check(p, 'letters, a letter open', '#/letters', p => p.click('[data-open]'));
  await check(p, 'Rest, asleep', '#/rest', async p => { await p.click('[data-sleep]'); await p.waitForTimeout(2600); });
  await check(p, 'Settings, Make it yours sheet', '#/settings', p => p.click('[data-areas]'));
  await check(p, 'the recap', '#/wall?from=me&back=2026-10');
  await p.close();
  p = await setup(b, '2026-11-03T10:00:00');
  await check(p, 'Home in the first week (recap nudge)', '#/home');
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('darkmode: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
