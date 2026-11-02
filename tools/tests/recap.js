// v81: "Look what you did", the month's recap poster (A4 portrait), on Your wall's "Look back", and its Home
// nudge in the first week of a month. Throwaway profile, a made-up October.
// v84: the month at a glance when there are no photos; your own photos (never saved) as polaroids; Save as picture.
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
  ok('the page shows what will be on it (numbers above zero only)', /16\s*rep days/.test(page) && /tiny wins/.test(page) && /nights of rest/.test(page) && !/\b0\b/.test(await p.locator('.wtiles').innerText()), (await p.locator('.wtiles').innerText()).replace(/\n/g, ' '));
  ok('the sticker is the month\'s planner phrase, in blue', (await p.locator('.wsticker').innerText()) === 'MY OCTOBER ERA');
  await p.screenshot({ path: OUT + '/rc-page.png', fullPage: true });
  await p.click('[data-recap]'); await p.waitForTimeout(3000);
  const pdf = await p.evaluate(async () => { const f = document.querySelector('main').__poster; const t = new TextDecoder('latin1').decode(new Uint8Array(await f.arrayBuffer())); return { name: f.name, box: (t.match(/MediaBox \[([^\]]+)\]/) || [])[1] }; });
  ok('a one-page A4 portrait PDF', /^0 0 595\.28 841\.89$/.test(pdf.box) && pdf.name === 'October 2026 recap.pdf', JSON.stringify(pdf));
  const png = await p.evaluate(async () => { const f = document.querySelector('main').__png; const u = new Uint8Array(await f.arrayBuffer()); return { name: f.name, type: f.type, sig: Array.from(u.slice(1, 4)).map(c => String.fromCharCode(c)).join(''), size: u.length }; });
  ok('and the same as a picture (PNG)', png.name === 'October 2026 recap.png' && png.type === 'image/png' && png.sig === 'PNG', JSON.stringify(png));
  ok('two ways out: PDF to print, Save as picture', /PDF to print/.test(await p.locator('#sheet').innerText()) && /Save as picture/.test(await p.locator('#sheet').innerText()));
  await p.screenshot({ path: OUT + '/rc-sheet.png' });
  await p.click('#sheet [data-close]').catch(() => {});
  // ---- your photos (v84) ----
  const jpg = Buffer.from((await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 1600; c.height = 1200; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 1600, 1200); gr.addColorStop(0, '#F6B24A'); gr.addColorStop(1, '#4E77DE'); g.fillStyle = gr; g.fillRect(0, 0, 1600, 1200); g.fillStyle = '#fff'; g.beginPath(); g.arc(800, 600, 260, 0, 7); g.fill(); return c.toDataURL('image/jpeg', 0.8); })).split(',')[1], 'base64');
  const exif = (() => { const t = Buffer.alloc(64); t.write('MM', 0, 'latin1'); t.writeUInt16BE(42, 2); t.writeUInt32BE(8, 4); t.writeUInt16BE(1, 8); t.writeUInt16BE(0x8769, 10); t.writeUInt16BE(4, 12); t.writeUInt32BE(1, 14); t.writeUInt32BE(26, 18); t.writeUInt32BE(0, 22);
    t.writeUInt16BE(1, 26); t.writeUInt16BE(0x9003, 28); t.writeUInt16BE(2, 30); t.writeUInt32BE(20, 32); t.writeUInt32BE(44, 36); t.writeUInt32BE(0, 40); t.write('2026:10:14 18:30:00\0', 44, 'latin1');
    const body = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), t]), h = Buffer.alloc(4); h.writeUInt16BE(0xFFE1, 0); h.writeUInt16BE(body.length + 2, 2); return Buffer.concat([h, body]); })();
  const withDate = Buffer.concat([jpg.slice(0, 2), exif, jpg.slice(2)]);
  await p.goto(BASE + '#/wall?from=me&back=2026-10'); await p.waitForTimeout(500);
  ok('with no photos, the page says the month at a glance', /month at a glance/.test(await p.locator('main').innerText()));
  await p.setInputFiles('[data-wphoto]', { name: 'a.jpg', mimeType: 'image/jpeg', buffer: withDate }); await p.waitForTimeout(700);
  ok('a photo shows, with its date from the photo', await p.locator('.wph').count() === 1 && /says 14 October/.test(await p.locator('.wph').innerText()), await p.locator('.wph').innerText().catch(() => ''));
  ok('the caption starts empty, with a soft hint', (await p.locator('[data-wcap="0"]').inputValue()) === '' && (await p.locator('[data-wcap="0"]').getAttribute('placeholder')) === 'a few words, if you like');
  await p.click('[data-wchip="0"] >> nth=0'); await p.waitForTimeout(200);
  ok('tapping a highlight fills the caption', (await p.locator('[data-wcap="0"]').inputValue()) === 'First 60 kg squat');
  await p.setInputFiles('[data-wphoto]', { name: 'b.jpg', mimeType: 'image/jpeg', buffer: jpg }); await p.waitForTimeout(700);
  await p.fill('[data-wcap="1"]', 'Sunday with Amma');
  await p.setInputFiles('[data-wphoto]', { name: 'c.jpg', mimeType: 'image/jpeg', buffer: jpg }); await p.waitForTimeout(700);
  ok('three photos, then no more room', await p.locator('.wph').count() === 3 && await p.locator('[data-wphoto]').count() === 0 && (await p.locator('[data-wcap="1"]').inputValue()) === 'Sunday with Amma');
  await p.screenshot({ path: OUT + '/rc-photos.png', fullPage: true });
  await p.click('[data-wdel="2"]'); await p.waitForTimeout(200);
  ok('a photo can be removed', await p.locator('.wph').count() === 2);
  await p.click('[data-recap]'); await p.waitForTimeout(3000);
  const shot = await p.locator('#sheet img.wprev').getAttribute('src'); fs.writeFileSync(OUT + '/recap-photos.jpg', Buffer.from(shot.split(',')[1], 'base64'));
  await p.click('#sheet [data-close]').catch(() => {});
  ok('photos are never saved', !JSON.stringify(await st()).includes('data:image'));
  await p.goto(BASE + '#/me'); await p.goto(BASE + '#/wall?from=me&back=2026-10'); await p.waitForTimeout(500);
  ok('leave the page and they\'re gone', await p.locator('.wph').count() === 0);
  await p.goto(BASE + '#/days'); await p.goto(BASE + '#/home'); await p.waitForTimeout(400);
  ok('once you\'ve looked, the nudge rests', await p.locator('a.wallnudge.recap').count() === 0);
  const data = await p.evaluate(async () => { const R = await import('./js/recap.js'); const d = R.recapData('2026-10'); return { w: d.weather.length, hls: d.hls, moved: d.moved.size, rested: d.rested.size, soft: d.softDays.size, snd: d.snd && d.snd.title, best: d.best, cons: d.cons.map(c => c.name), quilt: d.quilt.length }; });
  ok('caption ideas are only your Move highlights (no tiny wins)', JSON.stringify(data.hls) === '["First 60 kg squat","Survived midterm week"]', JSON.stringify(data.hls));
  ok('the glance counts days moved, rest nights and soft days', data.moved === 18 && data.rested === 10 && data.soft === 1, JSON.stringify(data));
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
