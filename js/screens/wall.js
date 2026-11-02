// Your wall (v77, funky in v78): make a month planner to print and stick on the wall. In the comic style of the
// first mockups (Phavan): a Bangers headline, thick black outlines and hard shadows, yellow / blue / red, circles
// peeking in from the corners, a tilted red phrase sticker with some attitude. Pressure-free on purpose: no
// checkboxes, no "overdue", no counts. A red star marks what you marked ★ Important; a yellow ring marks a free day
// ("room to breathe"). A little blank space in every day for a pen, no lines. No character: the poster stands on
// its own. A4 landscape, in colour. It lives only on paper, so the plans show nowhere else in the app.
// Saved in st.wall: { plans: { 'YYYY-MM-DD': [{ id, t, ic, imp }] }, phrase: { 'YYYY-MM': 'TEXT' } }
// (v77's wishes are no longer used).
import { get, save, uid, today, dateKey, parseKey } from '../store.js';
import { esc, nav, backLink, him, openSheet, closeSheet, toast, IOS, canShareFile, saveToDevice, SAVED_NOTE } from '../ui.js';
import { makePDF, shareFile } from '../pdf.js';
import { fontsReady, loadCovers } from '../cards.js';
import { recapData, drawRecap, photoWin, cropRect } from '../recap.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX = 3, LEN = 40; // v78: long ones wrap on the poster instead of being cut, so a little more room
// little drawn icons (24 x 24, stroked): the same paths draw in the app and on the poster, so they look alike
export const ICONS = {
  none: { n: 'No icon', p: '', c: '#FFE89A' },
  book: { n: 'Study', p: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5M8 7h8', c: '#D8E5FF' },
  cake: { n: 'Birthday', p: 'M4 21h16v-8H4zM4 16.5c2 1.5 4-1.5 6 0s4-1.5 6 0 4-1.5 4 0M12 13V9M12 6.5V5', c: '#FFD6E0' },
  heart: { n: 'Someone', p: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z', c: '#FFD6E0' },
  friends: { n: 'Friends', p: 'M6 8a3 3 0 1 0 6 0 3 3 0 1 0-6 0zM14.5 9a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0zM3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.6c3.2 0 6 2.1 6 5.4', c: '#FFDCC2' },
  care: { n: 'Doctor', p: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0zM12 8v8M8 12h8', c: '#E3D9FA' },
  move: { n: 'Move', p: 'M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12', c: '#CDEFD9' },
  trip: { n: 'Trip', p: 'M3 7.5h18v13H3zM8.5 7.5v-3h7v3M7.5 7.5v13M16.5 7.5v13', c: '#FFDCC2' }, // v79: a suitcase
  music: { n: 'Fun', p: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', c: '#E3D9FA' },
  star: { n: 'Big day', p: 'M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z', c: '#FFE89A' } // v79: a sparkle, so it never looks like the red "important" star
};
// v79: the same icons as big filled stamps behind a day's number on the poster: f = the filled shape, d = a few detail lines
const STAMP = {
  book: { f: 'M5 2.5h12.5a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H5z', d: 'M8 2.5v19M11 7h5.5M11 10h5.5' },
  cake: { f: 'M3.5 12.5h17v9h-17zM11 6.5h2v6h-2zM12 1.8c1.6 1.7 1.6 3.2 0 4.2-1.6-1-1.6-2.5 0-4.2z', d: 'M3.5 16c2 1.6 3.7-1.6 5.7 0s3.7-1.6 5.7 0 3.7-1.6 5.6 0' },
  heart: { f: 'M12 21s-8.5-5.2-8.5-11.6A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.5 2.8C20.5 15.8 12 21 12 21z', d: '' },
  friends: { f: 'M8.5 3.5a3.3 3.3 0 1 1 0 6.6 3.3 3.3 0 1 1 0-6.6zM2.5 20.5c0-3.9 2.7-6.6 6-6.6s6 2.7 6 6.6zM16.5 5.5a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 1 1 0-5.6zM15.8 20.5c0-2.6-.8-4.6-2-5.8.9-.6 1.8-.9 2.7-.9 2.9 0 5 2.6 5 6.7z', d: '' },
  care: { f: 'M9 2.5h6v6.5h6.5v6H15v6.5H9V15H2.5V9H9z', d: '' },
  move: { f: 'M1.5 9h3v6h-3zM4.5 6.5h3.5v11H4.5zM16 6.5h3.5v11H16zM19.5 9h3v6h-3zM8 10.8h8v2.4H8z', d: '' },
  trip: { f: 'M2.5 7.5h19v13.5h-19zM8.5 7.5V4h7v3.5h-2V5.8h-3v1.7z', d: 'M7 7.5V21M17 7.5V21' }, // a suitcase: chunky enough to sit behind a number
  music: { f: 'M5.5 14.5a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 1 1 0-6.4zM17.3 12.5a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 1 1 0-6.4zM7.3 5.8L20.6 2.6v3.4L7.3 9.2zM7.3 5.8h1.9v12.4H7.3zM18.7 3.1h1.9v12.8h-1.9z', d: '' },
  star: { f: 'M12 1.5l2.6 7.6 7.9 2.9-7.9 2.9L12 22.5l-2.6-7.6-7.9-2.9 7.9-2.9z', d: '' }
};
const svgIcon = (k, s = 18) => ICONS[k] && ICONS[k].p ? '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[k].p + '"/></svg>' : '';

let ym = null, root = null, mode = 'plan', bym = null, photos = []; // photos (v84): [{ img, cap, date }], never saved, forgotten when you leave // mode (v81): 'plan' (the planner) or 'back' (Look what you did, for bym)
const W = () => { const st = get(); st.wall = st.wall || {}; st.wall.plans = st.wall.plans || {}; st.wall.phrase = st.wall.phrase || {}; st.wall.made = st.wall.made || {}; return st.wall; };
const ymOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const stepMonth = (k, n) => { const [y, m] = k.split('-').map(Number); return ymOf(new Date(y, m - 1 + n, 1)); };
const monthName = k => { const [y, m] = k.split('-').map(Number); return MONTHS[m - 1] + ' ' + y; };
const MON = k => MONTHS[Number(k.slice(5)) - 1].toUpperCase();
// the month to plan: this month, or next month from the 25th (when the Home nudge starts too)
export const defaultYm = () => { const t = new Date(); return t.getDate() >= 25 ? stepMonth(ymOf(t), 1) : ymOf(t); };
export const monthWord = k => MONTHS[Number(k.slice(5)) - 1];
// the Home nudge (v79): from the 25th, until next month's poster has been made
// the recap nudge (v81): in the first week of a month, last month's recap is ready (if anything happened in it), until you've looked
export function recapNudge() { const t = new Date(); if (t.getDate() > 7) return null; const k = stepMonth(ymOf(t), -1); const w = W(); return (w.seen || {})[k] ? null : recapData(k).any ? k : null; }
// (v79's Home nudge for the planner was removed in v82: it felt like pressure; nudge() is kept, unused)
export function nudge() { const t = new Date(); if (t.getDate() < 25) return null; const k = stepMonth(ymOf(t), 1); return W().made[k] ? null : k; }
// the red sticker: cool, not soft (Phavan). Prequel picks one; shuffle for another, or write your own.
export const PHRASES = M => ['MAIN CHARACTER MONTH', M + ', UNFILTERED', 'MY ' + M + ' ERA', 'SIDE QUEST SEASON', 'NEW CHAPTER UNLOCKED', 'PLOT TWIST PENDING', 'LOADING: GOOD THINGS', 'CERTIFIED ' + M, 'SOFT LAUNCH: ME', 'NO NOTES. JUST ' + M + '.', M + ' ON REPEAT', 'BIG ' + M + ' ENERGY', M + ', IN TECHNICOLOUR', 'THE ' + M + ' EDIT'];
const pick0 = k => { let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
export const phraseOf = k => { const own = (W().phrase[k] || '').trim(); if (own) return own; const L = PHRASES(MON(k)); return L[pick0(k) % L.length]; };
// the days of a month, Monday first, with blanks before the 1st
function weeks(k) {
  const [y, m] = k.split('-').map(Number), first = new Date(y, m - 1, 1), n = new Date(y, m, 0).getDate(), lead = (first.getDay() + 6) % 7;
  const cells = []; for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= n; d++) cells.push(dateKey(new Date(y, m - 1, d)));
  while (cells.length % 7) cells.push(null);
  const out = []; for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7)); return out;
}
const sorted = list => list.slice().sort((a, b) => (b.imp ? 1 : 0) - (a.imp ? 1 : 0)); // important first
const pill = (p, s = 14) => '<span class="wpill' + (p.imp ? ' imp' : '') + '" style="background:' + ICONS[p.ic || 'none'].c + '">' + (p.imp ? '<b class="wstar" aria-label="important">★</b>' : '') + svgIcon(p.ic, s) + esc(p.t) + '</span>';

export function mount(r, params = {}) {
  root = r;
  if (params.back) { mode = 'back'; bym = params.back.length === 7 ? params.back : null; } // ?back=YYYY-MM from the Home nudge or Me
  else if (params.plan) mode = 'plan'; // v91: ?plan=1 from Me's "Plan <month>"
  // the month to plan: this month, or next month once this one is nearly over
  if (!ym) ym = defaultYm();
  photos = [];
  render();
  root.addEventListener('click', onClick);
  root.addEventListener('change', onPick);
  root.addEventListener('input', e => { const b = e.target.closest('[data-wcap]'); if (b && photos[b.dataset.wcap]) photos[b.dataset.wcap].cap = b.value; });
}
export function unmount() { photos = []; } // leaving the page forgets the photos

// ---------- your photos on the recap (v84): picked fresh each time, kept only while this page is open ----------
// the date a photo was taken, from its EXIF (JPEG only), in words; '' when it can't tell
async function photoDate(file) {
  try {
    const v = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (v.getUint16(0) !== 0xFFD8) return '';
    let o = 2;
    while (o + 4 < v.byteLength) {
      const mk = v.getUint16(o), len = v.getUint16(o + 2);
      if (mk === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) { // "Exif"
        const t = o + 10, le = v.getUint16(t) === 0x4949, u16 = a => v.getUint16(a, le), u32 = a => v.getUint32(a, le);
        const find = (ifd, tag) => { const n = u16(t + ifd); for (let i = 0; i < n; i++) { const e = t + ifd + 2 + i * 12; if (u16(e) === tag) return e; } return 0; };
        const ex = find(u32(t + 4), 0x8769); if (!ex) return '';
        const e = find(u32(ex + 8), 0x9003) || find(u32(ex + 8), 0x9004); if (!e) return '';
        let str = ''; const at = t + u32(e + 8); for (let i = 0; i < 19; i++) str += String.fromCharCode(v.getUint8(at + i));
        const m = str.match(/^(\d{4}):(\d{2}):(\d{2})/); if (!m) return '';
        return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
      }
      if ((mk & 0xFF00) !== 0xFF00) return '';
      o += 2 + len;
    }
  } catch (e) { /* no date, that's fine */ }
  return '';
}
// a smaller copy (about 1200 px on the long side): plenty for print, light on the phone
function shrink(file) {
  return new Promise((ok, no) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => { const s = Math.min(1, 1200 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c); };
    im.onerror = () => { URL.revokeObjectURL(u); no(new Error('not a picture')); };
    im.src = u;
  });
}
async function onPick(e) {
  const inp = e.target.closest('[data-wphoto]'); if (!inp || !inp.files || !inp.files[0]) return;
  const f = inp.files[0], i = Math.min(Number(inp.dataset.wphoto), photos.length, 2);
  try { const [img, date] = await Promise.all([shrink(f), photoDate(f)]); photos[i] = { img, cap: photos[i] ? photos[i].cap : '', date, cx: 0.5, cy: 0.5, z: 1 }; render(); }
  catch (err) { toast('That photo wouldn\'t open. Try another one?'); }
}
// v90: what the polaroid will show, as a small picture (your framing, the window's shape)
const win = () => { const d = recapData(bym); return photoWin(!!(d.snd || d.best)); };
function framed(p, w) {
  const W0 = win(), c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * W0.h / W0.w);
  const r = cropRect(p.img.width, p.img.height, c.width, c.height, p.cx, p.cy, p.z); c.getContext('2d').drawImage(p.img, r.sx, r.sy, r.sw, r.sh, 0, 0, c.width, c.height); return c;
}
// move and zoom a photo inside its polaroid window: drag with a finger, a slider for zoom. Forgotten with the photo.
function cropSheet(i) {
  const p = photos[i]; if (!p) return;
  const sheet = openSheet('<h2>Move or zoom</h2><p class="muted" style="margin:0;font-size:13px">Drag the photo until it looks right. This is exactly what the polaroid shows.</p>' +
    '<div class="wcropbox"><canvas class="wcrop" aria-label="Your photo in its polaroid window"></canvas></div>' +
    '<label class="wzoom"><span>Zoom</span><input type="range" min="1" max="3" step="0.01" value="' + p.z + '" data-wz aria-label="Zoom"></label>' +
    '<div class="grid2"><button type="button" class="btn alt" data-wreset>Start again</button><button type="button" class="btn" data-close>Done</button></div>', ev => {
    if (ev.target.closest('[data-wreset]')) { p.cx = 0.5; p.cy = 0.5; p.z = 1; sheet.querySelector('[data-wz]').value = 1; draw(); render(); }
  });
  const cv = sheet.querySelector('.wcrop'), W0 = win(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => { const w = cv.parentNode.clientWidth || 300; cv.style.width = w + 'px'; cv.style.height = Math.round(w * W0.h / W0.w) + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(w * W0.h / W0.w * dpr); };
  const settle = () => { // keep the middle where the window can actually reach, so a drag never feels stuck
    const r = cropRect(p.img.width, p.img.height, W0.w, W0.h, p.cx, p.cy, p.z);
    p.cx = (r.sx + r.sw / 2) / p.img.width; p.cy = (r.sy + r.sh / 2) / p.img.height;
  };
  const draw = () => { const r = cropRect(p.img.width, p.img.height, cv.width, cv.height, p.cx, p.cy, p.z), g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(p.img, r.sx, r.sy, r.sw, r.sh, 0, 0, cv.width, cv.height); };
  size(); draw();
  let last = null;
  cv.addEventListener('pointerdown', e => { last = [e.clientX, e.clientY]; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* fine */ } e.preventDefault(); });
  cv.addEventListener('pointermove', e => {
    if (!last) return;
    const r = cropRect(p.img.width, p.img.height, cv.width, cv.height, p.cx, p.cy, p.z), k = r.sw / cv.clientWidth; // photo pixels per screen pixel
    p.cx -= (e.clientX - last[0]) * k / p.img.width; p.cy -= (e.clientY - last[1]) * k / p.img.height; last = [e.clientX, e.clientY];
    settle(); draw();
  });
  const up = () => { if (last) { last = null; render(); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  sheet.querySelector('[data-wz]').addEventListener('input', e => { p.z = Number(e.target.value); settle(); draw(); });
  sheet.querySelector('[data-wz]').addEventListener('change', () => render());
}
function photosCard(d) {
  const chips = (d.hls || []).slice(0, 4);
  return '<div class="card wphotos"><b>Your photos <span class="muted" style="font-weight:600">(if you like)</span></b>' +
    '<p class="muted" style="margin:0;font-size:13px">Up to three, printed as polaroids. They\'re never saved: leave this page and they\'re gone.</p>' +
    photos.map((p, i) => '<div class="wph"><button type="button" class="wthumb" data-wcrop="' + i + '" aria-label="Move or zoom photo ' + (i + 1) + '"><img src="' + framed(p, 192).toDataURL('image/jpeg', 0.7) + '" alt=""><span>Move or zoom</span></button><div class="wphr">' +
      '<input type="text" maxlength="32" data-wcap="' + i + '" value="' + esc(p.cap) + '" placeholder="a few words, if you like" aria-label="Caption for photo ' + (i + 1) + '">' +
      (chips.length ? '<div class="wchips">' + chips.map(h => '<button type="button" class="wchip" data-wchip="' + i + '" data-t="' + esc(h) + '">' + esc(h) + '</button>').join('') + '</div>' : '') +
      '<p class="muted" style="margin:0;font-size:12px">' + (p.date ? 'Left empty, it says ' + esc(p.date) + '.' : 'Left empty, the caption stays blank.') + '</p>' +
      '<button type="button" class="lnk" data-wdel="' + i + '">Remove this photo</button></div></div>').join('') +
    (photos.length < 3 ? '<label class="btn alt wadd"><input type="file" accept="image/*" data-wphoto="' + photos.length + '" class="vh">Add a photo</label>' : '') +
    '</div>';
}

const modeHtml = () => '<div class="seg wmodes" role="group" aria-label="Which poster"><button type="button" data-mode="plan" aria-pressed="' + (mode === 'plan') + '">Plan a month</button><button type="button" data-mode="back" aria-pressed="' + (mode === 'back') + '">Look back</button></div>';
const hero = () => '<div class="top">' + backLink() + '</div>' +
  '<div class="hero">' + him('stickynote', 'breathe', 'Your character holding a sticky note') + '<div class="txt"><h1>Your wall</h1><p class="say">' + (mode === 'back' ? 'A month you lived, as a poster. Look what you did.' : 'Your month as a poster to print and stick up. Nothing on it has to happen.') + '</p></div></div>';
function render() { if (mode === 'back') renderBack(); else renderPlan(); }

// ---------- Look what you did (v81) ----------
function renderBack() {
  const now = ymOf(new Date()); if (!bym) bym = stepMonth(now, -1);
  const w = W(); w.seen = w.seen || {}; if (!w.seen[bym]) { w.seen[bym] = Date.now(); save(); } // the Home nudge rests once you've looked
  const d = recapData(bym), name = MONTHS[Number(bym.slice(5)) - 1];
  root.innerHTML = hero() + modeHtml() +
    '<div class="wmonth"><button type="button" data-bym="-1" aria-label="Month before"' + (bym <= stepMonth(now, -24) ? ' disabled' : '') + '>‹</button><b>' + esc(monthName(bym)) + '</b><button type="button" data-bym="1" aria-label="Next month"' + (bym >= now ? ' disabled' : '') + '>›</button></div>' +
    (d.any
      ? '<div class="card wback"><b>On the poster</b>' +
          (d.tiles.length ? '<div class="wtiles">' + d.tiles.map(t => '<span><b>' + t[0] + '</b>' + esc(t[1]) + (t[2] ? '<small>' + esc(t[2]) + '</small>' : '') + '</span>').join('') + '</div>' : '') +
          '<p class="muted" style="margin:0;font-size:13px">' + [d.weather.length ? d.weather.length + (d.weather.length === 1 ? ' day' : ' days') + ' of weather' : '', d.cons.length ? d.cons.map(c => c.name).join(' and ') : d.newStars ? d.newStars + ' new stars' : '', d.quilt.length ? d.quilt.length + ' quilt ' + (d.quilt.length === 1 ? 'patch' : 'patches') : ''].filter(Boolean).map(esc).join(' · ') + '</p>' +
          (d.snd ? '<p style="margin:0;font-size:14px"><b>The soundtrack:</b> ' + esc(d.snd.title) + (d.snd.artist ? ' · ' + esc(d.snd.artist) : '') + '</p>' : d.best ? '<p style="margin:0;font-size:14px"><b>' + esc(d.best[0]) + ':</b> ' + esc(d.best[1]) + '</p>' : '') +
          '<p class="muted" style="margin:0;font-size:13px">' + (photos.length ? 'Your ' + (photos.length === 1 ? 'photo' : photos.length + ' photos') + ' as polaroids.' : 'Your month at a glance: the days you moved, soft days and nights of rest. Or add your own photos below.') + '</p></div>' +
        photosCard(d) +
        '<div class="card wphrase"><b>The sticker</b><p class="muted" style="font-size:13px;margin:0">The same phrase as ' + esc(name) + '\'s planner.</p><div class="wstk"><span class="wsticker blue">' + esc(phraseOf(bym)) + '</span></div><div class="grid2"><button type="button" class="btn alt" data-shuffle>Shuffle</button><button type="button" class="btn alt" data-ownphrase>Write my own</button></div></div>' +
        '<button type="button" class="btn wide" data-recap>Make my ' + esc(name) + ' recap</button>' +
        '<p class="muted" style="font-size:12px;text-align:center;margin:0">A4 portrait, in colour. Print it and stick it up.</p>'
      : '<div class="card"><p style="margin:0">Nothing written down for ' + esc(name) + ' yet. Once you log a little, its recap is here.</p></div>') +
    nav('me');
}

function renderPlan() {
  const w = W(), now = ymOf(new Date()), plans = w.plans;
  const inMonth = Object.keys(plans).filter(k => k.startsWith(ym) && plans[k].length).sort();
  root.innerHTML = hero() + modeHtml() +
    '<div class="wmonth"><button type="button" data-ym="-1" aria-label="Month before"' + (ym <= now ? ' disabled' : '') + '>‹</button><b>' + esc(monthName(ym)) + '</b><button type="button" data-ym="1" aria-label="Next month"' + (ym >= stepMonth(now, 12) ? ' disabled' : '') + '>›</button></div>' +
    '<div class="card wcal"><div class="wdow">' + DOW.map(d => '<span>' + d + '</span>').join('') + '</div>' +
      weeks(ym).map(wk => '<div class="wrow">' + wk.map(k => { const L = plans[k] || [], imp = L.some(p => p.imp); return k ? '<button type="button" class="wd' + (L.length ? ' has' : '') + (imp ? ' imp' : '') + (k === today() ? ' today' : '') + '" data-wday="' + k + '" aria-label="' + esc(parseKey(k).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })) + (L.length ? ', ' + L.length + ' planned' : '') + (imp ? ', important' : '') + '"><span>' + Number(k.slice(8)) + '</span>' + (imp ? '<b class="wstar" aria-hidden="true">★</b>' : L.length ? '<i>' + L.map(p => '<em style="background:' + ICONS[p.ic || 'none'].c + '"></em>').join('') + '</i>' : '') + '</button>' : '<span class="wd blank"></span>'; }).join('') + '</div>').join('') +
      '<p class="muted wtip">Tap a day to add something. ★ marks the important ones.</p></div>' +
    (inMonth.length ? '<div class="card wlist"><b>On the poster</b>' + inMonth.map(k => '<div class="wli"><span class="wdate">' + esc(parseKey(k).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' })) + '</span><span class="wits">' + sorted(plans[k]).map(p => pill(p)).join('') + '</span><button type="button" class="lnk" data-wday="' + k + '">change</button></div>').join('') + '</div>' : '') +
    '<div class="card wphrase"><b>The sticker</b><p class="muted" style="font-size:13px;margin:0">A phrase for this month, on a red sticker in the corner of your poster.</p>' +
      '<div class="wstk"><span class="wsticker">' + esc(phraseOf(ym)) + '</span></div>' +
      '<div class="grid2"><button type="button" class="btn alt" data-shuffle>Shuffle</button><button type="button" class="btn alt" data-ownphrase>Write my own</button></div></div>' +
    '<button type="button" class="btn wide" data-poster>Make my ' + esc(MONTHS[Number(ym.slice(5)) - 1]) + ' poster</button>' +
    '<p class="muted" style="font-size:12px;text-align:center;margin:0">A4 landscape, in colour. Print it and stick it up.</p>' +
    nav('me');
}

const cur = () => mode === 'back' ? bym : ym; // the month the sticker belongs to
function onClick(e) {
  const t = e.target; let b;
  if ((b = t.closest('[data-ym]')) && !b.disabled) { ym = stepMonth(ym, Number(b.dataset.ym)); render(); return; }
  if ((b = t.closest('[data-wday]'))) { daySheet(b.dataset.wday); return; }
  if (t.closest('[data-poster]')) { makePoster(); return; }
  if ((b = t.closest('[data-mode]'))) { mode = b.dataset.mode; render(); window.scrollTo(0, 0); return; }
  if ((b = t.closest('[data-bym]')) && !b.disabled) { bym = stepMonth(bym, Number(b.dataset.bym)); photos = []; render(); return; } // photos belong to one month
  if ((b = t.closest('[data-wchip]'))) { const p = photos[b.dataset.wchip]; if (p) { p.cap = b.dataset.t.slice(0, 32); render(); } return; }
  if ((b = t.closest('[data-wcrop]'))) { cropSheet(Number(b.dataset.wcrop)); return; }
  if ((b = t.closest('[data-wdel]'))) { photos.splice(Number(b.dataset.wdel), 1); render(); return; }
  if (t.closest('[data-recap]')) { makeRecap(); return; }
  if (t.closest('[data-shuffle]')) { // the next one from the list (your own phrase is set aside)
    const k = cur(), L = PHRASES(MON(k)), i = L.indexOf(phraseOf(k)); W().phrase[k] = L[(i < 0 ? pick0(k) : i + 1) % L.length]; save(); render(); return;
  }
  if (t.closest('[data-ownphrase]')) { phraseSheet(); return; }
}

function phraseSheet() {
  const k = cur();
  const sh = openSheet('<h2>Your own phrase</h2><p class="muted" style="margin:0">Something cool for the sticker. Up to 24 letters.</p>' +
    '<input id="wPh" type="text" maxlength="24" autocomplete="off" autocapitalize="characters" value="' + esc(W().phrase[k] || '') + '" placeholder="e.g. ' + esc(PHRASES(MON(k))[2]) + '">' +
    '<button type="button" class="btn" data-phok>Use it</button><button type="button" class="btn alt" data-close>Cancel</button>', ev => {
    if (!ev.target.closest('[data-phok]')) return;
    const v = sh.querySelector('#wPh').value.trim().toUpperCase().slice(0, 24);
    if (v) W().phrase[k] = v; else delete W().phrase[k];
    save(); closeSheet(); render();
  });
}

// one day: what's on it, and add something (a few words, a little icon, and ★ if it's important)
function daySheet(k) {
  let ic = 'none', imp = false;
  const list = () => W().plans[k] || [];
  const draw = () => '<h2>' + esc(parseKey(k).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })) + '</h2>' +
    (list().length ? '<div class="wsheet">' + list().map(p => '<div class="wli">' + pill(p) + '<button type="button" class="wimp" data-wtog="' + p.id + '" aria-pressed="' + !!p.imp + '" aria-label="' + (p.imp ? 'Not important' : 'Mark as important') + '">★</button><button type="button" class="x" data-wdel="' + p.id + '" aria-label="Take ' + esc(p.t) + ' off">×</button></div>').join('') + '</div>' : '<p class="muted" style="margin:0">Nothing on this day yet.</p>') +
    (list().length < MAX
      ? '<label class="field-label" for="wTxt">ADD SOMETHING</label><div class="waddrow"><input id="wTxt" type="text" maxlength="' + LEN + '" placeholder="e.g. Essay due, Dentist, Mum\'s birthday" autocomplete="off"><button type="button" class="wimp big" data-wimp aria-pressed="' + imp + '">★ Important</button></div>' +
        '<div class="wics" role="group" aria-label="A little icon">' + Object.keys(ICONS).map(n => '<button type="button" data-wic="' + n + '" aria-pressed="' + (n === ic) + '" style="background:' + ICONS[n].c + '">' + (ICONS[n].p ? svgIcon(n, 18) : '') + '<small>' + esc(ICONS[n].n) + '</small></button>').join('') + '</div>' +
        '<button type="button" class="btn" data-wadd>Add to the day</button>'
      : '<p class="muted" style="margin:0">Three is plenty for one day.</p>') +
    '<button type="button" class="btn alt" data-close>Done</button>';
  const sh = openSheet(draw(), ev => {
    const t = ev.target; let b;
    const redraw = () => { const typed = (sh.querySelector('#wTxt') || {}).value || ''; sh.querySelector('.sheet').innerHTML = draw(); const i = sh.querySelector('#wTxt'); if (i) i.value = typed; render(); };
    if ((b = t.closest('[data-wic]'))) { ic = b.dataset.wic; sh.querySelectorAll('[data-wic]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
    if ((b = t.closest('[data-wimp]'))) { imp = !imp; b.setAttribute('aria-pressed', String(imp)); return; }
    if ((b = t.closest('[data-wtog]'))) { const p = list().find(x => x.id === b.dataset.wtog); if (p) { if (p.imp) delete p.imp; else p.imp = true; save(); } redraw(); return; }
    if ((b = t.closest('[data-wdel]'))) { const w = W(); w.plans[k] = list().filter(p => p.id !== b.dataset.wdel); if (!w.plans[k].length) delete w.plans[k]; save(); redraw(); return; }
    if (t.closest('[data-wadd]')) {
      const inp = sh.querySelector('#wTxt'), v = inp.value.trim().slice(0, LEN); if (!v) { inp.focus(); return; }
      const w = W(), p = { id: uid(), t: v, ic }; if (imp) p.imp = true; (w.plans[k] = w.plans[k] || []).push(p); save(); inp.value = ''; ic = 'none'; imp = false; redraw(); return;
    }
  });
}

// ---------- the poster: A4 landscape at 200 dpi, comic style ----------
const PW = 2339, PH = 1654, M = 70, INK = '#1E1E24', CREAM = '#FDF3D6', CELL = '#FFFBF0', YEL = '#F4C430', BLU = '#1F55D0', RED = '#E5452F';
const BANG = '"Bangers", "Impact", sans-serif', BODY = '"Nunito", system-ui, sans-serif';
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// a comic box: a hard black shadow, a fill, a thick outline
function box(g, x, y, w, h, fill, o = {}) { const sh = o.shadow == null ? 10 : o.shadow, r = o.r || 6; if (sh) { g.fillStyle = INK; rr(g, x + sh, y + sh, w, h, r); g.fill(); } g.fillStyle = fill; rr(g, x, y, w, h, r); g.fill(); g.lineWidth = o.lw || 5; g.strokeStyle = INK; g.stroke(); }
function star(g, cx, cy, R, fill) { g.beginPath(); for (let q = 0; q < 10; q++) { const r = q % 2 ? R * 0.48 : R, an = -Math.PI / 2 + q * Math.PI / 5; g.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r); } g.closePath(); g.fillStyle = fill; g.fill(); g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); }
// a big icon stamp: the filled shape in the icon's colour, a thick outline, then its detail lines
function stamp(g, k, cx, cy, size) {
  const S = STAMP[k]; if (!S) return; const sc = size / 24;
  g.save(); g.translate(cx - size / 2, cy - size / 2); g.scale(sc, sc); g.lineJoin = 'round'; g.lineCap = 'round';
  const f = new Path2D(S.f); g.fillStyle = ICONS[k].c; g.fill(f); g.lineWidth = 5 / sc; g.strokeStyle = INK; g.stroke(f);
  if (S.d) { g.lineWidth = 3.5 / sc; g.stroke(new Path2D(S.d)); }
  g.restore();
}
// words that wrap onto lines; shrinks a little before it would ever cut a word
function lines(g, s, size, maxW, maxL) {
  for (let fs = size; fs >= size * 0.7; fs -= 1) {
    if (fs < size * 0.86 && maxL < 3) maxL = 3; // rather a third line than cutting words
    g.font = '800 ' + fs + 'px ' + BODY; const out = []; let line = '';
    s.split(/\s+/).forEach(wd => { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > maxW && line) { out.push(line); line = wd; } else line = t; });
    if (line) out.push(line);
    if (out.length <= maxL && out.every(l => g.measureText(l).width <= maxW)) return { out, fs };
  }
  g.font = '800 ' + Math.round(size * 0.78) + 'px ' + BODY; // last resort: very long single words
  const out = []; let line = ''; for (const ch of s) { if (g.measureText(line + ch).width > maxW) { out.push(line); line = ch; } else line += ch; } out.push(line);
  return { out: out.slice(0, maxL), fs: Math.round(size * 0.78) };
}
function drawIcon(g, k, x, y, size) { const p = ICONS[k] && ICONS[k].p; if (!p) return; g.save(); g.translate(x, y); g.scale(size / 24, size / 24); g.lineWidth = 2.3; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = INK; g.stroke(new Path2D(p)); g.restore(); }
function outlined(g, s, x, y, font, fill, ol, lw) { g.font = font; g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = ol; g.strokeText(s, x, y); g.fillStyle = fill; g.fillText(s, x, y); }

