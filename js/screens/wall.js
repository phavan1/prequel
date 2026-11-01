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
import { fontsReady } from '../cards.js';

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
  trip: { n: 'Trip', p: 'M3 11l18-7-7 18-3-8zM11 14L21 4', c: '#FFDCC2' },
  music: { n: 'Fun', p: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', c: '#E3D9FA' },
  star: { n: 'Big day', p: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z', c: '#FFE89A' }
};
const svgIcon = (k, s = 18) => ICONS[k] && ICONS[k].p ? '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[k].p + '"/></svg>' : '';

let ym = null, root = null;
const W = () => { const st = get(); st.wall = st.wall || {}; st.wall.plans = st.wall.plans || {}; st.wall.phrase = st.wall.phrase || {}; return st.wall; };
const ymOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const stepMonth = (k, n) => { const [y, m] = k.split('-').map(Number); return ymOf(new Date(y, m - 1 + n, 1)); };
const monthName = k => { const [y, m] = k.split('-').map(Number); return MONTHS[m - 1] + ' ' + y; };
const MON = k => MONTHS[Number(k.slice(5)) - 1].toUpperCase();
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

export function mount(r) {
  root = r;
  // the month to plan: this month, or next month once this one is nearly over
  if (!ym) { const t = new Date(); ym = t.getDate() >= 20 ? stepMonth(ymOf(t), 1) : ymOf(t); }
  render();
  root.addEventListener('click', onClick);
}

function render() {
  const w = W(), now = ymOf(new Date()), plans = w.plans;
  const inMonth = Object.keys(plans).filter(k => k.startsWith(ym) && plans[k].length).sort();
  root.innerHTML =
    '<div class="top">' + backLink() + '</div>' +
    '<div class="hero">' + him('stickynote', 'breathe', 'Your character holding a sticky note') + '<div class="txt"><h1>Your wall</h1><p class="say">Your month as a poster to print and stick up. Nothing on it has to happen.</p></div></div>' +
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

function onClick(e) {
  const t = e.target; let b;
  if ((b = t.closest('[data-ym]')) && !b.disabled) { ym = stepMonth(ym, Number(b.dataset.ym)); render(); return; }
  if ((b = t.closest('[data-wday]'))) { daySheet(b.dataset.wday); return; }
  if (t.closest('[data-poster]')) { makePoster(); return; }
  if (t.closest('[data-shuffle]')) { // the next one from the list (your own phrase is set aside)
    const L = PHRASES(MON(ym)), i = L.indexOf(phraseOf(ym)); W().phrase[ym] = L[(i < 0 ? pick0(ym) : i + 1) % L.length]; save(); render(); return;
  }
  if (t.closest('[data-ownphrase]')) { phraseSheet(); return; }
}

function phraseSheet() {
  const sh = openSheet('<h2>Your own phrase</h2><p class="muted" style="margin:0">Something cool for the sticker. Up to 24 letters.</p>' +
    '<input id="wPh" type="text" maxlength="24" autocomplete="off" autocapitalize="characters" value="' + esc(W().phrase[ym] || '') + '" placeholder="e.g. ' + esc(PHRASES(MON(ym))[2]) + '">' +
    '<button type="button" class="btn" data-phok>Use it</button><button type="button" class="btn alt" data-close>Cancel</button>', ev => {
    if (!ev.target.closest('[data-phok]')) return;
    const v = sh.querySelector('#wPh').value.trim().toUpperCase().slice(0, 24);
    if (v) W().phrase[ym] = v; else delete W().phrase[ym];
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
    const list = sorted(plans[key] || []), imp = list.some(p => p.imp), n = String(Number(key.slice(8))), nx = x + 40, ny = y + 38;
    if (imp) { star(g, nx, ny, 34, RED); g.textAlign = 'center'; outlined(g, n, nx, ny + 13, '400 36px ' + BANG, '#FFFFFF', INK, 6); }
    else if (!list.length) { g.lineWidth = 5; g.strokeStyle = YEL; g.beginPath(); g.arc(nx, ny, 26, 0, 7); g.stroke(); g.textAlign = 'center'; g.font = '400 38px ' + BANG; g.fillStyle = INK; g.fillText(n, nx, ny + 14); }
    else { g.textAlign = 'center'; g.font = '400 42px ' + BANG; g.fillStyle = INK; g.fillText(n, nx, ny + 15); }
    g.textAlign = 'left';
    // the plans, as little outlined stickers; long ones wrap (never cut). When a day is busy, the stickers get a little
    // smaller so they all fit; a bit of blank space stays at the bottom for a pen.
    const sw2 = cw - 24, layout = fs => list.map(p => { const icn = ICONS[p.ic || 'none'] ? p.ic || 'none' : 'none', hasIc = !!ICONS[icn].p, tw = sw2 - (hasIc ? 58 : 26), L = lines(g, p.t, fs, tw, 2), lh = L.fs * 1.16; return { p, icn, hasIc, L, lh, h: Math.max(fs + 18, L.out.length * lh + 12) }; });
    const top0 = y + 72, room = y + ch - 12 - top0, sum = ls => ls.reduce((n, o) => n + o.h, 0) + 7 * Math.max(0, ls.length - 1);
    let lay = null; for (const fs of [24, 22, 20, 18]) { lay = layout(fs); if (sum(lay) <= room) break; }
    let py = top0, shown = 0;
    for (const o of lay) {
      if (py + o.h > top0 + room) break;
      const tx = x + 12 + (o.hasIc ? 44 : 14);
      g.fillStyle = INK; rr(g, x + 12 + 4, py + 4, sw2, o.h, 8); g.fill();
      g.fillStyle = o.p.imp ? '#FFE0DA' : ICONS[o.icn].c; rr(g, x + 12, py, sw2, o.h, 8); g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
      if (o.hasIc) drawIcon(g, o.icn, x + 23, py + o.h / 2 - 11, 22);
      g.font = '800 ' + o.L.fs + 'px ' + BODY; g.fillStyle = INK; o.L.out.forEach((l, j) => g.fillText(l, tx, py + 6 + o.lh * (j + 0.82)));
      py += o.h + 7; shown++;
    }
    if (shown < list.length) { g.font = '800 20px ' + BODY; g.fillStyle = '#5E584B'; g.textAlign = 'right'; g.fillText('+ ' + (list.length - shown) + ' more', x + cw - 14, y + 30); g.textAlign = 'left'; }
  }));
  // the legend: shapes and words, so it never depends on colour
  const ly = PH - M + 22;
  star(g, M + 24, ly - 14, 20, RED); g.font = '800 28px ' + BODY; g.fillStyle = INK; g.fillText('important', M + 56, ly - 4);
  g.lineWidth = 5; g.strokeStyle = YEL; g.beginPath(); g.arc(M + 250, ly - 14, 17, 0, 7); g.stroke(); g.fillText('room to breathe', M + 280, ly - 4);
  return c;
}

async function makePoster() {
  const k = ym;
  openSheet('<h2>Making your poster…</h2><p class="muted">Just a moment.</p>');
  try {
    await fontsReady(); if (document.fonts) await document.fonts.load('400 100px Bangers').catch(() => null);
    const c = drawPoster(k), file = new File([makePDF([c], true)], MONTHS[Number(k.slice(5)) - 1] + ' ' + k.slice(0, 4) + ' poster.pdf', { type: 'application/pdf' });
    const img = c.toDataURL('image/jpeg', 0.7);
    openSheet('<h2>Your ' + esc(MONTHS[Number(k.slice(5)) - 1]) + ' poster</h2><img class="wprev" src="' + img + '" alt="Your month poster">' +
      '<p class="muted" style="margin:0;font-size:13px">A4 landscape. In the print options, pick landscape and "fit to page".</p>' +
      (IOS ? '<button type="button" class="btn" data-sharepdf>Share, save or print the PDF</button>'
        : '<button type="button" class="btn" data-savepdf>Save to this phone</button>' + (canShareFile(file) ? '<button type="button" class="btn alt" data-sharepdf>Share it</button>' : '')) +
      '<button type="button" class="btn ' + (IOS ? 'alt' : 'ghost') + '" data-close>Done</button>', async ev => {
      if (ev.target.closest('[data-savepdf]')) { saveToDevice(file); toast(SAVED_NOTE); return; }
      if (!ev.target.closest('[data-sharepdf]')) return;
      const r = await shareFile(file); if (r === 'saved') toast(SAVED_NOTE);
    });
    root.__poster = file; // for the automated tests only
  } catch (err) { closeSheet(); toast('Something went wrong making the poster.'); console.error(err); }
}
