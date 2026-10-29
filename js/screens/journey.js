// Your moving journey (v66, moving only since v67): the calm version of a habit tracker's stats, opened from the
// scene card on Me and the row on Move. Sleep lives in the sleep diary and Me's nights chart instead.
// What makes progress exciting, without the pressure: counts that only go up (no streaks, rates, averages or
// "unmet"), a year of dots that only fills in, your weeks as bars (a quiet week is a ☾ rest week, never a zero),
// your lifts over time with the numbers written on, and a hill with flags. One strong blue; size, shape and
// words carry the meaning, never colour alone (Phavan is partly colour blind). A filter picks what it's about.
import { get, today, addDays, parseKey, dateKey } from '../store.js';
import { esc, nav, backLink, prettyDate } from '../ui.js';
import { EXERCISES } from '../data.js';
import { actDef } from '../activities.js';
import { wu, showNum } from '../units.js';

let filter = 'all', year = null, root = null;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const mondayOf = d => addDays(d, -((parseKey(d).getDay() + 6) % 7));
const between = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
const fmtNum = v => (Math.round(v * 10) / 10).toLocaleString();

// ---------- what each filter is about ----------
export function filters(st = get()) {
  const out = [['all', 'Everything', '🌿']];
  if (st.sessions.length) out.push(['gym', 'Gym', '🏋️']);
  [...new Set((st.activities || []).map(a => a.type))].forEach(t => { const d = actDef(t); out.push([t, d.n, d.e]); });
  return out;
}
// every entry for a filter: {date, mins, kind, ref}
export function entries(f, st = get()) {
  const gym = () => st.sessions.map(s => ({ date: s.date, mins: Number(s.mins) || 0, kind: 'gym', ref: s }));
  const acts = t => (st.activities || []).filter(a => !t || a.type === t).map(a => ({ date: a.date, mins: Number(a.mins) || 0, kind: a.type, ref: a }));
  if (f === 'all') return gym().concat(acts());
  if (f === 'gym') return gym();
  return acts(f);
}
const byDate = list => { const m = {}; list.forEach(e => { (m[e.date] = m[e.date] || []).push(e); }); return m; };
const kindName = k => k === 'gym' ? 'Gym' : actDef(k).n;

// ---------- the cards: an icon, a big number, a small unit, a short label. Only ever above zero ----------
const ICON = {
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  stack: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  flag: '<path d="M5 21V4h12l-2.5 4L17 12H5"/>',
  sprout: '<path d="M12 21v-9"/><path d="M12 12C12 7 8.5 5 4 5c0 4.5 3 7 8 7zM12 14c0-4 3-6.5 8-6.5 0 4-3 6.5-8 6.5z"/>',
  bell: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>',
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z"/>'
};
const TINT = ['#E4ECFF', '#FDE7EE', '#E2F3E8', '#FFF1C4', '#EDE4FA', '#FFE7D6'];
function card(icon, n, unit, label, i) {
  return '<div class="jcard"><span class="jic" style="background:' + TINT[i % TINT.length] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[icon] + '</svg></span>' +
    '<span class="jn">' + esc(String(n)) + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</span><span class="jl">' + esc(label) + '</span></div>';
}
// the heaviest set in a list of sets: kg (or kg each side for Bar +), then reps
const setW = z => { const a = String(z.a); return a.startsWith('b+') ? Number(a.slice(2)) || 0 : Number(a) || 0; };
const topSet = sets => sets.reduce((b, z) => !b || setW(z) > setW(b) || (setW(z) === setW(b) && (Number(z.b) || 0) > (Number(b.b) || 0)) ? z : b, null);
const unitOf = (st, k) => (st.units || {})[k] || (k === 'legpress' ? 'plate' : 'kg');
const wLabel = (st, k, z) => { const a = String(z.a); if (a.startsWith('b+')) return 'bar + ' + showNum(a.slice(2)) + ' ' + wu(); return unitOf(st, k) === 'plate' ? 'plate ' + a : showNum(a) + ' ' + wu(); }; // v71: kg or lb
const wShort = (st, k, z) => { const a = String(z.a); if (a.startsWith('b+')) return '+' + showNum(a.slice(2)); return unitOf(st, k) === 'plate' ? 'P' + a : showNum(a); };

