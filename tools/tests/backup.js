// Backup and restore audit. Uses fictional data only, in throwaway browser profiles.
// Run: serve the app folder on a port, then  PREQUEL_URL=http://localhost:8765/ node tools/tests/backup.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const SAMPLE = path.join(__dirname, 'sample-backup.json');
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const ROUTES = ['home', 'weather', 'move', 'food', 'rest', 'wins', 'mind', 'letters', 'days', 'me', 'sky', 'quilt', 'skate', 'settings', 'share'];
const results = []; const ok = (name, pass, note = '') => { results.push([pass ? 'PASS' : 'FAIL', name, note]); };
const strip = s => { const c = JSON.parse(JSON.stringify(s)); delete c.exported; return c; };
function diff(a, b, p = '', out = []) {
  if (out.length > 20) return out;
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) { out.push(p + ': type ' + JSON.stringify(a)?.slice(0, 60) + ' vs ' + JSON.stringify(b)?.slice(0, 60)); return out; }
  if (a && typeof a === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], p + '.' + k, out); return out; }
  if (a !== b && !(Number.isNaN(a) && Number.isNaN(b))) out.push(p + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b));
  return out;
}

async function page(b, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  if (opts.noIDB) await ctx.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { get() { throw new Error('IDB blocked for test'); } }); });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-12T10:00:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(600);
  return { ctx, p };
}
const state = p => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
async function restore(p, file) {
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(400);
  await p.setInputFiles('#importFile', file); await p.waitForTimeout(200); await p.click('[data-yes]'); await p.waitForTimeout(900);
  return (await p.locator('.toast').allInnerTexts().catch(() => [])).join(' ');
}
async function exportUI(p, name) {
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(400);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-export]')]);
  const f = path.join(OUT, name); await dl.saveAs(f); return f;
}
async function visitAll(p) { for (const r of ROUTES) { await p.goto(BASE + '#/' + r); await p.waitForTimeout(r === 'food' || r === 'share' ? 900 : 350); } }