export function drawPoster(k) {
  const c = document.createElement('canvas'); c.width = PW; c.height = PH; const g = c.getContext('2d');
  const plans = W().plans;
  g.fillStyle = CREAM; g.fillRect(0, 0, PW, PH);
  // circles peeking in from the corners
  g.fillStyle = YEL; g.beginPath(); g.arc(-40, -60, 420, 0, 7); g.fill();
  g.fillStyle = BLU; g.beginPath(); g.arc(PW + 70, 120, 330, 0, 7); g.fill();
  g.fillStyle = YEL; g.beginPath(); g.arc(PW - 120, PH + 60, 200, 0, 7); g.fill();
  // the headline
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const [yy, mm] = k.split('-').map(Number), title = MONTHS[mm - 1].toUpperCase() + ' ' + yy;
  g.save(); g.translate(M + 6, 196); g.rotate(-0.02);
  outlined(g, title, 8, 8, '400 172px ' + BANG, INK, INK, 18); // the hard shadow
  outlined(g, title, 0, 0, '400 172px ' + BANG, INK, '#FFFFFF', 16);
  g.restore();
  // the label under it
  g.save(); g.translate(M + 20, 222); g.rotate(-0.025);
  g.font = '400 50px ' + BANG; const lw = g.measureText('MY MONTH PLANNER').width + 48;
  box(g, 0, 0, lw, 70, '#FFFFFF', { shadow: 8, lw: 5, r: 2 }); g.fillStyle = INK; g.fillText('MY MONTH PLANNER', 24, 54);
  g.restore();
  // the red phrase sticker, tilted, top right
  const ph = phraseOf(k);
  g.save(); let fs = 64; g.font = '400 ' + fs + 'px ' + BANG; while (g.measureText(ph).width > 760 && fs > 40) { fs -= 2; g.font = '400 ' + fs + 'px ' + BANG; }
  const sw = g.measureText(ph).width + 70, shh = fs + 46;
  g.translate(PW - M - 260 - sw / 2, 150); g.rotate(-0.05);
  box(g, -sw / 2, -shh / 2, sw, shh, RED, { shadow: 10, lw: 6, r: 3 });
  g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.fillText(ph, 0, fs * 0.36); g.textAlign = 'left';
  g.restore();
  // the grid panel
  const wk = weeks(k), rows = wk.length, top = 300, legendH = 58, px = M, pw = PW - 2 * M, pb = PH - M - legendH, phh = pb - top;
  box(g, px, top, pw, phh, '#FFFFFF', { shadow: 14, lw: 6, r: 6 });
  const pad = 18, gap = 10, cw = (pw - 2 * pad - gap * 6) / 7, hh = 62, gy = top + pad + hh + gap, ch = (pb - pad - gy - gap * (rows - 1)) / rows;
  const HEAD = [YEL, BLU, RED, YEL, BLU, RED, YEL];
  DOW.forEach((d, i) => { const x = px + pad + i * (cw + gap); box(g, x, top + pad, cw, hh, HEAD[i], { shadow: 0, lw: 4, r: 4 }); g.font = '400 44px ' + BANG; g.textAlign = 'center'; g.fillStyle = HEAD[i] === YEL ? INK : '#FFFFFF'; g.fillText(d.toUpperCase(), x + cw / 2, top + pad + 47); g.textAlign = 'left'; });
  wk.forEach((row, r) => row.forEach((key, i) => {
    const x = px + pad + i * (cw + gap), y = gy + r * (ch + gap);
    if (!key) return;
    box(g, x, y, cw, ch, CELL, { shadow: 0, lw: 3.5, r: 4 });
    const list = sorted(plans[key] || []), imp = list.some(p => p.imp), n = String(Number(key.slice(8))), first = list[0];
    // the words first (bold, centred, wrapping; smaller on busy days), then the number takes all the room that's left
    const tw = cw - 20; let words = null, wh = 0;
    for (const fs of [26, 24, 22, 20, 19, 18]) {
      words = list.map(p => lines(g, p.t, fs, tw, 2)); wh = words.reduce((h, L) => h + L.out.length * L.fs * 1.12, 0) + Math.max(0, words.length - 1) * 4;
      if (wh <= ch * 0.42) break;
    }
    let shown = list.length; while (shown > 1 && wh > ch * 0.48) { shown--; words = words.slice(0, shown); wh = words.reduce((h, L) => h + L.out.length * L.fs * 1.12, 0) + Math.max(0, words.length - 1) * 4; }
    const zone = ch - (list.length ? wh + 12 : 0) - 8, cx = x + cw / 2, cy = y + 6 + zone / 2, R = Math.min(zone * 0.47, cw * 0.36);
    const nfs = Math.round(Math.min(zone * (list.length ? 0.6 : 0.62), cw * 0.42));
    if (imp) { star(g, cx, cy + R * 0.06, R * 1.12, RED); g.textAlign = 'center'; outlined(g, n, cx, cy + nfs * 0.36, '400 ' + Math.round(nfs * 0.82) + 'px ' + BANG, '#FFFFFF', INK, 7); }
    else if (first && STAMP[first.ic]) { stamp(g, first.ic, cx, cy, R * 2.05); g.textAlign = 'center'; outlined(g, n, cx, cy + nfs * 0.36, '400 ' + Math.round(nfs * 0.86) + 'px ' + BANG, '#FFFFFF', INK, 7); }
    else if (!list.length) { g.lineWidth = Math.max(6, R * 0.12); g.strokeStyle = YEL; g.beginPath(); g.arc(cx, cy, R * 0.92, 0, 7); g.stroke(); g.textAlign = 'center'; g.font = '400 ' + Math.round(nfs * 0.86) + 'px ' + BANG; g.fillStyle = INK; g.fillText(n, cx, cy + nfs * 0.31); }
    else { g.textAlign = 'center'; g.font = '400 ' + nfs + 'px ' + BANG; g.fillStyle = INK; g.fillText(n, cx, cy + nfs * 0.36); }
    // the words underneath
    let wy = y + 6 + zone + 6; g.fillStyle = INK; g.textAlign = 'center';
    words.forEach(L => { g.font = '800 ' + L.fs + 'px ' + BODY; L.out.forEach(l => { wy += L.fs * 1.12; g.fillText(l, cx, wy - L.fs * 0.22); }); wy += 4; });
    g.textAlign = 'left';
    if (shown < list.length) { g.font = '800 20px ' + BODY; g.fillStyle = '#5E584B'; g.textAlign = 'right'; g.fillText('+ ' + (list.length - shown) + ' more', x + cw - 12, y + 28); g.textAlign = 'left'; }
  }));
  // the legend: shapes and words, so it never depends on colour
  const ly = PH - M + 22;
  star(g, M + 24, ly - 14, 20, RED); g.font = '800 28px ' + BODY; g.fillStyle = INK; g.fillText('important', M + 56, ly - 4);
  g.lineWidth = 5; g.strokeStyle = YEL; g.beginPath(); g.arc(M + 250, ly - 14, 17, 0, 7); g.stroke(); g.fillText('room to breathe', M + 280, ly - 4);
  return c;
}