export function cardsFor(f, st = get()) {
  const t = today(), list = entries(f, st), dates = Object.keys(byDate(list)).sort(), out = [];
  if (!list.length) return out;
  const ym = t.slice(0, 7), y = t.slice(0, 4), month = LONG[Number(t.slice(5, 7)) - 1];
  const daysThisMonth = dates.filter(d => d.startsWith(ym)).length, daysThisYear = dates.filter(d => d.startsWith(y)).length;
  const word = f === 'gym' ? ['session', 'sessions'] : ['time', 'times'];
  if (daysThisMonth) out.push(['cal', daysThisMonth, daysThisMonth === 1 ? 'day' : 'days', (f === 'all' ? 'moved' : 'active') + ' in ' + month]);
  out.push(['stack', list.length, list.length === 1 ? word[0] : word[1], 'all together']);
  // v73: no "minutes of moving" card (Phavan: a gym session's length isn't real when you log after the workout)
  const since = between(dates[0], t);
  out.push(since >= 14 ? ['flag', Math.floor(since / 7), 'weeks', 'since you started'] : ['flag', since + 1, since ? 'days' : 'day', 'since you started']);
  if (daysThisYear && daysThisYear !== daysThisMonth && daysThisYear !== list.length) out.push(['cal', daysThisYear, 'days', 'in ' + y]); // v75: not when it's the same number as all together
  if (f === 'all') { const kinds = new Set(list.map(e => e.kind)).size; if (kinds > 1) out.push(['sprout', kinds, 'kinds', 'of moving']); }
  if (f === 'gym') {
    const sets = st.sessions.reduce((n, s) => n + (s.exercises || []).reduce((a, x) => a + (x.sets || []).length, 0), 0);
    if (sets) out.push(['bell', sets, 'sets', 'all together']);
    const L = lifts(st)[0]; if (L && L.best && setW(L.best) > 0) { const wl = wLabel(st, L.k, L.best), re = new RegExp(' ' + wu() + '$'); out.push(['star', wl.replace(re, ''), re.test(wl) ? wu() : '', 'heaviest ' + L.name.toLowerCase()]); }
  }
  if (f !== 'all' && f !== 'gym') {
    const d = actDef(f);
    d.f.filter(x => x.num).forEach(x => { const v = list.reduce((n, e) => n + (Number((e.ref.f || {})[x.k]) || 0), 0); if (v > 0) out.push(['route', fmtNum(v), x.u, 'all together']); });
  }
  // weeks with no moving since you started, not counting this one
  const rest = (() => { let n = 0; for (let w = mondayOf(dates[0]); w < mondayOf(t); w = addDays(w, 7)) if (!dates.some(d => d >= w && d < addDays(w, 7))) n++; return n; })();
  if (rest) out.push(['moon', rest, rest === 1 ? 'rest week' : 'rest weeks', 'taken kindly']);
  return out;
}

// ---------- your lifts: per exercise, the heaviest set each session ----------
export function lifts(st = get()) {
  const ex = {};
  st.sessions.slice().sort((a, b) => a.date.localeCompare(b.date) || (Number(a.ts) || 0) - (Number(b.ts) || 0)).forEach(s => (s.exercises || []).forEach(x => {
    const e = EXERCISES[x.key] || (st.customExercises || {})[x.key] || {};
    if ((e.t && e.t !== 'wr') || !(x.sets || []).length) return;
    const top = topSet(x.sets); if (!top || setW(top) <= 0) return;
    const key = x.swap ? 'swap:' + x.swap : x.key, r = ex[key] = ex[key] || { name: x.swap || x.name || e.n || '?', k: x.key, pts: [], best: null };
    r.pts.push({ d: s.date, z: top }); if (!r.best || setW(top) > setW(r.best)) r.best = top;
  }));
  return Object.values(ex).sort((a, b) => b.pts.length - a.pts.length || a.name.localeCompare(b.name));
}
function spark(st, L) {
  const W = 150, H = 54, P = 12, pts = L.pts.slice(-10), vs = pts.map(p => setW(p.z)), lo = Math.min(...vs), hi = Math.max(...vs);
  const X = i => pts.length === 1 ? W / 2 : P + i * (W - 2 * P) / (pts.length - 1), Y = v => hi === lo ? H / 2 + 6 : H - 10 - (v - lo) / (hi - lo) * (H - 28);
  let s = '<svg class="jspark" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><polyline fill="none" stroke="#1F55D0" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" points="' + pts.map((p, i) => X(i).toFixed(1) + ',' + Y(vs[i]).toFixed(1)).join(' ') + '"/>';
  const labelled = new Set([0, pts.length - 1]); if (vs[vs.length - 1] !== hi && vs[0] !== hi) labelled.add(vs.indexOf(hi));
  pts.forEach((p, i) => { s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(vs[i]).toFixed(1) + '" r="3.4" fill="#1F55D0" stroke="#FFFDF6" stroke-width="1.4"/>'; if (labelled.has(i)) s += '<text x="' + X(i).toFixed(1) + '" y="' + (Y(vs[i]) - 7).toFixed(1) + '" class="jslbl" text-anchor="middle">' + esc(wShort(st, L.k, p.z)) + '</text>'; });
  return s + '</svg>';
}

