// Preserved from the v36 development session (originally tools/reports.js). Paths made configurable; test steps unchanged.
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const SAMPLE = path.join(__dirname, 'sample-backup.json'); const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.clock.install({ time: new Date('2026-10-10T15:00:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(700);
  await p.setInputFiles('#importFile', SAMPLE); await p.click('[data-yes]'); await p.waitForTimeout(3500);
  await p.evaluate(async () => {
    const m = await import('./js/store.js'), st = m.get();
    const F = [['Plain dosa', [137,4,23,3,1,1,0,50,0.5,7,null,0.6], '1 dosa', 'home'], ['Chicken curry', [303,29,7,17,3,2,3,600,1,30,0.3,0.1], '1 bowl', 'home'], ['Masala chai', [90,3,12,3,2,0,10,40,0.1,100,0.2,0.1], '1 cup', 'home'], ['Boiled eggs', [155,13,1,11,3,0,1,124,1.2,50,1.1,2.2], '2 eggs', 'home'], ['Paneer butter masala', [350,14,12,28,15,2,5,700,1,300,0.4,0.3], '1 bowl', 'out'], ['Banana', [105,1,27,0,0,3,14,1,0.3,6,0,0], '1 medium', 'home'], ['Glazed doughnut', [260,3,31,14,7,1,15,230,0.6,20,0,0], '1 doughnut', 'packaged'], ['Rajma chawal', [420,15,70,8,1.5,11,3,600,4,80,0,0], '1 plate', 'home'], ['Whey shake', [120,24,3,1.5,1,0,2,100,0.5,150,0.6,0], '1 scoop', 'packaged']];
    st.meals = []; let id = 0;
    for (let k = 0; k < 40; k++) { const d = m.addDays('2026-10-10', -k); if (k % 6 === 5) continue; const n = 3 + (k % 3);
      for (let j = 0; j < n; j++) { const f = F[(k * 3 + j * 5) % F.length]; st.meals.push({ id: 'm' + (id++), date: d, ts: new Date(d + 'T0' + (7 + j * 3 > 9 ? 9 : 7 + j * 3) + ':30:00').getTime() + j * 3 * 3600e3, name: f[0], n: f[1], unit: f[2], qty: j === 1 ? 2 : 1, sure: j !== 2, kind: f[3] }); } }
    st.meals.push({ id: 'q1', date: '2026-10-09', ts: Date.now(), name: 'Something at a friend\'s place', n: null, unit: '1 serving', qty: 1, sure: true });
    st.weights = [{ id: 'w1', date: '2026-10-01', ts: 1, kg: 78.4, where: 'gym' }, { id: 'w2', date: '2026-10-08', ts: 2, kg: 78.1, where: 'gym' }];
    st.settings.name = 'Sam'; m.save();
  });
  const save = async (expr, out) => {
    const arr = await p.evaluate(async (expr) => { const r = await import('./js/reports.js'); const f = await eval(expr); return Array.from(new Uint8Array(await f.arrayBuffer())); }, expr);
    fs.writeFileSync(out, Buffer.from(arr)); console.log(out, arr.length);
  };
  await save("r.sleepDiary('2026-09-27','2026-10-10')", OUT + '/sleep.pdf');
  await save("r.foodReport('2026-10-04','2026-10-10','the last 7 days')", OUT + '/food-week.pdf');
  await save("r.foodReport('2026-09-01','2026-09-30','last month')", OUT + '/food-month.pdf');
  await p.goto(BASE + '#/food'); await p.waitForTimeout(600); await p.click('[data-reports]'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/rep-sheet.png' });
  await p.click('[data-o="0"]'); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/rep-ready.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
