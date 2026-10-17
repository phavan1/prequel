// On repeat (v51), on its own Days tab: the tape player with the song you can't stop playing, and a shelf of
// past eras as cassettes, one mixtape per month. Change the song, edit or remove a tape, play a preview.
import { get, save, today, parseKey } from '../store.js';
import { esc, prettyDate, logDate, openSheet, closeSheet, toast } from '../ui.js';
import { tapes, current, byStart, searchSongs, saveCover, coverOf, putOnRepeat, removeTape, tapeDays, onDay, APPS, fullUrl, play, stopPlay } from '../music.js';
import { mulberry32, hashStr } from '../sky-model.js';

const SHELLS = [['#23262F', '#F3EEDF'], ['#F3EEDF', '#23262F'], ['#1F55D0', '#FFFFFF'], ['#E2402F', '#FFFFFF'], ['#5DAE7E', '#FFFFFF'], ['#F4C430', '#23262F'], ['#B07CC6', '#FFFFFF']];
const shellOf = t => SHELLS[Math.floor(mulberry32(hashStr(t.id))() * SHELLS.length)];
const long = d => { const w = prettyDate(d, { weekday: 'short', day: 'numeric', month: 'short' }); return /^(Today|Yesterday)$/.test(w) ? w.toLowerCase() : w; };
const span = t => long(t.start) + (t.end ? (t.end === t.start ? '' : ' – ' + long(t.end)) : ' – now');

// one cassette: the shell, a paper label with its cover and handwritten title, and two reels that turn while it plays
export function cassette(t, cls) {
  const [shell, ink] = shellOf(t);
  return '<div class="cassette ' + (cls || '') + '" style="--shell:' + shell + ';--ink:' + ink + '">' +
    '<div class="clabel"><img src="' + coverOf(t) + '" alt=""><div><b>' + esc(t.title) + '</b><small>' + esc(t.artist || '') + '</small></div></div>' +
    '<div class="cwin"><i class="reel"></i><span class="ctape"></span><i class="reel"></i></div><span class="cscrew a"></span><span class="cscrew b"></span></div>';
}

export function musicPanel(sel) {
  const c = current(), past = tapes().filter(t => t.end).sort(byStart).reverse(), app = (APPS.find(a => a[0] === get().settings.musicApp) || [])[1];
  const then = sel && sel !== today() ? onDay(sel) : null;
  const months = {}; past.forEach(t => { const m = t.start.slice(0, 7); (months[m] = months[m] || []).push(t); });
  const mname = m => parseKey(m + '-01').toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  return '<div class="ontape">' +
    (then && then !== c ? '<p class="tapethen">On ' + esc(long(sel)) + ', <b>' + esc(then.title) + '</b> was on repeat.</p>' : '') +
    (c
      ? '<div class="tapeplayer"><div class="deck">' + cassette(c, 'big') + '</div>' +
        '<div class="tpinfo"><div class="lbl">On repeat</div><h2>' + esc(c.title) + '</h2>' + (c.artist ? '<p class="tpartist">' + esc(c.artist) + '</p>' : '') +
          (c.era ? '<p class="tpera">“' + esc(c.era) + '”</p>' : '') +
          '<p class="tpsince">since ' + esc(long(c.start)) + ' · ' + tapeDays(c) + (tapeDays(c) === 1 ? ' day' : ' days') + '</p>' +
          (c.line ? '<p class="tpline">' + esc(c.line) + '</p>' : '') + '</div>' +
        '<div class="tpbtns"><button type="button" class="btn" data-tplay="' + c.id + '">▶ Play</button><button type="button" class="btn alt" data-tfull="' + c.id + '">Listen in full ›</button></div>' +
        '<p class="tpnote" id="tpnote">' + (app ? 'Listening in full on ' + esc(app) + ' · <button type="button" class="lnk" data-tapp>change</button>' : '') + '</p>' +
        '<div class="tpbtns2"><button type="button" class="btn alt" data-tchange>Change song</button><button type="button" class="btn ghost" data-tape="' + c.id + '">Edit</button></div></div>'
      : '<div class="tapeplayer empty"><div class="deck"><div class="cassette big blank"><div class="clabel"><div><b>Nothing on repeat yet</b><small>what can\'t you stop playing?</small></div></div><div class="cwin"><i class="reel"></i><span class="ctape"></span><i class="reel"></i></div></div></div>' +
        '<button type="button" class="btn" data-tchange>Put a song on repeat</button><p class="muted" style="font-size:13px;margin:0;text-align:center">One song at a time. When you change it, the old one goes on your shelf with its dates.</p></div>') +
    (past.length ? '<div class="lbl">Your shelf</div>' + Object.keys(months).map(m => '<div class="mixtape"><div class="mixname">' + esc(mname(m)) + ' mixtape</div><div class="shelf">' + months[m].map(t => '<button type="button" class="shelftape" data-tape="' + t.id + '">' + cassette(t, 'small') + '<span>' + esc(span(t)) + '</span></button>').join('') + '</div></div>').join('') : '') +
  '</div>';
}