(async () => {
  const b = await chromium.launch();
  // 1. Build a full, fictional data set: old sample backup + the app's own screens + one of every newer record type.
  const A = await page(b);
  await restore(A.p, SAMPLE);
  await visitAll(A.p); // lets screens create sky, quilt, jar and goal fields the normal way
  await A.p.evaluate(async () => {
    const m = await import('./js/store.js'); const s = m.get(); const d = '2026-10-11';
    s.sessions.push({ id: 'sx1', date: d, ts: 1791700000000, workoutId: 'w1', workoutName: 'Full Body A', light: false, exercises: [{ key: 'legpress', name: 'Leg press', swap: 'Hack squat', sets: [{ a: 62.5, b: 10 }, { a: '', b: 8 }] }] });
    s.customExercises.myrow = { n: 'Band row', t: 'wr', m: 0, rest: 'c', subs: [] }; s.subsAdded.legpress = ['Goblet squat'];
    s.customWorkouts.push({ id: 'cw1', n: 'Hotel workout', items: [['myrow', 3, '10-12']] }); s.workoutAdds.w1 = [['myrow', 2, '12']];
    s.lifts.legpress = { a: 62.5, b: 10 }; s.units.legpress = 'plate';
    s.active = { id: 'w1', n: 'Full Body A', items: [['legpress', 3, '8-10']], i: 0, log: { 0: [{ a: 60, b: 9 }] }, swap: {}, hinted: {}, light: false, date: d, started: 1791710000000, lastAt: 0 };
    s.myFoods.push({ id: 'f1', name: 'Test yoghurt', from: 'label', n: [76, 7.92, 3.04, 3.6, 2.4, null, 2.4, 25.6, null, 100, null, null], per100: [95, 9.9, 3.8, 4.5, 3, null, 3, 32, null, 125, null, null], unit: '80 g', unitG: 80, measures: [['1 tub', 170]], kind: 'packaged', uses: 3, last: 1791700000000, created: 1791600000000 });
    s.myFoods.push({ id: 'f2', name: 'Curd rice', from: 'recipe', n: [210.5, 6.1, 35.2, 4.4, 2, 0.6, 2, 210, 0.4, 120, 0.2, 0], unit: '1 bowl', unitG: 250, kind: 'home', uses: 1, recipe: [{ id: 'f1', name: 'Test yoghurt', g: 80 }, { src: 'usda', name: 'Rice, white, cooked', g: 150 }], portions: 2, created: 1791600000001 });
    s.myFoods.push({ id: 'f3', name: 'One-off thali', from: 'recipe', n: [650, 20, 90, 22, 8, 9, 6, 900, 3, 150, 0, 0], unit: '1 plate', unitG: 500, kind: 'out', uses: 1, once: true, recipe: [], portions: 1, created: 1791600000002 });
    s.meals.push({ id: 'ml1', date: d, ts: 1791701000000, name: 'Test yoghurt', foodId: 'f1', n: [76, 7.92, 3.04, 3.6, 2.4, null, 2.4, 25.6, null, 100, null, null], unit: '80 g', unitG: 80, qty: 1.5, sure: false, kind: 'packaged' });
    s.meals.push({ id: 'ml2', date: d, ts: 1791702000000, name: 'Something at a friend\'s place', n: null, unit: '1 serving', qty: 1, sure: true });
    s.weights.push({ id: 'wt1', date: d, ts: 1791703000000, kg: 77.85, where: 'home' });
    s.rests.push({ id: 'rx1', date: d, start: 1791640000000, end: 1791668000000, feel: 'okay', night: ['Read a bit'] }); s.pendingSleep = 1791720000000;
    s.weather.push({ id: 'wx1', date: d, ts: 1791704000000, types: ['Drizzle', 'Golden hour'], strength: 'light' });
    s.mind.push({ id: 'mx1', text: 'Return the library book ✨', remindOn: '2026-10-15', created: 1791705000000, letGo: null });
    s.letters.push({ id: 'lx1', text: 'Hey, future you — you got this.\nLine two.', ts: 1791706000000, weather: 'Clear sun', opened: false });
    s.goals.push({ id: 'gx1', kind: 'own', name: 'Running', target: 100, from: 0, created: 1791600000000, finished: null, unit: 'km', amount: true });
    s.goals.push({ id: 'gx2', kind: 'own', name: 'Guitar', target: 30, from: 0, created: 1791600000000, finished: null, unit: 'songs', paused: true });
    s.goalLogs.push({ id: 'glx1', goalId: 'gx1', date: d, ts: 1791707000000, amt: 5.2 }, { id: 'glx2', goalId: 'gx2', date: d, ts: 1791707000001 });
    m.addMoment('win', 'Showered', d); m.addMoment('win', 'Went to class anyway', d, { written: 1 });
    s.heavy['2026-10-09'] = true; s.games = { skate: { best: 412, runs: 7 } };
    s.settings.name = 'Sam'; s.settings.theme = 'dark'; s.settings.dayTabs = ['wins', 'weather']; s.settings.tinyWins.push('Fed the cat');
    s.lastBackup = 1791000000000; s.futureField = { kept: [1, 2.5, 'x'] }; // a field from a newer version
    m.save();
  });
  await A.p.waitForTimeout(400);
  await visitAll(A.p);
  ok('screens open with the full data set (no errors)', A.p.errs.length === 0, A.p.errs.slice(0, 3).join(' | '));
  const before = await state(A.p);
  const file = await exportUI(A.p, 'audit-backup.json');
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok('export file contains every top-level field in the app state', diff(strip(before), strip(exported)).filter(x => !x.startsWith('.lastBackup')).length === 0, diff(strip(before), strip(exported)).slice(0, 5).join('; '));
  ok('export has an "exported" timestamp', typeof exported.exported === 'string');
  const after = await state(A.p);
  ok('lastBackup is set after Save a backup (but the file holds the previous value)', after.lastBackup > exported.lastBackup, 'file ' + exported.lastBackup + ' / app ' + after.lastBackup);
  await A.ctx.close();

  // 2. Restore into a brand-new, empty profile (like a new phone).
  const B = await page(b);
  const t1 = await restore(B.p, file);
  let rest = await state(B.p);
  const d1 = diff(strip(exported), strip(rest));
  ok('restore into an empty app gives back exactly the exported data', d1.length === 0, d1.slice(0, 6).join('; ') + ' toast: ' + t1);
  await B.p.reload(); await B.p.waitForTimeout(2600); await B.p.mouse.click(5, 5); await B.p.waitForTimeout(400);
  rest = await state(B.p);
  const d2 = diff(strip(exported), strip(rest)).filter(x => !/^\.(lastSeen|lastHello)/.test(x));
  ok('restored data is still there after reloading (IndexedDB)', d2.length === 0, d2.slice(0, 6).join('; '));
  await restore(B.p, file); rest = await state(B.p);
  ok('restoring the same file twice does not duplicate anything', rest.moments.length === exported.moments.length && rest.meals.length === exported.meals.length, rest.moments.length + ' moments');
  await visitAll(B.p);
  ok('every screen opens after restore', B.p.errs.length === 0, B.p.errs.slice(0, 3).join(' | '));
  // types, decimals, nulls, unicode
  const f1 = rest.myFoods.find(x => x.id === 'f1'), ml = rest.meals.find(x => x.id === 'ml1'), gl = rest.goalLogs.find(x => x.id === 'glx1');
  ok('decimals, nulls, nested arrays and text survive', f1.n[1] === 7.92 && f1.n[5] === null && f1.measures[0][1] === 170 && ml.qty === 1.5 && ml.sure === false && gl.amt === 5.2 && rest.mind.find(x => x.id === 'mx1').text.includes('✨') && rest.letters.find(x => x.id === 'lx1').text.includes('\n'));
  ok('links between records survive (meal→food, goal log→goal, recipe→ingredient)', ml.foodId === 'f1' && rest.goals.some(g => g.id === gl.goalId) && rest.myFoods.find(x => x.id === 'f2').recipe[0].id === 'f1');
  ok('unknown future field is kept', JSON.stringify(rest.futureField) === JSON.stringify({ kept: [1, 2.5, 'x'] }));

  // 3. Bad files must be refused and leave the current data untouched.
  const bad = { 'bad-not-json.json': 'this is not json {', 'bad-empty.json': '', 'bad-no-moments.json': JSON.stringify({ meals: [] }), 'bad-array.json': '[1,2,3]', 'bad-moments-string.json': JSON.stringify({ moments: 'nope' }) };
  for (const [n, txt] of Object.entries(bad)) {
    const f = path.join(OUT, n); fs.writeFileSync(f, txt);
    const pre = await state(B.p); const toast = await restore(B.p, f); const post = await state(B.p);
    ok('refuses ' + n + ' and keeps current data', diff(strip(pre), strip(post)).filter(x => !/^\.(lastSeen|lastHello)/.test(x)).length === 0, 'toast: ' + toast);
  }
  // A file that passes the check but has broken parts (shows how thin validation is)
  const weird = path.join(OUT, 'weird-goals-string.json'); fs.writeFileSync(weird, JSON.stringify({ moments: [], goals: 'abc' }));
  B.p.errs.length = 0; const tw = await restore(B.p, weird); const sw = await state(B.p);
  ok('[risk check] a file with {moments:[], goals:"abc"} is accepted', sw.goals === 'abc', 'toast: ' + tw + ' (goals is now ' + JSON.stringify(sw.goals) + ')');
  await B.p.goto(BASE + '#/me'); await B.p.waitForTimeout(500);
  ok('[risk check] Me screen still works after that file', B.p.errs.length === 0, B.p.errs.slice(0, 2).join(' | '));
  await restore(B.p, file);
  await B.ctx.close();

  // 4. Old backup (from the first week: no goals, food numbers, jar or quilt fields).
  const C = await page(b);
  const t3 = await restore(C.p, SAMPLE); const old = await state(C.p);
  ok('old backup restores and missing lists are filled in', Array.isArray(old.goals) && Array.isArray(old.myFoods) && Array.isArray(old.meals) && old.settings.tinyWins.length > 0, 'toast: ' + t3);
  await visitAll(C.p);
  ok('every screen opens after restoring an old backup', C.p.errs.length === 0, C.p.errs.slice(0, 3).join(' | '));
  await C.ctx.close();

  // 5. No IndexedDB: the app falls back to localStorage. Restore, reload, check.
  const D = await page(b, { noIDB: true });
  await restore(D.p, file);
  await D.p.reload(); await D.p.waitForTimeout(2600); await D.p.mouse.click(5, 5); await D.p.waitForTimeout(400);
  const ls = await state(D.p);
  const d5 = diff(strip(exported), strip(ls)).filter(x => !/^\.(lastSeen|lastHello)/.test(x));
  ok('without IndexedDB, restore persists through localStorage', d5.length === 0, d5.slice(0, 4).join('; '));
  await D.ctx.close();

  await b.close();
  for (const r of results) console.log(r[0] + '  ' + r[1] + (r[2] ? '   — ' + r[2] : ''));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
})();
