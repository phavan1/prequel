// v71: kg or lb. Saved in kg, shown and typed in your unit. New people pick it in Move's first setup (the guess is
// picked for them); people already using Prequel get the guess (lb only when the phone's language code ends in -US
// AND the time zone is in the US), and can change it in Settings. Someone moved to lb with weights already saved is
// asked once: "Were your earlier numbers in pounds?". Throwaway profiles, made-up data only.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/weightunit.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
const OLD = (S) => { // an existing user's data, saved before v71 (no weightUnit, no lbAsked)
  const st = S.get(); st.newsSeen = 999; st.moveSetup = { picked: ['gym'], custom: {} };
  st.sessions.push({ id: 's1', date: '2026-10-20', ts: 1, workoutId: 'fbA', workoutName: 'Full Body A', exercises: [{ key: 'chest', name: 'Chest press', swap: null, sets: [{ a: '50', b: '10' }, { a: 'b+10', b: '8' }] }, { key: 'legpress', name: 'Leg press', swap: null, sets: [{ a: '7', b: '12' }] }] });
  st.weights.push({ id: 'w1', date: '2026-10-20', ts: 1, kg: 150, where: 'Gym' });
};
async function phone(b, locale, timezoneId, seed) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale, timezoneId });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  if (seed) { // write the old data straight into storage, then load the app fresh (as after an update)
    await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
    await p.evaluate(async src => { const S = await import('./js/store.js'); (new Function('S', 'return (' + src + ')(S)'))(S); delete S.get().weightUnit; delete S.get().lbAsked; await S.saveNow(); }, OLD.toString());
    await p.reload(); await p.waitForTimeout(1500);
  } else { await p.goto(BASE + '#/home'); await p.waitForTimeout(1500); }
  await p.evaluate(() => document.querySelectorAll('.hello').forEach(e => e.remove()));
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  return { p, ctx, st };
}
const key = async (p, k) => { await p.locator('[data-k="' + k + '"]').dispatchEvent('pointerdown'); await p.waitForTimeout(40); };

