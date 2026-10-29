// v74: a soft day's quilt patch gets a gold star (not faint sparkles); an Undo right after "Fancy a slower one?";
// "Remove the star" on the back of a starred patch; "Back to my regular day" keeps the soft day; the soft page's
// jar card says "Remember this one? That was all you."; the open day on Days has a pale fill so its ring shows.
// Throwaway profile, made-up data only. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/softstar.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  const T = await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999; st.quiltSeen = []; st.moveSetup = { picked: ['gym'], custom: {} };
    const t = S.today();
    for (let i = 0; i <= 5; i++) { const e = new Date(); e.setDate(e.getDate() - i); e.setHours(7, 0, 0, 0); st.rests.push({ id: 'r' + i, date: S.dateKey(e), start: e.getTime() - 8 * 3600e3, end: e.getTime(), feel: ['rested', 'okay', 'groggy'][i % 3] }); }
    st.sessions.push({ id: 'g1', date: t, ts: 1, workoutId: 'fbA', workoutName: 'Full Body A', exercises: [{ key: 'chest', name: 'Chest press', swap: null, sets: [{ a: '20', b: '10' }] }] });
    st.moments.push({ id: 'm1', area: 'move', text: 'Full Body A · 1 set', date: t, ts: Date.now(), ref: 'g1' });
    st.moments.push({ id: 'w1', area: 'win', text: 'Went for a walk in the rain', date: '2026-10-01', ts: Date.now() - 9e8 });
    S.save(); document.querySelectorAll('.hello').forEach(e => e.remove()); return t;
  });

  // 1. Undo right after marking a soft day
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/home'); await p.waitForTimeout(400);
  await p.click('[data-heavy]'); await p.waitForTimeout(400);
  ok('marking a soft day shows "Today is a soft day. Undo"', /Today is a soft day/.test(await p.locator('#toast').innerText()) && await p.locator('#toast button').count() === 1);
  ok('the jar card says "Remember this one? That was all you."', /Remember this one\? That was all you\./.test(await p.locator('.fromjar').innerText()) && !/can again/.test(await p.locator('main').innerText()));
  await p.screenshot({ path: OUT + '/ss-undo.png' });
  await p.click('#toast button'); await p.waitForTimeout(400);
  let s = await st();
  ok('Undo: not a soft day any more, back on the regular page', !s.heavy[T] && !(await p.locator('.games').count()) && await p.locator('[data-heavy]').count() === 1);
  await p.click('[data-heavy]'); await p.waitForTimeout(6700);
  ok('the Undo note goes away by itself and the soft day stays', !(await p.locator('#toast.show').count()) && (await st()).heavy[T] === true);
  // 2. Back to my regular day keeps it
  const back = p.locator('[data-unheavy]'); await back.scrollIntoViewIfNeeded();
  ok('"Back to my regular day" is a real button', /Back to my regular day/.test(await back.innerText()) && /btn/.test(await back.getAttribute('class')));
  await p.screenshot({ path: OUT + '/ss-backbtn.png' });
  await back.click(); await p.waitForTimeout(400);
  s = await st();
  ok('going back keeps the soft day, and says so', s.heavy[T] === true && !(await p.locator('.games').count()) && /keeps its gold star/.test(await p.locator('#toast').innerText()));
  // 3. the gold star on the quilt, and removing it
  await p.goto(BASE + '#/quilt?from=home'); await p.waitForTimeout(3200);
  const gold = () => p.evaluate(() => { const c = document.getElementById('quilt'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 244) < 14 && Math.abs(d[i + 1] - 196) < 14 && Math.abs(d[i + 2] - 48) < 22) n++; return n; });
  const g1 = await gold(); ok('the soft day\'s patch has a gold star', g1 > 150, g1 + ' gold pixels');
  await p.locator('#quilt').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/ss-quilt.png' });
  // open the starred patch: tap just below and left of its star
  const box = await p.locator('#quilt').boundingBox();
  const pos = await p.evaluate(t => { const sp = document.querySelector('main').__quilt().spots.find(x => x.d.date === t); return [sp.x + sp.w / 2, sp.y + sp.S / 2]; }, T);
  await p.mouse.click(box.x + pos[0], box.y + pos[1]); await p.waitForTimeout(900);
  ok('a starred patch\'s back offers "Remove the star"', await p.locator('[data-unstar]').count() === 1);
  await p.screenshot({ path: OUT + '/ss-flip.png' });
  await p.click('[data-unstar]'); await p.waitForTimeout(900);
  s = await st();
  const left = await p.evaluate(t => { const c = document.getElementById('quilt'), sp = document.querySelector('main').__quilt().spots.find(x => x.d.date === t), k = c.width / c.clientWidth, cx = Math.round((sp.x + sp.w - sp.S * 0.2) * k), cy = Math.round((sp.y + sp.S * 0.2) * k), d = c.getContext('2d').getImageData(cx - 2, cy - 2, 5, 5).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 244) < 14 && Math.abs(d[i + 1] - 196) < 14 && d[i + 2] < 90) n++; return n; }, T);
  ok('Remove the star: not a soft day any more, and no star in that corner', !s.heavy[T] && left === 0, left + ' gold pixels where the star was');
  // 4. Days: today's ring shows, with a pale fill
  await p.goto(BASE + '#/days'); await p.waitForTimeout(500);
  await p.click('[data-tab="move"]').catch(() => {}); await p.waitForTimeout(300);
  const cell = await p.evaluate(t => { const c = document.querySelector('.cal2 [data-day="' + t + '"]'), cs = getComputedStyle(c); return { bg: cs.backgroundColor, bw: cs.borderTopWidth, bc: cs.borderTopColor, pressed: c.getAttribute('aria-pressed') }; }, T);
  ok('today is open, with a pale fill, not solid blue', cell.pressed === 'true' && !/rgb\(31, 85, 208\)/.test(cell.bg), JSON.stringify(cell));
  ok('…and its ring shows', parseFloat(cell.bw) >= 3 && /31, 85, 208/.test(cell.bc), cell.bw + ' ' + cell.bc);
  await p.locator('.cal2').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + '/ss-days.png' });
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('softstar: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
