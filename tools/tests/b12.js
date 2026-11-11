// v104: the food report only speaks about vitamin B12 and vitamin D when most foods logged in the period have a value
// (most labels and all the Indian recipes leave them blank). Reads the words drawn into the report via fillText.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/b12.js
const { chromium } = require('playwright');
const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-10-10T15:00:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500);
  const run = (mix) => p.evaluate(async (mix) => {
    const m = await import('./js/store.js'), st = m.get();
    // [name, values, unit]; values: kcal, protein, carbs, fat, satfat, fibre, sugar, sodium, iron, calcium, b12, vitd
    const F = { dosa: ['Plain dosa', [137,4,23,3,1,1,0,50,0.5,7,null,null]], dal: ['Dal tadka', [180,9,24,5,1,6,2,400,2,40,null,null]],
      egg: ['Boiled eggs', [155,13,1,11,3,0,1,124,1.2,50,0.5,0.6]], milk: ['Milk', [120,8,12,5,3,0,12,100,0.1,280,0.6,0.1]] };
    st.meals = []; let id = 0;
    for (let k = 0; k < 7; k++) { const d = m.addDays('2026-10-10', -k);
      mix.forEach((key, j) => { const f = F[key]; st.meals.push({ id: 'm' + (id++), date: d, ts: new Date(d + 'T08:00:00').getTime() + j * 3600e3, name: f[0], n: f[1], unit: '1 serving', qty: 1, sure: true }); }); }
    m.save();
    const said = []; const orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, ...a) { said.push(String(t)); return orig.call(this, t, ...a); };
    const r = await import('./js/reports.js'); await r.foodReport('2026-10-04', '2026-10-10', 'the last 7 days');
    CanvasRenderingContext2D.prototype.fillText = orig;
    return said.join(' ');
  }, mix);
  // mostly blanks: 1 of 4 foods a day has B12/vitamin D
  const few = await run(['dosa', 'dal', 'dosa', 'egg']);
  ok('mostly blank: no B12 tile or idea', !/B12/.test(few), (few.match(/.{0,40}B12.{0,40}/) || [''])[0]);
  ok('mostly blank: no vitamin D tile or idea', !/Vitamin D/.test(few));
  ok('mostly blank: protein and fibre still there', /Protein/.test(few) && /Fibre/.test(few));
  // mostly known: 3 of 4 foods a day have values, and they are low
  const most = await run(['egg', 'milk', 'egg', 'dosa']);
  ok('mostly known: B12 tile and idea shown', /Vitamin B12/.test(most) && /2\.4/.test(most));
  ok('mostly known: vitamin D shown', /Vitamin D/.test(most));
  ok('the old "may be a bit higher" caveat is gone', !/bit higher/.test(most));
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('b12: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
