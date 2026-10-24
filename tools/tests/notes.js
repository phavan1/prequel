// v60: remove a Mind note or a lantern straight from the list (a × that asks once), and the talking head on the
// gym page. Fictional data only, throwaway profiles.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/notes.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(2000); await p.mouse.click(5, 5); await p.waitForTimeout(400);
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    st.mind.push({ id: 'n1', text: 'Book the dentist', remindOn: null, created: 1, letGo: null });
    st.mind.push({ id: 'n2', text: 'Email about the bike', remindOn: null, created: 2, letGo: null });
    st.mind.push({ id: 'l1', text: 'That awkward meeting', remindOn: null, created: 3, letGo: 5 });
    st.moments.push({ id: 'm1', date: S.today(), ts: 5, area: 'mind', text: 'Let go: That awkward meeting', ref: 'l1' });
    S.save();
  });
  await p.goto(BASE + '#/mind'); await p.waitForTimeout(500);
  ok('every note has a ×', await p.locator('.sticky [data-rmnote]').count() === 2);
  await p.locator('details.letgo summary').click(); await p.waitForTimeout(200);
  ok('every lantern has a × too', await p.locator('.item.lantern [data-rmnote]').count() === 1);
  await p.screenshot({ path: OUT + '/nt-mind.png' });

  // a note: × asks once; Keep it keeps it
  await p.click('.sticky [data-rmnote="n1"]'); await p.waitForTimeout(250);
  ok('× asks "Remove it completely?" with the note', /Remove it completely\?/.test(await p.locator('#sheet').innerText()) && /Book the dentist/.test(await p.locator('#sheet').innerText()));
  await p.screenshot({ path: OUT + '/nt-confirm.png' });
  await p.click('#sheet [data-close]'); await p.waitForTimeout(250);
  ok('Keep it keeps it', (await st()).mind.some(n => n.id === 'n1'));
  await p.click('.sticky [data-rmnote="n1"]'); await p.waitForTimeout(250); await p.click('#sheet [data-o="del"]'); await p.waitForTimeout(300);
  ok('Remove it removes the note', !(await st()).mind.some(n => n.id === 'n1') && (await st()).mind.some(n => n.id === 'n2'));

  // a lantern: removed, and its star leaves the sky
  await p.locator('details.letgo summary').click().catch(() => {}); await p.waitForTimeout(200);
  if (!(await p.locator('.item.lantern [data-rmnote]').isVisible())) { await p.locator('details.letgo summary').click(); await p.waitForTimeout(200); }
  await p.click('.item.lantern [data-rmnote="l1"]'); await p.waitForTimeout(250);
  ok('a lantern says it will leave your sky', /leave your sky/.test(await p.locator('#sheet').innerText()));
  await p.click('#sheet [data-o="del"]'); await p.waitForTimeout(300);
  const s = await st();
  ok('the lantern and its star are gone', !s.mind.some(n => n.id === 'l1') && !s.moments.some(m => m.ref === 'l1'));
  ok('tapping a note\'s words still opens Change this note', await (async () => { await p.click('.sticky [data-editnote="n2"]'); await p.waitForTimeout(250); return /Change this note/.test(await p.locator('#sheet').innerText()); })());
  await p.click('#sheet [data-close]').catch(() => {});

  // the gym page: the talking head
  await p.goto(BASE + '#/move'); await p.waitForTimeout(400);
  if (await p.locator('.picker [data-picksave]').count()) { if ((await p.locator('[data-pick="gym"]').getAttribute('aria-pressed')) !== 'true') await p.click('[data-pick="gym"]'); await p.click('[data-picksave]'); await p.waitForTimeout(300); }
  await p.click('#sheet [data-close]').catch(() => {});
  await p.click('[data-act="gym"]'); await p.waitForTimeout(300); await p.click('[data-start="uA"]'); await p.waitForTimeout(400);
  ok('the gym page shows his talking head', /talking\.webp/.test(await p.locator('.strip img').getAttribute('src')));
  await p.screenshot({ path: OUT + '/nt-gym.png' });

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no errors');
})();