async function makeRecap() {
  const k = bym, name = MONTHS[Number(k.slice(5)) - 1];
  openSheet('<h2>Making your recap…</h2><p class="muted">Just a moment.</p>');
  try {
    await fontsReady(); if (document.fonts) await document.fonts.load('400 100px Bangers').catch(() => null);
    const covers = await Promise.race([loadCovers().catch(() => ({})), new Promise(r => setTimeout(() => r({}), 4000))]); // the soundtrack's cover, if it loads in time
    const c = drawRecap(k, phraseOf(k), covers, photos);
    await readySheet('Your ' + name + ' recap', c, name + ' ' + k.slice(0, 4) + ' recap', false, 'A4 portrait. To print, pick portrait and "fit to page".');
  } catch (err) { closeSheet(); toast('Something went wrong making the recap.'); console.error(err); }
}
// v84: two ways out, for both posters: a PDF to print, or a picture (PNG) for your photos or to send.
// Both files are made before the buttons show, so the iPhone share sheet opens straight from the tap.
async function readySheet(title, c, base, landscape, tip) {
  const pdf = new File([makePDF([c], landscape)], base + '.pdf', { type: 'application/pdf' });
  const blob = await new Promise(r => c.toBlob(r, 'image/png')), png = blob ? new File([blob], base + '.png', { type: 'image/png' }) : null;
  openSheet('<h2>' + esc(title) + '</h2><img class="wprev" src="' + c.toDataURL('image/jpeg', 0.7) + '" alt="' + esc(title) + '">' +
    '<div class="grid2"><button type="button" class="btn" data-out="pdf">PDF to print</button>' + (png ? '<button type="button" class="btn" data-out="png">Save as picture</button>' : '') + '</div>' +
    '<p class="muted" style="margin:0;font-size:13px">' + esc(tip) + (IOS ? ' The picture can go straight into your Photos.' : '') + '</p>' +
    '<button type="button" class="btn ghost" data-close>Done</button>', async ev => {
    const b = ev.target.closest('[data-out]'); if (!b) return;
    const f = b.dataset.out === 'png' ? png : pdf;
    if (!IOS && !canShareFile(f)) { saveToDevice(f); toast(SAVED_NOTE); return; }
    const r = await shareFile(f); if (r === 'saved') toast(SAVED_NOTE);
  });
  root.__poster = pdf; root.__png = png; // for the automated tests only
}
async function makePoster() {
  const k = ym, name = MONTHS[Number(k.slice(5)) - 1];
  openSheet('<h2>Making your poster…</h2><p class="muted">Just a moment.</p>');
  try {
    await fontsReady(); if (document.fonts) await document.fonts.load('400 100px Bangers').catch(() => null);
    W().made[k] = Date.now(); save();
    await readySheet('Your ' + name + ' poster', drawPoster(k), name + ' ' + k.slice(0, 4) + ' poster', true, 'A4 landscape. To print, pick landscape and "fit to page".');
  } catch (err) { closeSheet(); toast('Something went wrong making the poster.'); console.error(err); }
}
