// v114: Mind, redesign A. A hello with him, a slim jot bar whose reminder choices appear once you type, notes on a
// corkboard (count only above zero), and Lanterns (a pop-up list) and Letters as picture tiles.
// Throwaway profile. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/mindpage.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-15T15:00:00') });
  await p.goto(BASE + '#/settings'); await p.waitForTimeout(1500); await p.mouse.click(5, 5); await p.waitForTimeout(300);
  const st = () => p.evaluate(async () => (await import('./js/store.js')).get());
  await p.evaluate(async () => { const S = await import('./js/store.js'), s = S.get(); s.newsSeen = 999; s.mind = []; s.letters = []; S.save(); });
  const open = async () => { await p.goto(BASE + '#/home'); await p.goto(BASE + '#/mind'); await p.waitForTimeout(500); };
  await open();
  ok('a hello with him', /Mind/.test(await p.locator('.mhero').innerText()) && await p.locator('.mhero img.him').count() === 1);
  ok('empty: a kind line on the board, no "0"', /nice kind of empty/.test(await p.locator('.board').innerText()) && !/\b0\b/.test(await p.locator('main').innerText()));
  ok('empty tiles say what they\'re for', /Let a note go and it floats up here/.test(await p.locator('[data-lanterns]').innerText()) && /From good-day you/.test(await p.locator('.ttile.lett').innerText()));
  ok('the reminder choices are hidden until you type', await p.locator('.remind').isHidden());
  await p.fill('#jot', 'Buy a birthday card'); await p.waitForTimeout(150);
  ok('…and appear once you do', await p.locator('.remind').isVisible());
  await p.click('[data-when="tomorrow"]'); await p.waitForTimeout(200);
  ok('picking one keeps what you typed', (await p.inputValue('#jot')) === 'Buy a birthday card' && (await p.locator('[data-when="tomorrow"]').getAttribute('aria-pressed')) === 'true');
  await p.click('[data-jot]'); await p.waitForTimeout(300);
  let s = await st(); const bt = await p.locator('.board').innerText(); ok('+ puts it down with the nudge', s.mind.length === 1 && s.mind[0].remindOn === '2026-11-16' && /On your mind · 1/i.test(bt), JSON.stringify([s.mind, bt.slice(0, 40)]));
  ok('…and the bar is clean again', (await p.inputValue('#jot')) === '' && await p.locator('.remind').isHidden());
  await p.click('[data-letgo]'); await p.waitForTimeout(300);
  ok('Let it go: the Lanterns tile counts it', /1 let go/.test(await p.locator('[data-lanterns]').innerText()));
  await p.click('[data-lanterns]'); await p.waitForTimeout(300);
  ok('the Lanterns tile opens your lanterns', /Lanterns you've let go/.test(await p.locator('#sheet').innerText()) && await p.locator('#sheet .item.lantern').count() === 1);
  await p.click('#sheet [data-recall]'); await p.waitForTimeout(300);
  s = await st(); ok('Bring back from there puts it on the board again', !s.mind[0].letGo && await p.locator('#sheet').count() === 0 && await p.locator('.sticky').count() === 1);
  await p.click('.ttile.lett'); await p.waitForTimeout(500);
  ok('the Letters tile opens Letters, with Mind lit and Back to Mind', /#\/letters/.test(p.url()) && await p.locator('.tabbar a[aria-current="page"][href="#/mind"]').count() === 1);
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('mindpage: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
