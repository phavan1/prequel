// v43: weights that aren't numbers (Not noted, Bar only, Body weight), body-weight exercises (and fixing old 0 kg
// sets), the ⋯ sheet (remove an exercise added by mistake, fix the order), Copy on the done sheet, Your last
// workout, and fixing a past session in Days. Fictional data only, throwaway profiles.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/moveedit.js
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
  const type = async s => { for (const c of s) await key(c); };
  const sets = async () => (await p.locator('#sets .set:not(.slot)').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
  // v48: Move opens on the hub. Pick Gym once in the first-time picker, then open the Gym tile
  const toGym = async (pg = p) => { if (await pg.locator('.picker [data-picksave]').count()) { if ((await pg.locator('[data-pick="gym"]').getAttribute('aria-pressed')) !== 'true') await pg.click('[data-pick="gym"]'); await pg.click('[data-picksave]'); await pg.waitForTimeout(300); } if (await pg.locator('[data-act="gym"]').count()) { await pg.click('[data-act="gym"]'); await pg.waitForTimeout(300); } };
  await p.goto(BASE + '#/move'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(500); await toGym();
  await p.click('[data-start="fbA"]'); await p.waitForTimeout(400);

  // 1. Not noted (leg press) and Bar only (chest press)
  await p.screenshot({ path: OUT + '/me-weightwords.png' });
  await p.click('[data-wsp="nn"]'); await type('12'); await p.click('[data-next]'); await p.waitForTimeout(200);
  ok('"Not noted" logs a set without a made-up number', (await sets())[0].includes('Not noted × 12'), (await sets()).join(' | '));
  await p.click('[data-ex="1"]'); await p.click('[data-wsp="bar"]'); await type('12'); await p.click('[data-next]'); await p.waitForTimeout(200);
  ok('"Bar only" logs a bar-only set', (await sets())[0].includes('Bar only × 12'));
  await p.screenshot({ path: OUT + '/me-baronly.png' });

  // 2. an exercise added by mistake: ⋯ → remove (today and from the workout)
  await p.click('[data-addex]'); await p.waitForTimeout(300); await p.click('[data-pickex="face"]'); await p.waitForTimeout(300);
  let s = await st(); ok('face pull got added (and kept in Full Body A)', s.active.items.some(x => x[0] === 'face') && (s.workoutAdds.fbA || []).some(x => x[0] === 'face'));
  await p.click('[data-exmenu]'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/me-menu.png' });
  await p.click('[data-rmboth]'); await p.waitForTimeout(150); await p.click('[data-rmboth]'); await p.waitForTimeout(300);
  s = await st(); ok('⋯ → remove takes it out of today and of Full Body A', !s.active.items.some(x => x[0] === 'face') && !(s.workoutAdds.fbA || []).some(x => x[0] === 'face'));
  ok('the sets already logged stay where they were', s.active.log[0][0].a === 'nn' && s.active.log[1][0].a === 'bar');

  // 3. Ab crunch at 0 kg → body weight × reps, and the 0 kg set gets fixed when asked
  const cr = s.active.items.findIndex(x => x[0] === 'crunch');
  await p.click('[data-ex="' + cr + '"]'); await p.waitForTimeout(200);
  await p.click('[data-f="a"]'); await type('0'); await p.click('[data-next]'); await type('15'); await p.click('[data-next]'); await p.waitForTimeout(200);
  await p.click('[data-exmenu]'); await p.waitForTimeout(300); await p.click('[data-meas="bw"]'); await p.waitForTimeout(300);
  ok('switching to body weight asks about the old 0 kg sets', /Fix the old 0 kg sets\?/.test(await p.locator('#sheet').innerText()));
  await p.screenshot({ path: OUT + '/me-fixzero.png' });
  await p.click('#sheet [data-o="yes"]'); await p.waitForTimeout(300);
  s = await st(); ok('the 0 kg set now says body weight', s.active.log[cr][0].a === 'bw' && s.measure.crunch === 'bw');
  ok('the screen only asks for reps now', await p.locator('.fields.one [data-f="b"]').count() === 1 && await p.locator('[data-f="a"]').count() === 0);
  await type('12'); await p.click('[data-next]'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/me-bodyweight.png' });
  ok('body-weight sets read "Body weight × reps"', (await sets()).some(t => t.includes('Body weight × 12')));

  // 4. fix the order: legpress, chest, crunch → legpress, crunch, chest
  await p.click('[data-exmenu]'); await p.waitForTimeout(300); await p.click('[data-fixorder]'); await p.waitForTimeout(300);
  await p.click('[data-up="2"]'); await p.waitForTimeout(200); await p.screenshot({ path: OUT + '/me-order.png' });
  await p.click('#sheet [data-close]'); await p.waitForTimeout(200);
  const badges = await p.locator('#exs [data-ex]').evaluateAll(els => els.map(e => (e.querySelector('.ord') || {}).textContent || ''));
  ok('the chips show the fixed order', badges[0] === '1' && badges[cr] === '2' && badges[1] === '3', badges.join(','));

  // 5. finish: Copy this workout, right on the done sheet
  await p.click('[data-finish]'); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/me-done.png' });
  await p.click('#sheet [data-copydone]'); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  console.log('\n----- copied -----\n' + clip + '\n------------------');
  ok('Copy this workout copies it, in the fixed order with words for weights', /1\. Leg press\n   weight not noted × 12/.test(clip) && /2\. Ab crunch\n   body weight × 15  ·  body weight × 12/.test(clip) && /3\. Chest press\n   bar only × 12/.test(clip));
  await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  ok('Move shows just "Your last workout"', /YOUR LAST WORKOUT/i.test(await p.locator('main').innerText()) && await p.locator('.sesslist .sessrow').count() === 1 && await p.locator('[data-allsess]').count() === 0);

  // 6. Days: fix a past session (give the bar a weight, move an exercise)
  await p.goto(BASE + '#/days'); await p.waitForTimeout(500); await p.click('[data-day="2026-10-15"]'); await p.waitForTimeout(200); await p.click('[data-open="move"]'); await p.waitForTimeout(200);
  await p.locator('[data-sess]').first().click(); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/me-days-edit.png' });
  await p.selectOption('[data-ak="2:0"]', ''); await p.waitForTimeout(150); await p.fill('[data-a="2:0"]', '20');
  await p.click('[data-exup="2"]'); await p.waitForTimeout(150);
  await p.click('#sheet [data-o="save"]'); await p.waitForTimeout(300);
  s = await st(); const ex = s.sessions[0].exercises;
  ok('Days: a word weight can become a number, and exercises can be reordered', ex.map(x => x.key).join() === 'legpress,chest,crunch' && ex[1].sets[0].a === '20', ex.map(x => x.key + ':' + x.sets[0].a).join(' '));
  ok('Days keeps "Not noted" sets', ex[0].sets[0].a === 'nn');

  // 7. a new exercise can be body weight × reps
  await p.goto(BASE + '#/move'); await p.waitForTimeout(400); await toGym(); await p.click('[data-quick]'); await p.waitForTimeout(200); await p.click('[data-q="reps"]'); await p.waitForTimeout(300);
  await p.click('[data-first="plank"]'); await p.waitForTimeout(300); await p.click('[data-addex]'); await p.waitForTimeout(300);
  ok('"Body weight × reps" is a choice for a new exercise', await p.locator('[data-type="bw"]').count() === 1);
  await p.click('#sheet [data-close]'); await p.click('[data-leave]'); await p.waitForTimeout(200); await p.click('[data-o="discard"]'); await p.waitForTimeout(300);

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.join('\n') || 'no errors');
})();