// ---------- the year of dots: one per day, filled when you did something, a bit bigger when you did more ----------
export function yearDots(f, y, opts = {}) {
  if (!opts.weeks && !opts.half) return yearDots(f, y, { half: 1 }) + yearDots(f, y, { half: 2 }); // two rows: Jan–Jun, Jul–Dec
  const st = get(), m = byDate(entries(f, st)), t = today(), from = opts.half === 2 ? y + '-07-01' : y + '-01-01';
  const start = mondayOf(from), end = opts.weeks ? t : opts.half === 1 ? y + '-06-30' : y + '-12-31';
  const first = opts.weeks ? mondayOf(addDays(t, -7 * (opts.weeks - 1))) : start;
  const cols = opts.weeks ? Math.floor(between(first, mondayOf(end)) / 7) + 1 : 27, cs = opts.cs || 12, top = opts.weeks ? 2 : 16, H = top + 7 * cs + 2, W = cols * cs + 2;
  let s = '<svg class="' + (opts.cls || 'jyear') + '" viewBox="0 0 ' + W.toFixed(1) + ' ' + H.toFixed(1) + '" role="img" aria-label="' + (opts.weeks ? 'Your recent weeks as dots' : 'Your year in dots, ' + y) + '">';
  for (let c = 0; c < cols; c++) {
    const wk = addDays(first, c * 7);
    if (!opts.weeks) { const d1 = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(wk, i)).find(d => d.slice(8) === '01' && d >= from && d <= end); if (d1) s += '<text x="' + (c * cs + 1).toFixed(1) + '" y="11" class="jmon">' + MONTHS[Number(d1.slice(5, 7)) - 1] + '</text>'; }
    for (let r = 0; r < 7; r++) {
      const d = addDays(wk, r); if (!opts.weeks && (d < from || d > end)) continue; if (d > t) continue;
      const n = (m[d] || []).length, cx = c * cs + cs / 2 + 1, cy = top + r * cs + cs / 2;
      s += n ? '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (n > 1 ? cs * 0.46 : cs * 0.36).toFixed(2) + '" class="jdot on" data-day="' + d + '"/>'
        : '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (cs * 0.2).toFixed(2) + '" class="jdot" data-day="' + d + '"/>';
    }
  }
  return s + '</svg>';
}

// ---------- your weeks: days in each of the last 12 weeks, as bars with the number on top ----------
function weeksBars(f) {
  const st = get(), dates = Object.keys(byDate(entries(f, st))), t = today(), W = 340, H = 128, n = 12, bw = W / n;
  const counts = [...Array(n)].map((_, i) => { const w = addDays(mondayOf(t), -7 * (n - 1 - i)); return dates.filter(d => d >= w && d < addDays(w, 7)).length; }), mx = Math.max(3, ...counts);
  let s = '<svg class="jweeks" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Your last 12 weeks">';
  for (let i = 0; i < n; i++) {
    const w = addDays(mondayOf(t), -7 * (n - 1 - i)), k = dates.filter(d => d >= w && d < addDays(w, 7)).length, x = i * bw + bw * 0.18, bwid = bw * 0.64, base = H - 26, h = k / mx * (H - 50);
    if (k) s += '<rect x="' + x.toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + bwid.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5" fill="#1F55D0"/><text x="' + (x + bwid / 2).toFixed(1) + '" y="' + (base - h - 6).toFixed(1) + '" class="jbn" text-anchor="middle">' + k + '</text>';
    else if (w >= mondayOf(dates.slice().sort()[0] || t)) s += '<text x="' + (x + bwid / 2).toFixed(1) + '" y="' + (base - 6) + '" class="jrest" text-anchor="middle">☾</text>';
    if (i % 2 === (n - 1) % 2 || i === n - 1) s += '<text x="' + (x + bwid / 2).toFixed(1) + '" y="' + (H - 8) + '" class="jwl" text-anchor="middle">' + (i === n - 1 ? 'now' : parseKey(w).getDate() + ' ' + MONTHS[parseKey(w).getMonth()]) + '</text>';
  }
  return s + '<line x1="0" y1="' + (H - 26) + '" x2="' + W + '" y2="' + (H - 26) + '" class="jbase"/></svg>';
}

