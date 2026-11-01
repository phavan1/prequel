// Your wall (v77): make a month planner to print and stick on the wall. Pressure-free on purpose: no checkboxes,
// no "overdue", no counts. Just the month, the few things you want to remember, room to write by hand, and a
// gentle corner for "This month, gently…". A4 landscape, in colour (Phavan). First version: it lives only on
// paper, so the plans show nowhere else in the app. Opened from Me ("Your wall").
// Saved in st.wall: { plans: { 'YYYY-MM-DD': [{ id, t, ic }] }, wishes: { 'YYYY-MM': ['', '', ''] } }.
import { get, save, uid, today, dateKey, parseKey } from '../store.js';
import { esc, nav, backLink, him, openSheet, closeSheet, toast, IOS, canShareFile, saveToDevice, SAVED_NOTE } from '../ui.js';
import { makePDF, shareFile } from '../pdf.js';
import { loadArt, fontsReady } from '../cards.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX = 3, LEN = 28;
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
const W = () => { const st = get(); st.wall = st.wall || {}; st.wall.plans = st.wall.plans || {}; st.wall.wishes = st.wall.wishes || {}; return st.wall; };
const ymOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const stepMonth = (k, n) => { const [y, m] = k.split('-').map(Number); return ymOf(new Date(y, m - 1 + n, 1)); };
const monthName = k => { const [y, m] = k.split('-').map(Number); return MONTHS[m - 1] + ' ' + y; };
// the days of a month, Monday first, with blanks before the 1st
function weeks(k) {
  const [y, m] = k.split('-').map(Number), first = new Date(y, m - 1, 1), n = new Date(y, m, 0).getDate(), lead = (first.getDay() + 6) % 7;
  const cells = []; for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= n; d++) cells.push(dateKey(new Date(y, m - 1, d)));
  while (cells.length % 7) cells.push(null);
  const out = []; for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7)); return out;
}

export function mount(r) {
  root = r;
  // the month to plan: this month, or next month once this one is nearly over
  if (!ym) { const t = new Date(); ym = t.getDate() >= 20 ? stepMonth(ymOf(t), 1) : ymOf(t); }
  render();
  root.addEventListener('click', onClick);
  root.addEventListener('input', e => { const i = e.target.closest('[data-wish]'); if (!i) return; const w = W(); w.wishes[ym] = w.wishes[ym] || ['', '', '']; w.wishes[ym][Number(i.dataset.wish)] = i.value.slice(0, 40); save(); });
}

