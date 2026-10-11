// Preserved from the v36 development session (originally tools/meal.js). Paths made configurable; test steps unchanged.
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const SAMPLE = path.join(__dirname, 'sample-backup.json'); const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.clock.install({ time: new Date('2026-10-11T14:00:00') });
  await p.goto(BASE + '#/food'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + '/m-0.png' });
  await p.click('.makerow [data-label]'); await p.waitForTimeout(300);
  await p.fill('#lName', 'Jalna Greek Yoghurt'); await p.fill('#lServe', '100');
  for (const [i, v] of [[0, '480'], [1, '33'], [3, '95'], [2, '38'], [7, '32']]) await p.fill('#ln' + i, v);
  await p.click('[data-o="log"]'); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/m-warn.png' });
  for (const [i, v] of [[1, '3.3'], [3, '9.5'], [4, '6.6'], [2, '3.8'], [6, '3.0']]) await p.fill('#ln' + i, v);
  await p.click('[data-o="log"]'); await p.waitForTimeout(500);
  await p.fill('#gIn', '80'); await p.waitForTimeout(200); await p.screenshot({ path: OUT + '/m-grams.png' });
  await p.click('[data-o="ok"]'); await p.waitForTimeout(400);
  // a whole meal
  await p.click('.makerow [data-recipe]'); await p.waitForTimeout(300);
  await p.fill('#rName', 'Curd rice with chana dal');
  await p.fill('#iq', 'jalna'); await p.waitForTimeout(500); console.log('res:', await p.locator('#ingRes').innerHTML(), await p.evaluate(async () => JSON.stringify((await import('./js/store.js')).get().myFoods.map(f => [f.name, !!f.per100, f.once])))); await p.click('[data-iadd="0"]'); await p.waitForTimeout(200);
  await p.fill('[data-ic="0"]', '80'); 
  await p.fill('#iq', 'rice cooked'); await p.waitForTimeout(800); console.log('rice:', (await p.locator('#ingRes').innerHTML()).slice(0,300), await p.evaluate(() => document.querySelector('#iq') && document.querySelector('#iq').value)); await p.screenshot({ path: OUT + '/m-rice.png' }); await p.click('[data-iadd="0"]'); await p.waitForTimeout(200);
  await p.fill('#iq', 'chana'); await p.waitForTimeout(800); console.log('chana:', (await p.locator('#ingRes').innerText()).slice(0,200)); if (await p.locator('[data-iadd="0"]').count()) await p.click('[data-iadd="0"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/m-meal.png' });
  await p.click('[data-o="save"]'); await p.waitForTimeout(600); await p.screenshot({ path: OUT + '/m-done.png' });
  console.log(await p.evaluate(async () => (await import('./js/store.js')).get().meals.map(m => m.name + ' | ' + m.qty + ' | ' + Math.round(m.n[0] * m.qty) + ' cal')));
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