// ---------- changing the song: search, pick, then a few optional words ----------
function changeSheet(done) {
  let found = [], picked = null, manual = false, timer = null, seq = 0;
  const details = () => '<h2>' + (manual ? 'Type it yourself' : 'Almost on') + '</h2>' +
    (manual ? '<label class="field-label" for="mTitle">SONG</label><input id="mTitle" type="text" maxlength="80" autocomplete="off"><label class="field-label" for="mArtist">ARTIST</label><input id="mArtist" type="text" maxlength="80" autocomplete="off">'
      : '<div class="songrow chosen"><img src="' + esc(picked.thumb || '') + '" alt=""><span><b>' + esc(picked.title) + '</b><small>' + esc(picked.artist) + (picked.album ? ' · ' + esc(picked.album) : '') + '</small></span></div>') +
    '<label class="field-label" for="mEra">NAME THIS ERA · IF YOU LIKE</label><input id="mEra" type="text" maxlength="40" placeholder="exam season, sad girl autumn…" autocomplete="off">' +
    '<label class="field-label" for="mLine">THE LINE THAT GETS YOU · IF YOU LIKE</label><input id="mLine" type="text" maxlength="100" placeholder="in your own words" autocomplete="off">' +
    '<label class="field-label" for="mStart">ON REPEAT SINCE</label><input id="mStart" type="date" max="' + today() + '" value="' + logDate() + '">' +
    '<div class="err" id="mErr"></div><button type="button" class="btn" data-mput>Put it on</button><button type="button" class="btn alt" data-close>Cancel</button>';
  const search = () => '<h2>What\'s on repeat?</h2><input id="songQ" type="search" placeholder="Search for a song or artist" autocomplete="off" aria-label="Search for a song">' +
    '<div id="songRes" class="songres"></div><button type="button" class="lnk manualbtn" data-manual>Not here? Type it yourself</button><button type="button" class="btn alt" data-close>Cancel</button>';
  const sheet = openSheet(search(), async ev => {
    const t = ev.target; let b;
    if ((b = t.closest('[data-pv]'))) { ev.stopPropagation(); const s = found[Number(b.dataset.pv)]; if (b.classList.contains('on')) { stopPlay(); return; } sheet.querySelectorAll('[data-pv]').forEach(x => { x.classList.remove('on'); x.textContent = '▶'; }); b.classList.add('on'); b.textContent = '■'; play(s, () => { b.classList.remove('on'); b.textContent = '▶'; }); return; }
    if ((b = t.closest('[data-pick]'))) { stopPlay(); picked = found[Number(b.dataset.pick)]; manual = false; sheet.querySelector('.sheet').innerHTML = details(); return; }
    if (t.closest('[data-manual]')) { stopPlay(); manual = true; sheet.querySelector('.sheet').innerHTML = details(); sheet.querySelector('#mTitle').focus(); return; }
    if (t.closest('[data-close]')) { stopPlay(); return; }
    if (!t.closest('[data-mput]')) return;
    const v = id => (sheet.querySelector('#' + id) || {}).value || '', err = sheet.querySelector('#mErr');
    const song = manual ? { title: v('mTitle').trim(), artist: v('mArtist').trim() } : Object.assign({}, picked);
    if (!song.title) { err.textContent = 'What\'s the song called?'; return; }
    const start = v('mStart') || today(); if (start > today()) { err.textContent = 'That day hasn\'t happened yet.'; return; }
    const c = current(); if (c && start < c.start) { err.textContent = 'The song on repeat now started ' + long(c.start) + '. Pick that day or later.'; return; }
    t.closest('[data-mput]').textContent = 'Putting it on…';
    if (!manual) song.cover = await saveCover(song.coverUrl);
    const extra = {}; if (v('mEra').trim()) extra.era = v('mEra').trim(); if (v('mLine').trim()) extra.line = v('mLine').trim();
    putOnRepeat(song, start, extra); closeSheet(); toast('On repeat: ' + song.title + '.'); done();
  });
  sheet.addEventListener('input', e => {
    if (e.target.id !== 'songQ') return;
    clearTimeout(timer); const q = e.target.value.trim(), box = sheet.querySelector('#songRes');
    if (q.length < 2) { box.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      const my = ++seq; box.innerHTML = '<p class="muted songmsg">Looking…</p>';
      try {
        const r = await searchSongs(q); if (my !== seq) return; found = r;
        box.innerHTML = r.length ? r.map((s, i) => '<button type="button" class="songrow" data-pick="' + i + '">' + (s.thumb ? '<img src="' + esc(s.thumb) + '" alt="">' : '<i class="nocover">♪</i>') + '<span><b>' + esc(s.title) + '</b><small>' + esc(s.artist) + (s.album ? ' · ' + esc(s.album) : '') + '</small></span>' + (s.preview ? '<span class="pv" data-pv="' + i + '" role="button" aria-label="Hear 30 seconds of ' + esc(s.title) + '">▶</span>' : '') + '</button>').join('')
          : '<p class="muted songmsg">Nothing found for that. Try fewer words, or type it yourself.</p>';
      } catch (e2) { if (my === seq) box.innerHTML = '<p class="muted songmsg">The song search can\'t be reached right now (are you offline?). You can type it yourself instead.</p>'; }
    }, 400);
  });
  setTimeout(() => { const q = sheet.querySelector('#songQ'); if (q) q.focus(); }, 50);
}