(async () => {
  const b = await chromium.launch();

  // 1. Australia: stays kg, nothing asked
  { const { p, ctx, st } = await phone(b, 'en-AU', 'Australia/Sydney', true);
    ok('an existing user in Australia stays in kg', (await st()).weightUnit === 'kg');
    await p.goto(BASE + '#/move'); await p.waitForTimeout(800);
    ok('…and is never asked about pounds', !(await p.locator('[data-lbold]').count()));
    await ctx.close(); }

  // 2. "English (US)" on a phone in India: still kg (both clues must point to the US)
  { const { ctx, st } = await phone(b, 'en-US', 'Asia/Kolkata', true);
    ok('English (US) outside the US stays kg', (await st()).weightUnit === 'kg'); await ctx.close(); }

  // 3. An existing user in the US: lb, asked once about the old numbers; Yes keeps them as typed
  { const { p, ctx, st } = await phone(b, 'en-US', 'America/Chicago', true);
    ok('an existing user in the US gets lb', (await st()).weightUnit === 'lb');
    await p.goto(BASE + '#/move'); await p.waitForTimeout(900);
    ok('Move asks once: were your earlier numbers in pounds?', /earlier numbers in pounds/.test(await p.locator('#sheet').innerText().catch(() => '')));
    await p.screenshot({ path: OUT + '/wu-ask.png' });
    await p.click('[data-lbold="yes"]'); await p.waitForTimeout(300);
    let s = await st();
    const sets = s.sessions[0].exercises[0].sets, leg = s.sessions[0].exercises[1].sets[0];
    ok('Yes: saved as the kg the pounds meant (50 lb, 10 lb each side, 150 lb body weight)', Math.abs(parseFloat(sets[0].a) - 22.6796) < 0.001 && /^b\+4\.53/.test(sets[1].a) && Math.abs(s.weights[0].kg - 68.04) < 0.01, JSON.stringify(sets) + ' ' + s.weights[0].kg);
    ok('plates (a machine pin) are left alone', leg.a === '7');
    ok('the weight row shows 150 lb', /150 lb/.test(await p.locator('[data-weight]').innerText()));
    await p.goto(BASE + '#/home'); await p.goto(BASE + '#/move'); await p.waitForTimeout(800);
    ok('not asked again', !(await p.locator('[data-lbold]').count()));
    // the gym in lb
    await p.click('[data-act="gym"]'); await p.waitForTimeout(300); await p.click('[data-start="fbA"]'); await p.waitForTimeout(300); await p.click('[data-ex="1"]'); await p.waitForTimeout(200);
    const say = await p.locator('.say').innerText(), box = await p.locator('.field[data-f="a"]').innerText();
    ok('"Last time" in lb, as typed', /50lb × 10/.test(say) && /bar \+ 10lb each side × 8/.test(say), say);
    ok('the box says WEIGHT · LB, the toggle lb | plate, hint "last 50"', /WEIGHT · LB/.test(box) && /lb/.test(box) && /plate/.test(box) && /last 50/.test(box), box.replace(/\n/g, ' '));
    ok('the nudges are ±5 lb', await p.locator('[data-n="5"]').count() === 1);
    await p.screenshot({ path: OUT + '/wu-gym.png' });
    await key(p, '4'); await key(p, '5'); await p.click('[data-next]'); await key(p, '1'); await key(p, '0'); await p.click('[data-next]'); await p.waitForTimeout(150);
    await p.click('[data-same]'); await p.waitForTimeout(150);
    s = await st(); const lg = s.active.log[1];
    ok('45 lb is saved as kg, and Same again repeats it exactly', Math.abs(parseFloat(lg[0].a) - 20.4117) < 0.0001 && lg[1].a === lg[0].a, JSON.stringify(lg));
    ok('the sets read 45lb × 10', /45lb × 10/.test(await p.locator('#sets').innerText()));
    await p.click('[data-bp]'); await key(p, '2'); await key(p, '5'); await p.waitForTimeout(100);
    ok('Bar + says LB EACH SIDE', /BAR \+ · LB EACH SIDE/.test(await p.locator('.field[data-f="a"]').innerText()));
    await p.click('[data-next]'); await key(p, '8'); await p.click('[data-next]'); await p.waitForTimeout(150);
    s = await st(); ok('Bar + 25 lb each side is saved in kg', /^b\+11\.33/.test(s.active.log[1][2].a), s.active.log[1][2].a);
    await p.click('[data-finish]'); await p.waitForTimeout(400);
    await p.screenshot({ path: OUT + '/wu-finish.png' });
    await ctx.close(); }

  // 4. Fix this workout in lb: shows lb, an untouched number goes back exactly, a changed one is converted
  { const { p, ctx, st } = await phone(b, 'en-US', 'America/New_York', true);
    await p.evaluate(async () => { const S = await import('./js/store.js'); S.get().lbAsked = true; S.get().sessions[0].exercises[0].sets[0].a = '20.4117'; S.save(); });
    await p.evaluate(async () => { const d = await import('./js/screens/days.js'); d.editSession(document.querySelector('main'), 's1', () => {}); }); await p.waitForTimeout(400);
    const vals = await p.locator('#sheet [data-a]').evaluateAll(xs => xs.map(x => x.value));
    ok('Fix this workout shows pounds (45, and 10 kg each side as 22, plate 7)', vals[0] === '45' && vals[1] === '22' && vals[2] === '7', JSON.stringify(vals));
    ok('the kind menu says lb', /lb/.test(await p.locator('#sheet select').first().innerText()));
    await p.screenshot({ path: OUT + '/wu-fix.png' });
    await p.locator('#sheet [data-a]').nth(1).fill('15');
    await p.click('#sheet [data-o="save"]'); await p.waitForTimeout(300);
    const s = await st(), z = s.sessions[0].exercises[0].sets;
    ok('untouched 45 lb goes back exactly; 15 lb each side is converted', z[0].a === '20.4117' && /^b\+6\.80/.test(z[1].a) && s.sessions[0].exercises[1].sets[0].a === '7', JSON.stringify(z));
    await ctx.close(); }

  // 5. A brand-new person in the US: Move's setup asks kg or lb with lb picked; new body weights in lb
  { const { p, ctx, st } = await phone(b, 'en-US', 'America/Los_Angeles', false);
    await p.evaluate(async () => { const S = await import('./js/store.js'); S.get().newsSeen = 999; S.save(); });
    await p.goto(BASE + '#/move'); await p.waitForTimeout(700);
    ok('the first Move setup asks kg or lb, lb picked', /kg or lb/.test(await p.locator('.picker').innerText()) && (await p.locator('[data-wpick="lb"]').getAttribute('aria-pressed')) === 'true');
    await p.locator('[data-wpick]').first().scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/wu-setup.png' });
    await p.click('[data-pick="gym"]'); await p.click('[data-picksave]'); await p.waitForTimeout(500);
    let s = await st(); ok('saved as lb, and never asked about old numbers', s.weightUnit === 'lb' && s.lbAsked === true && !(await p.locator('[data-lbold]').count()));
    await p.click('[data-weight]'); await p.waitForTimeout(300);
    ok('the weight box says lb', (await p.locator('#wKg').getAttribute('placeholder')) === 'lb');
    await p.fill('#wKg', '150'); await p.click('#sheet [data-o="save"]'); await p.waitForTimeout(300);
    s = await st(); ok('150 lb saved as 68.04 kg, shown as 150 lb', Math.abs(s.weights[0].kg - 68.04) < 0.001 && /150 lb/.test(await p.locator('#sheet .daylist').innerText()));
    await p.click('#sheet [data-close]'); await p.waitForTimeout(200);
    // Settings: switch to kg and back; no question (nothing was ever typed into kg boxes)
    await p.goto(BASE + '#/settings'); await p.waitForTimeout(500);
    ok('Settings has Weights in: kg / lb, with lb on', (await p.locator('[data-wunit="lb"]').getAttribute('aria-pressed')) === 'true');
    await p.locator('[data-wunit]').first().scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/wu-settings.png' });
    await p.click('[data-wunit="kg"]'); await p.waitForTimeout(300);
    s = await st(); ok('switching to kg changes only how it shows', s.weightUnit === 'kg' && Math.abs(s.weights[0].kg - 68.04) < 0.001);
    await p.click('[data-wunit="lb"]'); await p.waitForTimeout(300);
    ok('switching back: no question', !(await p.locator('[data-lbold]').count()));
    await ctx.close(); }

  // 6. A kg user with workouts switches to lb in Settings: asked; No converts (50 kg → 110.2 lb)
  { const { p, ctx, st } = await phone(b, 'en-AU', 'Australia/Sydney', true);
    await p.goto(BASE + '#/settings'); await p.waitForTimeout(500);
    await p.click('[data-wunit="lb"]'); await p.waitForTimeout(400);
    ok('switching to lb with old weights asks once', await p.locator('[data-lbold]').count() === 2);
    await p.click('[data-lbold="no"]'); await p.waitForTimeout(300);
    const s = await st(); ok('No: the numbers stay kg underneath', s.sessions[0].exercises[0].sets[0].a === '50' && s.lbAsked === true);
    await p.goto(BASE + '#/journey?from=me'); await p.waitForTimeout(600);
    const j = await p.locator('main').innerText();
    ok('Your moving journey shows lb (50 kg → 110.2 lb)', /110\.2/.test(j) && /lb/.test(j) && !/\bkg\b/.test(j));
    await ctx.close(); }

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('weightunit: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
