// v51: On repeat. The Days tab, finding a song (Apple's search is simulated here with made-up results, covers and a
// silent preview, because tests must not depend on the internet), eras and the shelf, typing a song yourself
// (a made cover and a little tune), Listen in full, soundtrack of the month, editing and removing tapes, offline search,
// the year-in-songs card, backups. Fictional data only, throwaway profiles.
// Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/ontape.js
const { chromium } = require('playwright');
const path = require('path'); const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
// a tiny two-colour picture for covers, and one second of silence for the preview
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DwnwGIGRgYGBgYAAAvAgP9U6x2iAAAAABJRU5ErkJggg==', 'base64');
const WAV = (() => { const n = 8000, b = Buffer.alloc(44 + n); b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(8000, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40); b.fill(128, 44); return b; })();
const SONGS = { resultCount: 2, results: [
  { trackName: 'Paper Lanterns', artistName: 'The Made-Up Band', collectionName: 'Night Bus', artworkUrl60: 'https://is1-ssl.mzstatic.com/a/60x60bb.png', artworkUrl100: 'https://is1-ssl.mzstatic.com/a/100x100bb.png', previewUrl: 'https://audio-ssl.itunes.apple.com/p/preview.wav', trackViewUrl: 'https://music.apple.com/song/1' },
  { trackName: 'Paper Lanterns (Live)', artistName: 'The Made-Up Band', collectionName: 'Live', artworkUrl60: 'https://is1-ssl.mzstatic.com/b/60x60bb.png', artworkUrl100: 'https://is1-ssl.mzstatic.com/b/100x100bb.png', trackViewUrl: 'https://music.apple.com/song/2' }] };

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  let online = true, searched = 0, appleDown = false, deezerHits = 0;
  const DZ = { data: [{ id: 777, title: 'Night Swim', artist: { name: 'Pretend Pals' }, album: { title: 'Pool Lights', cover_small: 'https://cdn-images.dzcdn.net/s.png', cover_big: 'https://cdn-images.dzcdn.net/b.png' }, preview: 'https://cdnt-preview.dzcdn.net/old.wav' }] };
  await ctx.route('https://api.deezer.com/**', r => { deezerHits++; if (!online) return r.abort(); const u = new URL(r.request().url()), cb = u.searchParams.get('callback'); const body = /\/track\//.test(u.pathname) ? { id: 777, preview: 'https://cdnt-preview.dzcdn.net/fresh.wav' } : DZ; return r.fulfill({ contentType: 'text/javascript', body: cb + '(' + JSON.stringify(body) + ')' }); });
  await ctx.route('https://cdn-images.dzcdn.net/**', r => r.fulfill({ contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG }));
  await ctx.route('https://cdnt-preview.dzcdn.net/**', r => r.fulfill({ contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' }, body: WAV }));
  await ctx.route('https://itunes.apple.com/**', r => { searched++; if (!online || appleDown) return r.abort(); const u = new URL(r.request().url()), cb = u.searchParams.get('callback'); return cb ? r.fulfill({ contentType: 'text/javascript', body: cb + '(' + JSON.stringify(SONGS) + ')' }) : r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(SONGS) }); });
  await ctx.route('https://is1-ssl.mzstatic.com/**', r => r.fulfill({ contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG }));
  await ctx.route('https://audio-ssl.itunes.apple.com/**', r => r.fulfill({ contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' }, body: WAV }));
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-18T10:00:00') });
  await p.addInitScript(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
  const st = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./js/store.js')).get())));
  await p.goto(BASE + '#/days'); await p.waitForTimeout(2600); await p.mouse.click(5, 5); await p.waitForTimeout(400);

  // 1. switched on from Days → ＋
  await p.click('[data-addtab]'); await p.waitForTimeout(200);
  ok('On repeat is offered under More tabs', /On repeat\s*the song you can't stop playing, era by era/.test(await p.locator('#sheet').innerText()));
  await p.click('[data-opt="music"]'); await p.waitForTimeout(200); await p.click('#sheet [data-close]'); await p.waitForTimeout(200);
  await p.click('[data-tab="music"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/ot-empty.png' });
  ok('an empty tape player invites you in', /Nothing on repeat yet/.test(await p.locator('main').innerText()) && await p.locator('[data-tchange]').count() === 1);

  // 2. find a song, hear it, pick it
  await p.click('[data-tchange]'); await p.waitForTimeout(200);
  await p.fill('#songQ', 'paper lanterns'); await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '/ot-search.png' });
  ok('results come with covers, titles and artists', await p.locator('.songrow[data-pick]').count() === 2 && /Paper Lanterns\s*The Made-Up Band · Night Bus/.test(await p.locator('.songrow[data-pick]').first().innerText()) && await p.locator('.songrow[data-pick] img').count() === 2);
  ok('only songs with a preview get a play button', await p.locator('.songrow [data-pv]').count() === 1);
  await p.click('[data-pv="0"]'); await p.waitForTimeout(300);
  ok('▶ in the list plays the preview', await p.locator('[data-pv="0"].on').count() === 1);
  await p.click('[data-pick="0"]'); await p.waitForTimeout(200);
  await p.fill('#mEra', 'night bus season'); await p.fill('#mLine', 'the bit where the drums come back'); await p.fill('#mStart', '2026-10-03');
  await p.screenshot({ path: OUT + '/ot-details.png' });
  await p.click('[data-mput]'); await p.waitForTimeout(800);
  let s = await st(), t1 = s.tapes[0];
  ok('the song is on repeat, with its era and line', s.tapes.length === 1 && t1.title === 'Paper Lanterns' && t1.artist === 'The Made-Up Band' && t1.start === '2026-10-03' && !t1.end && t1.era === 'night bus season' && t1.line === 'the bit where the drums come back');
  ok('its cover is kept on the phone (works offline)', /^data:image\/jpeg/.test(t1.cover || ''), (t1.cover || '').slice(0, 30));
  await p.screenshot({ path: OUT + '/ot-player.png' });
  ok('the player shows title, era, line and since when', /Paper Lanterns/.test(await p.locator('.tapeplayer').innerText()) && /“night bus season”/.test(await p.locator('.tapeplayer').innerText()) && /since Sat,? 3 Oct · 16 days/.test(await p.locator('.tapeplayer').innerText()));
  ok('the month gets its soundtrack', /October's soundtrack: Paper Lanterns · The Made-Up Band/.test(await p.locator('.calsum').innerText()));
  ok('the first day of the era is marked on the calendar', await p.locator('.cal2 [data-day="2026-10-03"].lv3').count() === 1 && await p.locator('.cal2 [data-day="2026-10-10"].lv1').count() === 1);

  // 3. play it on the tape
  await p.click('.tapeplayer [data-tplay]'); await p.waitForTimeout(500);
  ok('▶ Play turns the reels and plays the preview', await p.locator('.tapeplayer .cassette.playing').count() === 1 && /30-second preview/.test(await p.locator('#tpnote').innerText()));
  await p.screenshot({ path: OUT + '/ot-playing.png' });
  await p.click('.tapeplayer [data-tplay]'); await p.waitForTimeout(200);
  ok('■ Stop stops it', await p.locator('.tapeplayer .cassette.playing').count() === 0);

  // 4. listen in full: asks once where you listen
  await p.click('[data-tfull]'); await p.waitForTimeout(200); await p.click('[data-app="spotify"]'); await p.waitForTimeout(200);
  let opened = await p.evaluate(() => window.__opened);
  ok('Listen in full asks once, then opens your app searching for the song', opened[0] === 'https://open.spotify.com/search/Paper%20Lanterns%20The%20Made-Up%20Band', opened.join());
  await p.click('[data-tapp]'); await p.click('[data-app="apple"]'); await p.waitForTimeout(200); await p.click('[data-tfull]'); await p.waitForTimeout(100);
  opened = await p.evaluate(() => window.__opened);
  ok('Apple Music goes straight to the exact song', opened[1] === 'https://music.apple.com/song/1');

  // 5. change the song, typing it yourself: the old tape goes on the shelf
  await p.click('[data-tchange]'); await p.waitForTimeout(200); await p.click('[data-manual]'); await p.waitForTimeout(150);
  await p.fill('#mTitle', 'Kitchen Radio'); await p.fill('#mArtist', 'Nobody Famous'); await p.click('[data-mput]'); await p.waitForTimeout(500);
  s = await st(); const old = s.tapes.find(t => t.title === 'Paper Lanterns'), now2 = s.tapes.find(t => t.title === 'Kitchen Radio');
  ok('changing the song closes the last era the day before', old.end === '2026-10-17' && now2.start === '2026-10-18' && !now2.end);
  ok('the old tape sits on the shelf in its month\'s mixtape', /October 2026 mixtape/.test(await p.locator('.ontape').innerText()) && await p.locator('.shelftape').count() === 1);
  ok('a song typed by hand gets a cover made just for it', /^data:image\/png/.test(await p.locator('.tapeplayer .clabel img').getAttribute('src')));
  await p.evaluate(() => document.querySelector('.ontape').scrollIntoView()); await p.screenshot({ path: OUT + '/ot-shelf.png' });
  await p.click('.tapeplayer [data-tplay]'); await p.waitForTimeout(400);
  ok('no preview: a click, some hiss, and a little tune of its own', /a little tune of its own/.test(await p.locator('#tpnote').innerText()) && await p.locator('.tapeplayer .cassette.playing').count() === 1);
  await p.click('.tapeplayer [data-tplay]');

  // 6. a tape on the shelf: edit its words, then remove it
  await p.click('.shelftape'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/ot-tapesheet.png' });
  await p.fill('#eEra', 'autumn on the bus'); await p.click('[data-esave]'); await p.waitForTimeout(200);
  s = await st(); ok('a tape\'s era name can be changed', s.tapes.find(t => t.title === 'Paper Lanterns').era === 'autumn on the bus');
  await p.click('.shelftape'); await p.waitForTimeout(200); await p.click('[data-erm]'); await p.click('[data-erm]'); await p.waitForTimeout(200);
  s = await st(); ok('a tape can be removed (asks twice)', s.tapes.length === 1 && s.tapes[0].title === 'Kitchen Radio');

  // 6b. v52: when Apple doesn't answer (as on iPhones), Deezer does; its preview is fetched fresh at play time
  appleDown = true; await p.click('[data-tchange]'); await p.fill('#songQ', 'night swim'); await p.waitForTimeout(1500);
  ok('with Apple unreachable, the Deezer backup finds the song with its cover', /Night Swim\s*Pretend Pals · Pool Lights/.test(await p.locator('#songRes').innerText()) && await p.locator('#songRes img').count() === 1);
  await p.click('[data-pick="0"]'); await p.click('[data-mput]'); await p.waitForTimeout(800);
  s = await st(); const dz = s.tapes.find(t => t.title === 'Night Swim');
  ok('a Deezer song keeps its id and cover, not its expiring preview link', dz && dz.did === 777 && !dz.preview && /^data:image\/jpeg/.test(dz.cover || ''));
  const before = deezerHits; await p.click('.tapeplayer [data-tplay]'); await p.waitForTimeout(800);
  ok('pressing play fetches a fresh preview and plays it', deezerHits > before && /30-second preview/.test(await p.locator('#tpnote').innerText()));
  await p.click('.tapeplayer [data-tplay]'); appleDown = false;

  // 7. offline: the search says so kindly, and typing it yourself still works
  online = false; await p.click('[data-tchange]'); await p.fill('#songQ', 'anything'); await p.waitForTimeout(1500);
  ok('offline search explains itself, with a small detail line for Phavan', /can't be reached right now/.test(await p.locator('#songRes').innerText()) && /Apple: .*Deezer: .*Apple again: /.test(await p.locator('.songwhy').innerText()));
  await p.click('#sheet [data-close]'); online = true;

  // 8. the year-in-songs card draws, and the month card too
  await p.evaluate(async () => { const S = await import('./js/store.js'); S.get().tapes.push({ id: 't9', date: '2026-08-02', start: '2026-08-02', end: '2026-09-14', title: 'Long Summer', artist: 'Two Friends Of Nobody', era: 'beach era' }); S.save(); });
  await p.goto(BASE + '#/share?t=songs'); await p.waitForTimeout(2000);
  await p.screenshot({ path: OUT + '/ot-yearcard.png' });
  const card = await p.evaluate(() => document.getElementById('card').toDataURL('image/png'));
  require('fs').writeFileSync(OUT + '/ot-yearcard-full.png', Buffer.from(card.split(',')[1], 'base64'));
  ok('My year in songs is offered and drawn', await p.locator('[data-kind="songs"]').count() === 1 && card.length > 50000);
  // a busy month: the soundtrack still makes it onto My month (v52)
  await p.evaluate(async () => { const S = await import('./js/store.js'), st = S.get(), T = (d, h) => new Date(d + 'T00:00:00').getTime() + h * 3600000;
    for (let i = 1; i <= 12; i++) { const d = '2026-10-' + String(i).padStart(2, '0'); st.rests.push({ id: 'r' + i, date: d, start: T(d, 1), end: T(d, 7), feel: 'okay' }); st.weather.push({ id: 'w' + i, date: d, ts: T(d, 9), types: ['Sunny'], strength: 'a little' }); st.moments.push({ id: 'm' + i, date: d, ts: T(d, 10), area: 'win', text: 'Drank water', bright: 0 }); st.sessions.push({ id: 's' + i, date: d, ts: T(d, 17), workoutId: 'fbA', workoutName: 'Full Body A', light: 'green', exercises: [] }); }
    st.meals = [{ id: 'f1', date: '2026-10-02', ts: T('2026-10-02', 12), name: 'Toast', n: null, qty: 1 }]; S.save(); });
  const said = await p.evaluate(async () => { const out = [], orig = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, ...r) { out.push(String(t)); return orig.call(this, t, ...r); }; const C = await import('./js/cards.js'); const c = document.createElement('canvas'); c.width = C.W; c.height = C.H; C.drawMonth(c.getContext('2d'), C.MONTH_LOOKS[0], {}); CanvasRenderingContext2D.prototype.fillText = orig; return out.join(' | '); });
  ok('a full month card still shows its soundtrack', /the soundtrack \| (Kitchen Radio|Night Swim)/.test(said), said.slice(0, 200));
  await p.goto(BASE + '#/home'); await p.goto(BASE + '#/share?t=month'); await p.waitForTimeout(2000);
  const mcard = await p.evaluate(() => document.getElementById('card').toDataURL('image/png'));
  require('fs').writeFileSync(OUT + '/ot-monthcard-full.png', Buffer.from(mcard.split(',')[1], 'base64'));

  // 9. backups carry tapes and check them
  const chk = await p.evaluate(async () => { const S = await import('./js/store.js'); return [!!S.checkBackup(JSON.stringify({ v: 1, moments: [], tapes: [{ id: 'x', date: '2026-10-01', start: '2026-10-01', title: 'A' }] })).data, S.checkBackup(JSON.stringify({ v: 1, moments: [], tapes: [{ id: 'x', date: 'soon' }] })).problem]; });
  ok('backups: tapes are checked like everything else', chk[0] === true && chk[1] === 'damaged', JSON.stringify(chk));

  await b.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length);
  console.log(errs.join('\n') || 'no errors');
})();