// ---------- one tape: look, play, change its words or dates, remove ----------
function tapeSheet(id, done) {
  const st = get(), t = tapes().find(x => x.id === id); if (!t) return;
  const sheet = openSheet('<div class="tapesheet">' + cassette(t, 'big') + '</div><h2 style="margin:0">' + esc(t.title) + '</h2><p class="muted" style="margin:0">' + esc(t.artist || '') + (t.album ? ' · ' + esc(t.album) : '') + '<br>' + esc(span(t)) + ' · ' + tapeDays(t) + (tapeDays(t) === 1 ? ' day' : ' days') + '</p>' +
    '<div class="tpbtns"><button type="button" class="btn" data-tplay="' + t.id + '">▶ Play</button><button type="button" class="btn alt" data-tfull="' + t.id + '">Listen in full ›</button></div><p class="tpnote" id="tpnote"></p>' +
    '<label class="field-label" for="eEra">ERA NAME</label><input id="eEra" type="text" maxlength="40" value="' + esc(t.era || '') + '" autocomplete="off">' +
    '<label class="field-label" for="eLine">THE LINE THAT GETS YOU</label><input id="eLine" type="text" maxlength="100" value="' + esc(t.line || '') + '" autocomplete="off">' +
    '<div class="grid2"><div><label class="field-label" for="eStart">FROM</label><input id="eStart" type="date" max="' + today() + '" value="' + t.start + '"></div>' +
      (t.end ? '<div><label class="field-label" for="eEnd">TO</label><input id="eEnd" type="date" max="' + today() + '" value="' + t.end + '"></div>' : '<div></div>') + '</div>' +
    '<div class="err" id="eErr"></div><button type="button" class="btn" data-esave>Save</button><button type="button" class="btn danger" data-erm>Remove this tape</button><button type="button" class="btn ghost" data-close>Close</button>', ev => {
    const b = ev.target;
    if (b.closest('[data-tplay],[data-tfull]')) { musicClick(ev, done, sheet); return; }
    if (b.closest('[data-close]')) { stopPlay(); return; }
    if (b.closest('[data-erm]')) { const x = b.closest('[data-erm]'); if (!x.dataset.armed) { x.dataset.armed = '1'; x.textContent = 'Sure? Tap again'; return; } stopPlay(); removeTape(t.id); closeSheet(); toast('Removed.'); done(); return; }
    if (!b.closest('[data-esave]')) return;
    const s = sheet.querySelector('#eStart').value, e = (sheet.querySelector('#eEnd') || {}).value, err = sheet.querySelector('#eErr');
    if (!s || s > today() || (e && (e < s || e > today()))) { err.textContent = 'Those dates don\'t quite fit. The end can\'t be before the start, or after today.'; return; }
    t.start = t.date = s; if (t.end && e) t.end = e;
    const era = sheet.querySelector('#eEra').value.trim(), line = sheet.querySelector('#eLine').value.trim();
    if (era) t.era = era; else delete t.era; if (line) t.line = line; else delete t.line;
    save(); stopPlay(); closeSheet(); toast('Saved.'); done();
  });
}