function render() {
  const w = W(), now = ymOf(new Date()), plans = w.plans, wishes = w.wishes[ym] || ['', '', ''];
  const inMonth = Object.keys(plans).filter(k => k.startsWith(ym) && plans[k].length).sort();
  root.innerHTML =
    '<div class="top">' + backLink() + '</div>' +
    '<div class="hero">' + him('stickynote', 'breathe', 'Your character holding a sticky note') + '<div class="txt"><h1>Your wall</h1><p class="say">Your month as a poster to print and stick up. Nothing on it has to happen.</p></div></div>' +
    '<div class="wmonth"><button type="button" data-ym="-1" aria-label="Month before"' + (ym <= now ? ' disabled' : '') + '>‹</button><b>' + esc(monthName(ym)) + '</b><button type="button" data-ym="1" aria-label="Next month"' + (ym >= stepMonth(now, 12) ? ' disabled' : '') + '>›</button></div>' +
    '<div class="card wcal"><div class="wdow">' + DOW.map(d => '<span>' + d + '</span>').join('') + '</div>' +
      weeks(ym).map(wk => '<div class="wrow">' + wk.map(k => k ? '<button type="button" class="wd' + ((plans[k] || []).length ? ' has' : '') + (k === today() ? ' today' : '') + '" data-wday="' + k + '" aria-label="' + esc(parseKey(k).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })) + ((plans[k] || []).length ? ', ' + plans[k].length + ' planned' : '') + '"><span>' + Number(k.slice(8)) + '</span>' + ((plans[k] || []).length ? '<i>' + plans[k].map(p => '<em style="background:' + ICONS[p.ic || 'none'].c + '"></em>').join('') + '</i>' : '') + '</button>' : '<span class="wd blank"></span>').join('') + '</div>').join('') +
      '<p class="muted wtip">Tap a day to add something to it.</p></div>' +
    (inMonth.length ? '<div class="card wlist"><b>On the poster</b>' + inMonth.map(k => '<div class="wli"><span class="wdate">' + esc(parseKey(k).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' })) + '</span><span class="wits">' + plans[k].map(p => '<span class="wpill" style="background:' + ICONS[p.ic || 'none'].c + '">' + svgIcon(p.ic, 14) + esc(p.t) + '</span>').join('') + '</span><button type="button" class="lnk" data-wday="' + k + '">change</button></div>').join('') + '</div>' : '') +
    '<div class="card"><b>This month, gently…</b><p class="muted" style="font-size:13px;margin:0">Up to three soft wishes for the corner of your poster. Wishes, not goals. Leave them empty to write your own by hand.</p>' +
      [0, 1, 2].map(i => '<input type="text" data-wish="' + i + '" maxlength="40" value="' + esc(wishes[i] || '') + '" placeholder="' + ['e.g. walk more', 'e.g. call home', 'e.g. go easy on myself'][i] + '" aria-label="Wish ' + (i + 1) + '">').join('') + '</div>' +
    '<button type="button" class="btn wide" data-poster>Make my ' + esc(MONTHS[Number(ym.slice(5)) - 1]) + ' poster</button>' +
    '<p class="muted" style="font-size:12px;text-align:center;margin:0">A4 landscape, in colour. Print it, stick it up, add to it with a pen.</p>' +
    nav('me');
}

function onClick(e) {
  const t = e.target; let b;
  if ((b = t.closest('[data-ym]')) && !b.disabled) { ym = stepMonth(ym, Number(b.dataset.ym)); render(); return; }
  if ((b = t.closest('[data-wday]'))) { daySheet(b.dataset.wday); return; }
  if (t.closest('[data-poster]')) { makePoster(); return; }
}

// one day: what's on it, and add something (a few words and a little icon)
function daySheet(k) {
  let ic = 'none';
  const list = () => W().plans[k] || [];
  const draw = () => '<h2>' + esc(parseKey(k).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })) + '</h2>' +
    (list().length ? '<div class="wsheet">' + list().map(p => '<div class="wli"><span class="wpill" style="background:' + ICONS[p.ic || 'none'].c + '">' + svgIcon(p.ic, 14) + esc(p.t) + '</span><button type="button" class="x" data-wdel="' + p.id + '" aria-label="Take ' + esc(p.t) + ' off">×</button></div>').join('') + '</div>' : '<p class="muted" style="margin:0">Nothing on this day yet.</p>') +
    (list().length < MAX
      ? '<label class="field-label" for="wTxt">ADD SOMETHING</label><input id="wTxt" type="text" maxlength="' + LEN + '" placeholder="e.g. Essay due, Dentist, Mum\'s birthday" autocomplete="off">' +
        '<div class="wics" role="group" aria-label="A little icon">' + Object.keys(ICONS).map(n => '<button type="button" data-wic="' + n + '" aria-pressed="' + (n === ic) + '" style="background:' + ICONS[n].c + '">' + (ICONS[n].p ? svgIcon(n, 18) : '') + '<small>' + esc(ICONS[n].n) + '</small></button>').join('') + '</div>' +
        '<button type="button" class="btn" data-wadd>Add to the day</button>'
      : '<p class="muted" style="margin:0">Three is plenty for one day. There\'s room to write more by hand on the poster.</p>') +
    '<button type="button" class="btn alt" data-close>Done</button>';
  const sh = openSheet(draw(), ev => {
    const t = ev.target; let b;
    const redraw = () => { const typed = (sh.querySelector('#wTxt') || {}).value || ''; sh.querySelector('.sheet').innerHTML = draw(); const i = sh.querySelector('#wTxt'); if (i) i.value = typed; render(); };
    if ((b = t.closest('[data-wic]'))) { ic = b.dataset.wic; sh.querySelectorAll('[data-wic]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
    if ((b = t.closest('[data-wdel]'))) { const w = W(); w.plans[k] = list().filter(p => p.id !== b.dataset.wdel); if (!w.plans[k].length) delete w.plans[k]; save(); redraw(); return; }
    if (t.closest('[data-wadd]')) {
      const inp = sh.querySelector('#wTxt'), v = inp.value.trim().slice(0, LEN); if (!v) { inp.focus(); return; }
      const w = W(); (w.plans[k] = w.plans[k] || []).push({ id: uid(), t: v, ic }); save(); inp.value = ''; ic = 'none'; redraw(); return;
    }
  });
}

// ---------- the poster: A4 landscape at 200 dpi ----------
const PW = 2339, PH = 1654, M = 80, INK = '#23262F', SOFT = '#6B6456', LINE = '#E6DCC4', PAPER = '#FBF6E9', BLUE = '#1F55D0';
const HAND = '"Gaegu", cursive', BODY = '"Nunito", system-ui, sans-serif';
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fit(g, s, font, maxW) { g.font = font; if (g.measureText(s).width <= maxW) return s; while (s.length > 1 && g.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…'; }
function drawIcon(g, k, x, y, size) { const p = ICONS[k] && ICONS[k].p; if (!p) return; g.save(); g.translate(x, y); g.scale(size / 24, size / 24); g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = INK; g.stroke(new Path2D(p)); g.restore(); }

export function drawPoster(k, art) {
  const c = document.createElement('canvas'); c.width = PW; c.height = PH; const g = c.getContext('2d');
  const w = W(), plans = w.plans, wishes = (w.wishes[k] || []).map(s => (s || '').trim()).filter(Boolean);
  g.fillStyle = PAPER; g.fillRect(0, 0, PW, PH);
  g.fillStyle = 'rgba(31,85,208,.06)'; for (let y = 30; y < PH; y += 40) for (let x = 30; x < PW; x += 40) { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
  // the title
  const [yy, mm] = k.split('-').map(Number);
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.font = '700 150px ' + HAND; g.fillStyle = INK; g.fillText(MONTHS[mm - 1], M, 205);
  const tw = g.measureText(MONTHS[mm - 1]).width;
  g.font = '900 46px ' + BODY; g.fillStyle = BLUE; g.fillText(String(yy), M + tw + 26, 200);
  g.font = '700 30px ' + BODY; g.fillStyle = SOFT; g.fillText('My month, on the wall. Nothing here has to happen.', M + 4, 262);
  // him on the right, and the "This month, gently…" sticky note next to him
  const ah = 300, hw = art ? art.width * ah / art.height : 0;
  if (art) g.drawImage(art, PW - M - hw, 18, hw, ah);
  const nw = 600, nh = 230, nx = PW - M - hw - 30 - nw, ny = 40;
  g.save(); g.translate(nx + nw / 2, ny + nh / 2); g.rotate(-0.025);
  g.shadowColor = 'rgba(0,0,0,.12)'; g.shadowBlur = 18; g.shadowOffsetY = 6; g.fillStyle = '#FFE89A'; g.fillRect(-nw / 2, -nh / 2, nw, nh); g.shadowColor = 'transparent';
  g.fillStyle = 'rgba(159,192,255,.75)'; g.fillRect(-60, -nh / 2 - 16, 120, 32); // a bit of tape
  g.font = '700 44px ' + HAND; g.fillStyle = INK; g.fillText('This month, gently…', -nw / 2 + 28, -nh / 2 + 62);
  for (let i = 0; i < 3; i++) {
    const ly = -nh / 2 + 112 + i * 44;
    if (wishes[i]) { g.font = '700 36px ' + HAND; g.fillStyle = INK; g.fillText('♡ ' + fit(g, wishes[i], '700 36px ' + HAND, nw - 90), -nw / 2 + 34, ly); }
    else { g.strokeStyle = 'rgba(35,38,47,.25)'; g.lineWidth = 2; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(-nw / 2 + 34, ly + 6); g.lineTo(nw / 2 - 34, ly + 6); g.stroke(); g.setLineDash([]); }
  }
  g.restore();
  // the grid
  const wk = weeks(k), rows = wk.length, gap = 14, top = 330, hh = 54, bottom = PH - 104;
  const cw = (PW - 2 * M - gap * 6) / 7, ch = (bottom - top - hh - gap - gap * (rows - 1)) / rows;
  DOW.forEach((d, i) => { const x = M + i * (cw + gap); g.fillStyle = i >= 5 ? '#7A9BE6' : BLUE; rr(g, x, top, cw, hh, 16); g.fill(); g.font = '900 26px ' + BODY; g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.fillText(d.toUpperCase(), x + cw / 2, top + 37); });
  g.textAlign = 'left';
  wk.forEach((row, r) => row.forEach((key, i) => {
    const x = M + i * (cw + gap), y = top + hh + gap + r * (ch + gap);
    if (!key) { g.strokeStyle = 'rgba(35,38,47,.10)'; g.lineWidth = 2; g.setLineDash([8, 10]); rr(g, x, y, cw, ch, 22); g.stroke(); g.setLineDash([]); return; }
    g.fillStyle = i >= 5 ? '#F2F5FF' : '#FFFDF7'; rr(g, x, y, cw, ch, 22); g.fill(); g.strokeStyle = LINE; g.lineWidth = 2.5; g.stroke();
    g.font = '900 40px ' + BODY; g.fillStyle = INK; g.fillText(String(Number(key.slice(8))), x + 20, y + 50);
    const list = plans[key] || [], ph = 42, pg = 8; let py = y + 66;
    let shown = 0;
    list.forEach(p => {
      if (py + ph > y + ch - 10) return;
      const ic = ICONS[p.ic || 'none'] ? p.ic || 'none' : 'none', hasIc = !!ICONS[ic].p, pw = cw - 28;
      g.fillStyle = ICONS[ic].c; rr(g, x + 14, py, pw, ph, 12); g.fill();
      if (hasIc) drawIcon(g, ic, x + 24, py + 9, 24);
      g.font = '800 24px ' + BODY; g.fillStyle = INK; g.fillText(fit(g, p.t, '800 24px ' + BODY, pw - (hasIc ? 58 : 24)), x + 14 + (hasIc ? 46 : 12), py + 29);
      py += ph + pg; shown++;
    });
    if (shown < list.length) { g.font = '800 20px ' + BODY; g.fillStyle = SOFT; g.fillText('+ ' + (list.length - shown) + ' more', x + 20, y + ch - 14); }
    // room to write by hand
    g.strokeStyle = 'rgba(35,38,47,.09)'; g.lineWidth = 2;
    for (let ly = Math.max(py + 30, y + 98); ly < y + ch - 16; ly += 36) { g.beginPath(); g.moveTo(x + 18, ly); g.lineTo(x + cw - 18, ly); g.stroke(); }
  }));
  // the footer
  g.font = '900 26px ' + BODY; g.fillStyle = SOFT; g.fillText('prequel', M, PH - 46);
  g.font = '700 38px ' + HAND; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('Plans are only ideas. Be kind to yourself this month.', PW / 2, PH - 44);
  g.textAlign = 'right'; g.font = '700 22px ' + BODY; g.fillStyle = SOFT; g.fillText('made ' + new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }), PW - M, PH - 46);
  g.textAlign = 'left';
  return c;
}

async function makePoster() {
  const k = ym;
  openSheet('<h2>Making your poster…</h2><p class="muted">Just a moment.</p>');
  try {
    await fontsReady(); const [art] = await loadArt(['stickynote']);
    const c = drawPoster(k, art), file = new File([makePDF([c], true)], MONTHS[Number(k.slice(5)) - 1] + ' ' + k.slice(0, 4) + ' poster.pdf', { type: 'application/pdf' });
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
