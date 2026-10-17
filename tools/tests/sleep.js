// v45: sleep, gently. The awake card (Back to sleep with "What woke you?", Breathe with me, Put it down for the
// morning), six wake feelings + your own words (and their quilt patterns), notes for your doctor in the sleep diary,
// and Move's soft Yellow hint. Fictional data only, throwaway profiles.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/sleep.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-15T23:10:00') });
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  const at = async t => { await p.clock.setSystemTime(new Date(t)); };
  await p.goto(BASE + '#/rest'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(500);
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/rest'); await p.waitForTimeout(400);

  // 1. the awake card: one main button, two quiet ones
  await p.click('[data-awakestart]'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.awakecard').scrollIntoView({ block: 'center' }));
  await p.screenshot({ path: OUT + '/sl-awake.png' });
  ok('awake card offers Back to sleep, Breathe with me and Put it down', await p.locator('.awakecard [data-awakeend]').count() === 1 && await p.locator('.awakecard [data-breathe]').count() === 1 && await p.locator('.awakecard [data-putdown]').count() === 1);

  // 2. breathe with me
  await p.click('[data-breathe]'); await p.waitForTimeout(600);
  await p.clock.runFor(4200); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/sl-breathe.png' });
  ok('Breathe with me: in for 4, then out', /And out/.test(await p.locator('.bword').innerText()) && await p.locator('.breathe.out').count() === 1);
  await p.click('#sheet [data-close]'); await p.waitForTimeout(300);

  // 3. put it down for the morning: a Mind note that comes back tomorrow (it's 11 pm)
  await p.click('[data-putdown]'); await p.waitForTimeout(300);
  await p.fill('#downTxt', 'Email the landlord about the heater');
  await p.screenshot({ path: OUT + '/sl-putdown.png' });
  await p.click('[data-putit]'); await p.waitForTimeout(300);
  let s = await st(); const note = s.mind.find(n => /landlord/.test(n.text));
  ok('Put it down saves a Mind note for the morning', note && note.remindOn === '2026-10-16' && !note.letGo, note && note.remindOn);
  ok('still awake after putting it down', !!s.awakeSince);

  // 4. back to sleep, with what woke you
  await at('2026-10-15T23:40:00');
  await p.click('[data-awakeend]'); await p.waitForTimeout(300);
  await p.fill('#wokeTxt', 'A loud dream');
  await p.screenshot({ path: OUT + '/sl-backtosleep.png' });
  await p.click('[data-goodnight]'); await p.waitForTimeout(300);
  s = await st(); const m = s.moments.find(x => /^Awake in the night: /.test(x.text));
  ok('Back to sleep logs the time and what woke you', m && /30 m from 11:10 pm/.test(m.text) && m.woke === 'A loud dream' && !s.awakeSince, m && JSON.stringify(m));

  // 5. a blank "what woke you" is fine too
  await p.click('[data-awakestart]'); await at('2026-10-15T23:50:00'); await p.click('[data-awakeend]'); await p.waitForTimeout(200); await p.click('[data-goodnight]'); await p.waitForTimeout(300);
  s = await st(); ok('leaving it empty saves no words', s.moments.filter(x => /^Awake/.test(x.text)).length === 2 && !s.moments.filter(x => /^Awake/.test(x.text))[1].woke);

  // 6. woke up: six words, one tap saves
  await p.click('[data-sleep]'); await at('2026-10-16T06:30:00'); await p.goto(BASE + '#/home'); await p.goto(BASE + '#/rest'); await p.waitForTimeout(300);
  await p.click('[data-wake]'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/sl-feels.png' });
  ok('six ways to say how you woke up', (await p.locator('#feelSeg [data-f]').allInnerTexts()).join(',') === 'Refreshed,Rested,Okay,Tired,Groggy,Restless');
  await p.click('[data-f="restless"]'); await p.waitForTimeout(300);
  s = await st(); ok('one tap on a word saves the rest, like before', s.rests.length === 1 && s.rests[0].feel === 'restless' && !s.rests[0].words);

  // 7. a nap by hand, in your own words
  await at('2026-10-16T15:30:00'); await p.goto(BASE + '#/home'); await p.goto(BASE + '#/rest'); await p.waitForTimeout(300);
  await p.click('[data-manual]'); await p.waitForTimeout(300);
  await p.fill('#rFrom', '13:00'); await p.fill('#rTo', '15:00');
  await p.click('[data-f="tired"]'); await p.click('[data-ownwords]'); await p.fill('#fWords', 'heavy eyes but calmer');
  await p.screenshot({ path: OUT + '/sl-ownwords.png' });
  await p.click('[data-add]'); await p.waitForTimeout(300);
  s = await st(); const nap = s.rests.find(r => r.words);
  ok('your own words are saved with the rest', nap && nap.feel === 'tired' && nap.words === 'heavy eyes but calmer');

  // 8. notes for your doctor
  await p.click('[data-docnote]'); await p.waitForTimeout(300);
  await p.fill('#docTxt', 'Woke three times. Felt jumpy after the dream.'); await p.click('[data-savenote]'); await p.waitForTimeout(200);
  await p.fill('#docTxt', 'Trying to remember: ask about timing.'); await p.click('[data-savenote]'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/sl-docnotes.png' });
  ok('notes keep their day and time', (await p.locator('.docnotes .entry').count()) === 2 && /3:30 pm/.test(await p.locator('.docnotes').innerText()));
  await p.click('[data-delnote]'); await p.waitForTimeout(200);
  s = await st(); ok('a note can be removed', s.doctorNotes.length === 1);
  await p.click('#sheet [data-close]'); await p.waitForTimeout(200);
  ok('the card says how many notes', /1 note so far/.test(await p.locator('main').innerText()));
  await p.evaluate(() => window.scrollTo(0, 9999)); await p.screenshot({ path: OUT + '/sl-doccard.png' });

  // 9. the sleep diary: feelings by name, and a Notes section in your own words
  const drawn = await p.evaluate(async () => {
    const said = [], orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, ...r) { said.push(String(t)); return orig.call(this, t, ...r); };
    const r = await import('./js/reports.js'); await r.sleepDiary('2026-10-10', '2026-10-16');
    CanvasRenderingContext2D.prototype.fillText = orig; return said.join(' | ');
  });
  ok('diary shows the feeling words', /Restless/.test(drawn) && /Tired/.test(drawn));
  ok('diary has a Notes section with what woke me, my words and the doctor note', /Notes/.test(drawn) && /What woke me: A loud dream/.test(drawn) && /How I woke up: heavy eyes but calmer/.test(drawn) && /Woke three times/.test(drawn) && !/Trying to remember/.test(drawn));

  // 10. the quilt: new words sew with the right family; the care label explains it
  const fam = await p.evaluate(async () => { const q = await import('./js/screens/quilt.js'); return q.patches().map(x => x.feel + ':' + x.fabrics.map(f => f.pat).join('/')).join(' '); });
  ok('restless sews a wavy pattern', /restless:(waves|zigzag|triangles|knots|stripes)\//.test(fam), fam);
  await p.goto(BASE + '#/quilt'); await p.waitForTimeout(800); await p.click('[data-care]'); await p.waitForTimeout(300);
  ok('care label names the six words', /refreshed or rested.*okay or tired.*groggy or restless/s.test(await p.locator('#sheet').innerText()));
  await p.click('#sheet [data-close]');

  // 11. Move: a soft Yellow hint after a restless night, gone once you pick
  await at('2026-10-16T07:00:00');
  await p.evaluate(async () => { const S = await import('./js/store.js'); const st = S.get(); st.rests = st.rests.filter(r => !r.words); S.save(); }); // just the restless night
  await p.goto(BASE + '#/move'); await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/sl-movehint.png' });
  ok('Move gently suggests Yellow after waking restless', /You woke up restless\. Yellow might be kinder today/.test(await p.locator('.resthint').innerText().catch(() => '')));
  await p.click('.resthint'); await p.waitForTimeout(200);
  ok('tapping it picks Yellow, and the hint steps aside', await p.locator('[data-light="yellow"][aria-pressed="true"]').count() === 1 && await p.locator('.resthint').count() === 0);

  // 12. split sleep isn't punished: 3 h at night + a long afternoon rest, felt okay → no hint
  const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push(e.message));
  await p2.clock.install({ time: new Date('2026-10-16T18:00:00') });
  await p2.goto(BASE + '#/move'); await p2.waitForTimeout(400);
  await p2.evaluate(async () => { const S = await import('./js/store.js'); const st = S.get(); const d = t => new Date(t).getTime();
    st.rests = [{ id: 'a', date: '2026-10-16', start: d('2026-10-16T01:00:00'), end: d('2026-10-16T04:00:00'), feel: 'okay' }, { id: 'b', date: '2026-10-16', start: d('2026-10-16T13:00:00'), end: d('2026-10-16T16:00:00'), feel: 'okay' }]; S.save(); });
  await p2.goto(BASE + '#/home'); await p2.goto(BASE + '#/move'); await p2.waitForTimeout(400);
  ok('no hint after 3 h + 3 h that felt okay', await p2.locator('.resthint').count() === 0);
  await p2.evaluate(async () => { const S = await import('./js/store.js'); const st = S.get(); st.rests = st.rests.slice(0, 1); S.save(); });
  await p2.goto(BASE + '#/home'); await p2.goto(BASE + '#/move'); await p2.waitForTimeout(400);
  ok('a hint after only 3 h in a day', /Not much rest in the last day/.test(await p2.locator('.resthint').innerText().catch(() => '')));

  // 13. old nights keep their meaning, and backups with doctor notes are accepted
  const old = await p.evaluate(async () => { const D = await import('./js/data.js'); return [D.feelFamily('groggy'), D.feelFamily('rested'), D.feelFamily(undefined), D.feelLabel('okay')].join(','); });
  ok('old words keep their family', old === 'groggy,rested,okay,Okay', old);
  const chk = await p.evaluate(async () => { const S = await import('./js/store.js'); return [!!S.checkBackup(JSON.stringify({ v: 1, moments: [], doctorNotes: [{ id: 'x', date: '2026-10-16', ts: 1, text: 'hi' }] })).data, S.checkBackup(JSON.stringify({ v: 1, moments: [], doctorNotes: 'oops' })).problem]; });
  ok('backups: doctor notes are checked like everything else', chk[0] === true && chk[1] === 'damaged', JSON.stringify(chk));

  // 14. v47: the sleep diary's Week by week, only when two or more weeks have sleep
  const wk = await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(), T = (d, h) => new Date(d + 'T00:00:00').getTime() + h * 3600000;
    st.rests = ['2026-10-06', '2026-10-07', '2026-10-13', '2026-10-14'].map((d, i) => ({ id: 'w' + i, date: d, start: T(d, 1), end: T(d, 5 + i), feel: 'okay' })); S.save();
    const run = async (a, z) => { const said = [], orig = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, ...r) { said.push(String(t)); return orig.call(this, t, ...r); }; await (await import('./js/reports.js')).sleepDiary(a, z); CanvasRenderingContext2D.prototype.fillText = orig; return said.join(' | '); };
    return [await run('2026-10-05', '2026-10-16'), await run('2026-10-12', '2026-10-16')];
  });
  ok('Week by week: one row per week with typical rest and the range', /Week by week/.test(wk[0]) && /Week of Mon, Oct 5/.test(wk[0]) && /Week of Mon, Oct 12/.test(wk[0]) && /4 h 30 m/.test(wk[0]) && /6 h – 7 h/.test(wk[0]));
  ok('a single week has no Week by week', !/Week by week/.test(wk[1]));

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.join('\n') || 'no errors');
})();
