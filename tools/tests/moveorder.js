// v42: Move remembers the real exercise order (numbered chips, saved in that order, "Last time" shown, never
// rearranged), "Your sessions" with Copy (v43: last workout + All your sessions); Rest's "Awake for a bit". Fictional data only, throwaway profiles.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/moveorder.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-15T18:00:00') });
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  const key = async k => { await p.locator('[data-k="' + k + '"]').dispatchEvent('pointerdown'); await p.waitForTimeout(40); };
  const logSet = async (w, r) => { for (const c of w) await key(c); await p.click('[data-next]'); for (const c of r) await key(c); await p.click('[data-next]'); await p.waitForTimeout(150); };
  await p.goto(BASE + '#/move'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(500);

  // 1. Full Body A, done out of order: chest press (2nd in the plan), then shoulder press (4th), then leg press (1st)
  await p.click('[data-start="fbA"]'); await p.waitForTimeout(400);
  const names = await p.locator('#exs [data-ex]').allInnerTexts();
  await p.click('[data-ex="1"]'); await logSet('40', '10'); await logSet('40', '8');
  await p.click('[data-ex="3"]'); await logSet('15', '10');
  await p.click('[data-ex="0"]'); await logSet('4', '12');
  await p.screenshot({ path: OUT + '/mo-chips.png' });
  const badges = await p.locator('#exs [data-ex]').evaluateAll(els => els.map(e => (e.querySelector('.ord') || {}).textContent || ''));
  ok('chips get 1, 2, 3 in the order you did them', badges[1] === '1' && badges[3] === '2' && badges[0] === '3', badges.join(','));
  ok('the plan\'s own order stays as it was', (await p.locator('#exs [data-ex]').allInnerTexts()).map(t => t.replace(/^\d/, '').trim()).join('|') === names.map(t => t.trim()).join('|'));
  await p.click('[data-finish]'); await p.waitForTimeout(500); await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  let s = await st();
  ok('the session is saved in the real order', s.sessions[0].exercises.map(x => x.key).join() === 'chest,shoulder,legpress', s.sessions[0].exercises.map(x => x.key).join());

  // 2. next time: "Last time" shows that order, and nothing is rearranged
  await p.click('[data-start="fbA"]'); await p.waitForTimeout(400);
  const last = await p.locator('.lastorder').innerText().catch(() => '');
  ok('"Last time" shows the order you went in', /Chest press → Shoulder press → Leg press/.test(last), last);
  ok('the chips are not rearranged', (await p.locator('#exs [data-ex]').first().innerText()).trim() === names[0].trim());
  await p.screenshot({ path: OUT + '/mo-lasttime.png' });
  await p.click('[data-leave]'); await p.waitForTimeout(200); await p.click('[data-o="discard"]'); await p.waitForTimeout(300);

  // 3. Your sessions + Copy (and a ticked quick session)
  await p.click('[data-quick]'); await p.waitForTimeout(300); await p.click('[data-q="tick"]'); await p.waitForTimeout(300);
  await p.click('[data-tick="plank"]'); await p.click('[data-tick="lat"]'); await p.click('[data-ticklog]'); await p.waitForTimeout(400); await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  // (v43: Move shows just your last workout, plus "All your sessions")
  ok('Your last workout shows the newest, with All your sessions', (await p.locator('.sesslist .sessrow').count()) === 1 && /Quick session/.test(await p.locator('.sesslist .sessrow').first().innerText()) && await p.locator('[data-allsess]').count() === 1);
  await p.evaluate(() => document.querySelector('.sesslist').scrollIntoView({ block: 'center' })); await p.screenshot({ path: OUT + '/mo-sessions.png' });
  await p.click('[data-allsess]'); await p.waitForTimeout(300); await p.click('#sheet .sesslist [data-sess]:nth-child(2)'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/mo-session-sheet.png' });
  await p.click('#sheet [data-copy]'); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  console.log('\n----- copied -----\n' + clip + '\n------------------');
  ok('Copy puts the session on the clipboard', /^✦ Session 1 · Full Body A/.test(clip) && /1\. Chest press\n   40 kg × 10  ·  40 kg × 8/.test(clip) && /3\. Leg press\n   plate 4 × 12/.test(clip));
  await p.click('#sheet [data-close]'); await p.waitForTimeout(200);
  await p.click('main .sesslist [data-sess]'); await p.waitForTimeout(300);
  ok('a ticked session copies as "done ✓"', /done ✓/.test(await p.locator('.sesstext').innerText()));
  await p.click('#sheet [data-close]');

  // 4. Rest: no night chips; "Awake for a bit?" at night only; it logs the time and how long
  await p.goto(BASE + '#/rest'); await p.waitForTimeout(400);
  ok('the old night chips are gone', await p.locator('[data-awake]').count() === 0);
  ok('no button in the early evening', await p.locator('[data-awakestart]').count() === 0);
  await p.clock.setSystemTime(new Date('2026-10-15T23:10:00')); await p.goto(BASE + '#/home'); await p.goto(BASE + '#/rest'); await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/mo-awake-off.png' });
  await p.click('[data-awakestart]'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/mo-awake-on.png' });
  await p.clock.setSystemTime(new Date('2026-10-15T23:35:00'));
  await p.click('[data-awakeend]'); await p.waitForTimeout(300);
  s = await st();
  const m = s.moments.find(x => /^Awake in the night: /.test(x.text));
  ok('it logs "Awake in the night: 25 m from 11:10 pm" on that day', m && /25 m from 11:10 pm/.test(m.text) && m.date === '2026-10-15' && !s.awakeSince, m && m.text);
  ok('no "0 patches" before the first night', !/\b0 patches/.test(await p.locator('main').innerText()));

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.join('\n') || 'no errors');
})();
