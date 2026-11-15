// v116: a number you didn't change is saved exactly as it was. In lb (or miles) two different saved numbers can look
// the same (12.5 kg and 12.52 kg both read 27.6 lb). Before v116 one shared lookup turned "27.6" back into kg, so
// saving Fix this workout without touching anything could swap one for the other. Now each box remembers where its
// own number came from. Same for distances (5 km and 5.004 km both read 3.11 mi) and Bar + (kg each side).
// Throwaway profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/keepexact.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  await p.evaluate(async () => { const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999; st.weightUnit = 'lb'; st.lbAsked = true; st.distUnit = 'mi';
    st.moveSetup = { picked: ['gym', 'run'], custom: {} };
    st.sessions.push({ id: 'k1', date: '2026-11-10', ts: 1, workoutId: 'uA', workoutName: 'Upper A', exercises: [
      { key: 'curl', name: 'Biceps curl', swap: null, sets: [{ a: '12.5', b: '8' }, { a: '12.52', b: '8' }, { a: '12.5', b: '6' }] },
      { key: 'bench', name: 'Bench press', swap: null, sets: [{ a: 'b+10', b: '8' }, { a: 'b+9.99', b: '8' }] }] });
    st.activities = [{ id: 'rA', date: '2026-11-10', ts: 1, type: 'run', f: { dist: 5 } }, { id: 'rB', date: '2026-11-12', ts: 2, type: 'run', f: { dist: 5.004 } }];
    S.save(); });
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));

  // 1. Fix this workout, saved without changing a number
  await p.goto(BASE + '#/days'); await p.waitForTimeout(400);
  await p.evaluate(async () => { const D = await import('./js/screens/days.js'); D.editSession(document.querySelector('main'), 'k1', () => {}); }); await p.waitForTimeout(300);
  const shown = await p.locator('#sheet [data-a]').evaluateAll(els => els.map(e => e.value));
  ok('look-alikes really do look alike in lb', shown[0] === shown[1] && shown[3] === shown[4], shown.join(' | '));
  await p.click('#sheet [data-o="save"]'); await p.waitForTimeout(300);
  let s = await st(); let ex = s.sessions.find(x => x.id === 'k1').exercises;
  ok('saving untouched keeps every weight exactly (12.5, 12.52, 12.5)', ex[0].sets.map(z => z.a).join() === '12.5,12.52,12.5', ex[0].sets.map(z => z.a).join());
  ok('…and every Bar + exactly (b+10, b+9.99)', ex[1].sets.map(z => z.a).join() === 'b+10,b+9.99', ex[1].sets.map(z => z.a).join());
  // + Add a set copies the last set, and keeps its exact weight
  await p.evaluate(async () => { const D = await import('./js/screens/days.js'); D.editSession(document.querySelector('main'), 'k1', () => {}); }); await p.waitForTimeout(300);
  await p.locator('#sheet [data-addset="0"]').click(); await p.waitForTimeout(200);
  await p.locator('#sheet [data-a="0:1"]').fill('30'); // one number you did change
  await p.click('#sheet [data-o="save"]'); await p.waitForTimeout(300);
  s = await st(); ex = s.sessions.find(x => x.id === 'k1').exercises;
  ok('a changed number is converted (30 lb → 13.6078 kg); the rest stay exact; the added set copies 12.5', ex[0].sets.map(z => z.a).join() === '12.5,13.6078,12.5,12.5', ex[0].sets.map(z => z.a).join());

  // 2. the helpers themselves don't depend on what was shown last
  const h = await p.evaluate(async () => { const U = await import('./js/units.js');
    U.showNum('12.5'); U.showNum('12.52'); const a = U.kgA('27.6', '12.5'), c = U.kgA('27.6'), bp = U.kgA('b+22', 'b+10');
    U.distShow('dist', 5); U.distShow('dist', 5.004); const d = U.distSave('dist', 3.11, 5), e = U.distSave('dist', 3.2, 5);
    return { a, c, bp, d, e }; });
  ok('kgA keeps the box\'s own original, even after a look-alike was shown', h.a === '12.5' && h.bp === 'b+10', JSON.stringify(h));
  ok('…and with no original, it converts', h.c === '12.5191', JSON.stringify(h));
  ok('distSave keeps the box\'s own original; a changed one converts', h.d === 5 && h.e === 5.15, JSON.stringify(h));

  // 3. a run edited in miles, after the look-alike was shown last
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/move'); await p.waitForTimeout(400);
  await p.click('[data-act="run"]'); await p.waitForTimeout(300);
  await p.locator('#sheet [data-entry="rA"]').click(); await p.waitForTimeout(200); await p.click('#sheet [data-o="edit"]'); await p.waitForTimeout(200);
  await p.evaluate(async () => { (await import('./js/units.js')).distShow('dist', 5.004); }); // something else shows 3.11 meanwhile
  await p.click('[data-feel="Good"]'); await p.click('[data-alsave]'); await p.waitForTimeout(300);
  s = await st(); ok('a run you didn\'t change stays exactly 5 km', s.activities.find(a => a.id === 'rA').f.dist === 5, JSON.stringify(s.activities.map(a => a.f)));
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('keepexact: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
