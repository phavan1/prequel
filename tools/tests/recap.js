// v81: "Look what you did", the month's recap poster (A4 portrait), on Your wall's "Look back", and its Home
// nudge in the first week of a month. Throwaway profile, a made-up October.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/recap.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-11-03T10:00:00') }); // the first week of November: October's recap is ready
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1500);
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  await p.evaluate(async () => {
    const S = await import('./js/store.js'), st = S.get(); st.newsSeen = 999;
    const W = ['Clear sun', 'Partly cloudy', 'Drizzle', 'Golden hour', 'Windy', 'Overcast', 'Clear sun', 'Rainbow', 'Heavy rain', 'Clear night'];
    let id = 0; const mom = (area, text, date, extra = {}) => st.moments.push(Object.assign({ id: 'm' + (++id), area, text, date, ts: new Date(date + 'T12:00:00').getTime() + id }, extra));
    for (let d = 1; d <= 31; d++) {
      const k = '2026-10-' + String(d).padStart(2, '0'), ts = new Date(k + 'T09:00:00').getTime();
      if (d % 4 !== 0) { st.weather.push({ id: 'w' + d, date: k, ts, types: [W[d % W.length]] }); mom('weather', W[d % W.length], k); }
      if (d % 2 === 1) { st.sessions.push({ id: 's' + d, date: k, ts, workoutId: 'fbA', workoutName: 'Full Body A', exercises: [{ key: 'chest', name: 'Chest press', swap: null, sets: [{ a: '20', b: '10' }] }] }); mom('move', 'Full Body A', k); }
      if (d % 3 === 0) { const e = new Date(k + 'T07:00:00').getTime(); st.rests.push({ id: 'r' + d, date: k, start: e - 8 * 3600e3, end: e, feel: ['rested', 'okay', 'groggy'][d % 3] }); mom('rest', 'Rested 8 h', k); }
      if (d % 5 === 0) { st.foods.push({ id: 'f' + d, date: k, ts, tags: ['Cooked it myself'], note: '' }); mom('food', 'Cooked', k); }
      if (d % 6 === 0) mom('win', ['Drank water before coffee', 'Called Amma', 'Went outside', 'Finished the readings', 'Made my bed'][d % 5], k, d === 12 ? { bright: 1 } : {});
    }
    st.heavy['2026-10-12'] = true;
    st.activities.push({ id: 'a1', date: '2026-10-14', ts: 1, type: 'walk', mins: 40, f: {}, hl: 'First 60 kg squat' });
    st.activities.push({ id: 'a2', date: '2026-10-20', ts: 2, type: 'badminton', mins: 60, f: {}, hl: 'Survived midterm week' });
    st.mind.push({ id: 'n1', text: 'that email', created: 1, letGo: new Date('2026-10-18T20:00:00').getTime() });
    st.wall = { plans: {}, phrase: { '2026-10': 'MY OCTOBER ERA' }, made: {} };
    st.tapes.push({ id: 't1', date: '2026-10-02', start: '2026-10-02', end: '2026-10-26', title: 'Golden Hour', artist: 'JVKE' });
    S.save(); document.querySelectorAll('.hello').forEach(e => e.remove());
  });
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/home'); await p.waitForTimeout(500);
  const nudge = await p.locator('a.wallnudge.recap').innerText().catch(() => '');
  ok('in the first week, Home says October\'s recap is ready', /October's recap is ready/.test(nudge), nudge);
  await p.click('a.wallnudge.recap'); await p.waitForTimeout(600);
  ok('it opens Look back on October', /October 2026/.test(await p.locator('.wmonth').innerText()) && (await p.locator('[data-mode="back"]').getAttribute('aria-pressed')) === 'true');
  const page = await p.locator('main').innerText();
  ok('the page shows what will be on it (numbers above zero only)', /gym sessions/.test(page) && /tiny wins/.test(page) && /nights of rest/.test(page) && !/\b0\b/.test(await p.locator('.wtiles').innerText()), (await p.locator('.wtiles').innerText()).replace(/\n/g, ' '));
  ok('the sticker is the month\'s planner phrase, in blue', (await p.locator('.wsticker').innerText()) === 'MY OCTOBER ERA');
  await p.screenshot({ path: OUT + '/rc-page.png', fullPage: true });
  await p.click('[data-recap]'); await p.waitForTimeout(3000);
  const pdf = await p.evaluate(async () => { const f = document.querySelector('main').__poster; const t = new TextDecoder('latin1').decode(new Uint8Array(await f.arrayBuffer())); return { name: f.name, box: (t.match(/MediaBox \[([^\]]+)\]/) || [])[1] }; });
  ok('a one-page A4 portrait PDF', /^0 0 595\.28 841\.89$/.test(pdf.box) && pdf.name === 'October 2026 recap.pdf', JSON.stringify(pdf));
  await p.click('#sheet [data-close]').catch(() => {});
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/home'); await p.waitForTimeout(400);
  ok('once you\'ve looked, the nudge rests', await p.locator('a.wallnudge.recap').count() === 0);
  const data = await p.evaluate(async () => { const R = await import('./js/recap.js'); const d = R.recapData('2026-10'); return { w: d.weather.length, caps: d.caps, snd: d.snd && d.snd.title, best: d.best, cons: d.cons.map(c => c.name), quilt: d.quilt.length }; });
  ok('captions come from your highlights first', data.caps[0] === 'First 60 kg squat' && data.caps[1] === 'Survived midterm week', JSON.stringify(data.caps));
  ok('the bottom: the month\'s soundtrack (no tiny win)', data.snd === 'Golden Hour' && !data.best, JSON.stringify(data));
  ok('the page says the soundtrack, not a tiny win', /The soundtrack: Golden Hour/.test(page) && !/A tiny win/.test(page));
  const draw = async (ym, ph, prep) => p.evaluate(async ([ym, ph, prep]) => { const S = await import('./js/store.js'), R = await import('./js/recap.js'), C = await import('./js/cards.js'); await C.fontsReady(); await document.fonts.load('400 100px Bangers');
    if (prep === 'notape') S.get().tapes = []; const d = R.recapData(ym); return { url: R.drawRecap(ym, ph, await C.loadCovers()).toDataURL('image/png'), best: d.best, snd: !!d.snd }; }, [ym, ph, prep]);
  let r = await draw('2026-10', 'MY OCTOBER ERA'); fs.writeFileSync(OUT + '/recap-poster.png', Buffer.from(r.url.split(',')[1], 'base64'));
  r = await draw('2026-10', 'MY OCTOBER ERA', 'notape'); fs.writeFileSync(OUT + '/recap-best.png', Buffer.from(r.url.split(',')[1], 'base64'));
  ok('no song that month: one best bit instead (the heaviest lift)', !r.snd && r.best && r.best[0] === 'Heaviest lift' && /^20 kg, chest press$/.test(r.best[1]), JSON.stringify(r.best));
  r = await draw('2026-09', 'SIDE QUEST SEASON'); fs.writeFileSync(OUT + '/recap-none.png', Buffer.from(r.url.split(',')[1], 'base64'));
  ok('nothing for either: the box goes, the sticker sits in the middle', !r.snd && !r.best);
  const empty = await p.evaluate(async () => { const R = await import('./js/recap.js'); return R.drawRecap('2026-08', '').toDataURL('image/png').length; });
  ok('an almost empty month still draws kindly', empty > 50000);
  // Plan a month still works from the same page
  await p.goto(BASE + '#/wall?from=me'); await p.waitForTimeout(400); await p.click('[data-mode="plan"]'); await p.waitForTimeout(200);
  ok('Plan a month is one tap away', await p.locator('[data-poster]').count() === 1);
  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log('recap: ' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