// ---------- this week: Mon to Sun, filled on the days you did something ----------
function thisWeek(f) {
  const m = byDate(entries(f)), t = today(), w = mondayOf(t);
  return '<div class="jweek">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => { const d = addDays(w, i), on = (m[d] || []).length; return '<span class="jwd' + (on ? ' on' : '') + (d === t ? ' today' : '') + (d > t ? ' later' : '') + '"><i>' + (on ? '✓' : '') + '</i><b>' + l + '</b></span>'; }).join('') + '</div>';
}

// ---------- the hill: him walking up, with a flag at each milestone ----------
const FLAGS = [10, 25, 50, 100, 250, 500, 1000];
// where he is: n so far, the next flag, and whether he passed one this week (then he's planting it)
export function hillState(f = 'all') {
  const list = entries(f).sort((a, b) => a.date.localeCompare(b.date)), n = list.length; if (!n) return null;
  const next = FLAGS.find(x => x > n) || n, last = FLAGS.filter(x => x <= n).pop();
  const planted = last && between(list[last - 1].date, today()) < 7 ? last : null;
  return { n, next, last, planted };
}
export function hillSvg(f, o = {}) {
  const h = hillState(f); if (!h) return '';
  const W = o.W || 340, H = o.H || 170, L = o.left || 16, R = o.right || 24, fs = o.flag || 26;
  const P = t => { const x = L + t * (W - L - R), y = H - 22 - (Math.sin(t * Math.PI / 2) ** 1.4) * (H - (o.top || 70)); return [x, y]; };
  let path = ''; for (let i = 0; i <= 40; i++) { const [x, y] = P(i / 40); path += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
  let s = '<svg class="' + (o.cls || 'jhill') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Your hill: ' + h.n + ' so far, next flag at ' + h.next + '">' +
    '<path d="M0 ' + P(0)[1].toFixed(1) + ' L' + path.slice(1) + ' L' + W + ' ' + P(1)[1].toFixed(1) + ' L' + W + ' ' + H + ' L0 ' + H + 'Z" class="jground"/><path d="' + path + '" class="jpath"/>';
  FLAGS.filter(x => x <= h.next).forEach(x => {
    if (x === h.planted) return; // he's holding that one
    const [fx, fy] = P(x / h.next), got = h.n >= x;
    s += '<line x1="' + fx.toFixed(1) + '" y1="' + fy.toFixed(1) + '" x2="' + fx.toFixed(1) + '" y2="' + (fy - fs).toFixed(1) + '" class="jpole"/><path d="M' + fx.toFixed(1) + ' ' + (fy - fs).toFixed(1) + 'l' + (fs * 0.6).toFixed(1) + ' ' + (fs * 0.2).toFixed(1) + '-' + (fs * 0.6).toFixed(1) + ' ' + (fs * 0.2).toFixed(1) + 'z" class="jflag' + (got ? ' got' : '') + '"/><text x="' + (fx + 3).toFixed(1) + '" y="' + (fy - fs - 4).toFixed(1) + '" class="jfl">' + x + '</text>';
  });
  const at = h.planted ? h.planted / h.next : Math.min(1, h.n / h.next), [hx, hy] = P(at), ph = o.him || 62, img = h.planted ? 'flagplant' : 'climbing', ratio = h.planted ? 286 / 640 : 339 / 640;
  s += '<image href="art/' + img + '.webp" x="' + (hx - ph * ratio / 2).toFixed(1) + '" y="' + (hy - ph + 2).toFixed(1) + '" width="' + (ph * ratio).toFixed(1) + '" height="' + ph + '"/>';
  if (h.planted) s += '<text x="' + (hx + ph * ratio * 0.45).toFixed(1) + '" y="' + (hy - ph - 2).toFixed(1) + '" class="jfl">' + h.planted + '</text>';
  return s + '</svg>';
}
function theHill(f) {
  const h = hillState(f); if (!h) return '';
  return hillSvg(f) + '<p class="jcap">' + h.n + ' so far' + (h.planted ? ' · you just passed ' + h.planted + '!' : '') + (h.next > h.n ? ' · next flag at ' + h.next : '') + '. It only ever climbs.</p>';
}

// ---------- the page ----------
export function mount(r) { root = r; root.addEventListener("click", onClick); render(); }
function render() {
  const st = get(), fs = filters(st);
  if (!fs.some(x => x[0] === filter)) filter = 'all';
  const t = today(), list = entries(filter, st), years = [...new Set(list.map(e => e.date.slice(0, 4)).concat(t.slice(0, 4)))].sort().reverse();
  if (!year || !years.includes(year)) year = years[0];
  const cards = cardsFor(filter, st), isMove = true, L = (filter === 'all' || filter === 'gym') ? lifts(st).filter(x => x.pts.length).slice(0, 5) : [];
  root.innerHTML = '<div class="top">' + backLink() + '</div>' +
    '<h1 class="jtitle">Your moving journey</h1><p class="muted jsub">Everything here only goes up.</p>' +
    '<div class="chips jfilter" role="group" aria-label="What to look at">' + fs.map(x => '<button type="button" class="chip small" data-jf="' + esc(x[0]) + '" aria-pressed="' + (x[0] === filter) + '"><span aria-hidden="true">' + x[2] + '</span> ' + esc(x[1]) + '</button>').join('') + '</div>' +
    (list.length
      ? '<div class="jcards">' + cards.map((c, i) => card(c[0], c[1], c[2], c[3], i)).join('') + '</div>' +
        '<div class="card"><b>This week</b>' + thisWeek(filter) + '</div>' +
        '<div class="card"><div class="jhead"><b>Your year</b>' + (years.length > 1 ? '<span class="chips">' + years.map(y => '<button type="button" class="chip small" data-jy="' + y + '" aria-pressed="' + (y === year) + '">' + y + '</button>').join('') + '</span>' : '<span class="muted" style="font-size:13px">' + year + '</span>') + '</div>' +
          yearDots(filter, year) + '<p class="jread" id="jread">' + (isMove ? 'A filled dot is a day you moved; a bigger one, more than once.' : 'A filled dot is a night you logged.') + ' Tap one to see it.</p></div>' +
        '<div class="card"><b>Your weeks</b><p class="muted" style="font-size:13px;margin:0">' + (isMove ? 'Days you moved' : 'Nights you logged') + ' in each of the last 12 weeks. ☾ is a rest week.</p>' + weeksBars(filter) + '</div>' +
        (L.length ? '<div class="card"><b>Your lifts</b><p class="muted" style="font-size:13px;margin:0">Your heaviest set each time, first to latest.</p>' + L.map(x => { const a = x.pts[0], b = x.pts[x.pts.length - 1]; return '<div class="jlift"><div><b>' + esc(x.name) + '</b><span>' + esc(wLabel(st, x.k, a.z)) + (x.pts.length > 1 && wLabel(st, x.k, a.z) !== wLabel(st, x.k, b.z) ? ' → ' + esc(wLabel(st, x.k, b.z)) : '') + '</span><small>' + (x.pts.length > 1 ? x.pts.length + ' times since ' + esc(prettyDate(a.d)) : 'once, ' + esc(prettyDate(a.d))) + '</small></div>' + spark(st, x) + '</div>'; }).join('') + '</div>' : '') +
        (isMove ? '<div class="card"><b>Your hill</b>' + theHill(filter) + '</div>' : '')
      : '<p class="empty">Nothing here yet. It fills in from your first log.</p>') +
    nav('me');
}
function onClick(e) {
  const t = e.target; let b;
  if ((b = t.closest('[data-jf]'))) { filter = b.dataset.jf; render(); return; }
  if ((b = t.closest('[data-jy]'))) { year = b.dataset.jy; render(); return; }
  if ((b = t.closest('[data-day]'))) {
    const d = b.dataset.day, l = byDate(entries(filter))[d] || [], el = root.querySelector('#jread');
    root.querySelectorAll('.jdot.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
    if (el) el.textContent = prettyDate(d, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + (l.length ? [...new Set(l.map(x => kindName(x.kind)))].join(', ') : 'a quiet day');
  }
}

// ---------- the scene card on Me (v67): a little hillside with him on it, a title you can't miss, one line ----------
export function previewCard() {
  const st = get(), list = entries('all', st); if (!list.length) return '';
  const t = today(), month = LONG[Number(t.slice(5, 7)) - 1], days = new Set(list.filter(e => e.date.startsWith(t.slice(0, 7))).map(e => e.date)).size, h = hillState('all');
  const line = (days ? days + (days === 1 ? ' day' : ' days') + ' moved in ' + month : list.length + (list.length === 1 ? ' time' : ' times') + ' so far') + (h.planted ? ' · you just passed ' + h.planted + '!' : h.next > h.n ? ' · next flag at ' + h.next : '');
  return '<a class="jscene" href="#/journey?from=me" aria-label="Your moving journey: ' + esc(line) + '">' +
    '<span class="jsthead"><span class="jst"><b>Your moving journey</b><small>' + esc(line) + '</small></span><span class="jgo2" aria-hidden="true">›</span></span>' +
    hillSvg('all', { W: 340, H: 150, cls: 'jhill jscenehill', left: 18, right: 46, top: 96, him: 64, flag: 22 }) + '</a>';
}