function appSheet(then) {
  openSheet('<h2>Where do you listen?</h2><p class="muted">"Listen in full" will open your songs there. You can change it any time.</p><div class="appchips">' + APPS.map(a => '<button type="button" class="chip" data-app="' + a[0] + '">' + a[1] + '</button>').join('') + '</div><button type="button" class="btn ghost" data-close>Cancel</button>', ev => {
    const b = ev.target.closest('[data-app]'); if (!b) return;
    get().settings.musicApp = b.dataset.app; save(); closeSheet(); if (then) then();
  });
}

// ---------- clicks on the On repeat tab (and in a tape's sheet); true when handled ----------
export function musicClick(e, rerender, within) {
  const t = e.target, scope = within || document; let b;
  if (t.closest('[data-tchange]')) { stopPlay(); changeSheet(rerender); return true; }
  if ((b = t.closest('[data-tape]'))) { stopPlay(); tapeSheet(b.dataset.tape, rerender); return true; }
  if (t.closest('[data-tapp]')) { appSheet(rerender); return true; }
  if ((b = t.closest('[data-tfull]'))) {
    const tp = tapes().find(x => x.id === b.dataset.tfull); if (!tp) return true;
    const go = () => window.open(fullUrl(tp, get().settings.musicApp), '_blank');
    if (!get().settings.musicApp) appSheet(() => { go(); rerender(); }); else go();
    return true;
  }
  if ((b = t.closest('[data-tplay]'))) {
    const tp = tapes().find(x => x.id === b.dataset.tplay); if (!tp) return true;
    const box = b.closest('.tapeplayer, .sheet') || scope, cas = box.querySelector('.cassette'), note = box.querySelector('#tpnote');
    if (b.classList.contains('on')) { stopPlay(); return true; }
    b.classList.add('on'); b.textContent = '■ Stop'; if (cas) cas.classList.add('playing');
    const was = note ? note.innerHTML : '';
    play(tp, () => { b.classList.remove('on'); b.textContent = '▶ Play'; if (cas) cas.classList.remove('playing'); if (note) note.innerHTML = was; }).then(kind => {
      if (!note || !b.classList.contains('on')) return;
      note.textContent = kind === 'preview' ? 'Playing a 30-second preview.' : kind === 'tune' ? 'No preview for this one, so here\'s a little tune of its own.' : 'This phone can\'t play sound here.';
    });
    return true;
  }
  return false;
}
