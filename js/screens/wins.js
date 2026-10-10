// The jar: every tiny win is a little paper star dropped into a glass jar. Tap the jar to shake one back out.
// When it's full, it's celebrated and set on the shelf, and a fresh jar begins. Nothing is ever lost.
import { get, save, addMoment, parseKey, removeById, today } from '../store.js';
import { esc, nav, backLink, dateChip, logDate, toast, openSheet, closeSheet, reduceMotion, prettyDate } from '../ui.js';
import { mulberry32, hashStr } from '../sky-model.js';

export const JAR = 20; // stars in a full jar
const STORMY = ['Drizzle', 'Heavy rain', 'Thunderstorm', 'Fog', 'Snow / still', 'Heatwave'];
const PAPER = ['#F7B7C8', '#FFE08A', '#A9C6FF', '#A8E6C8', '#FFC9A3', '#CDBBF5', '#FFF3C4'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const words = k => { const d = parseKey(k); return MONTHS[d.getMonth()] + ' ' + d.getDate(); };

export function allWins() { return get().moments.filter(m => m.area === 'win').sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts); }
// one past win to hand back, preferring ones from soft or stormy days
export function fromJar(preferHard) {
  const st = get(), w = allWins(); if (!w.length) return null;
  const hard = w.filter(m => m.bright || st.heavy[m.date]);
  const pool = preferHard && hard.length ? hard : w;
  return pool[Math.floor(Math.random() * pool.length)];
}

// a folded paper star
const star = (x, y, r, rot, fill) => {
  let d = ''; for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.5 : r, a = k * Math.PI / 5 - Math.PI / 2 + rot; d += (k ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1); }
  return '<path d="' + d + 'Z" fill="' + fill + '" stroke="#23262F" stroke-width="1.6" stroke-linejoin="round"/>';
};
// the jar as a drawing: n stars inside, the newest one can drop in
export function jarSVG(n, opts = {}) {
  const W = 240, H = 300, x0 = 34, x1 = 206, bottom = 278, top = 92, per = 5, rows = Math.ceil(JAR / per), rh = (bottom - top - 8) / rows;
  const r = mulberry32(opts.seed || 7);
  let stars = '';
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / per), col = i % per, off = row % 2 ? 0.5 : 0;
    const x = 60 + (col + off) * 28 + (r() - 0.5) * 8, y = bottom - 24 - row * 40 + (r() - 0.5) * 8;
    const s = star(x, y, (opts.small ? 17 : 16) + r() * 4, r() * 1.3, PAPER[Math.floor(r() * PAPER.length)]);
    stars += i === n - 1 && opts.drop ? '<g class="drop">' + s + '</g>' : s;
  }
  const body = 'M70 66 Q70 58 78 58 L162 58 Q170 58 170 66 L170 74 Q214 86 214 128 L214 266 Q214 290 190 290 L50 290 Q26 290 26 266 L26 128 Q26 86 70 74 Z';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="jarsvg' + (opts.small ? ' small' : '') + '" role="img" aria-label="' + (opts.label || 'A jar with ' + n + ' paper stars') + '">' +
    '<defs><clipPath id="jc' + (opts.id || '') + '"><path d="' + body + '"/></clipPath></defs>' +
    '<ellipse cx="120" cy="292" rx="96" ry="7" fill="rgba(35,38,47,.12)"/>' +
    '<path d="' + body + '" style="fill:var(--jarglass,rgba(255,255,255,.45))"/>' +
    '<g clip-path="url(#jc' + (opts.id || '') + ')">' + stars + '</g>' +
    '<path d="' + body + '" fill="none" style="stroke:var(--jarline,#23262F)" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M40 130 Q40 104 62 94" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity=".85"/><path d="M40 150 L40 230" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity=".6"/>' +
    // the lid
    '<rect x="62" y="30" width="116" height="30" rx="8" fill="#F4C430" stroke="#23262F" stroke-width="3.5"/>' +
    '<path d="M76 34 V56 M92 34 V56 M108 34 V56 M124 34 V56 M140 34 V56 M156 34 V56" stroke="#23262F" stroke-width="2" opacity=".35"/>' +
    (opts.small ? '' : '<path d="M150 60 q16 18 4 40" fill="none" stroke="#D6698C" stroke-width="3"/><rect x="138" y="96" width="34" height="24" rx="4" fill="#FFFDF6" stroke="#23262F" stroke-width="2" transform="rotate(-8 155 108)"/>') +
    '</svg>';
}

let slip = null, dropNext = false;

export function mount(root) {
  const st = get(), w = allWins();
  if (st.jarsSeen == null || st.jarSize !== JAR) { st.jarsSeen = Math.floor(w.length / JAR); st.jarSize = JAR; save(); } // don't celebrate old jars all at once
  slip = null;
  render(root);
  root.addEventListener('click', e => {
    const t = e.target, st2 = get(), date = logDate(); let b;
    if ((b = t.closest('[data-win]'))) {
      // each tiny win goes in once a day; tapping a lit one offers to take it back out
      const had = allWins().find(m => m.date === date && m.text === b.dataset.win);
      if (had) { toast('Already in the jar today.'); return; }
      addWin(root, b.dataset.win, date); return;
    }
    if ((b = t.closest('[data-unwin]'))) {
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Remove?'; b.classList.add('armed'); setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = '×'; b.classList.remove('armed'); } }, 3000); return; }
      takeOut(root, b.dataset.unwin); return;
    }
    if (t.closest('[data-write]')) {
      const el = root.querySelector('#ownWin'), v = (el.value || '').trim(); if (!v) { el.focus(); return; }
      addWin(root, v, date, true); return;
    }
    if (t.closest('[data-shake]')) {
      const all = allWins(); if (!all.length) return;
      let m = all[Math.floor(Math.random() * all.length)];
      if (all.length > 1 && slip && m.id === slip.id) m = all[(all.indexOf(m) + 1) % all.length];
      slip = m; render(root);
      const j = root.querySelector('.jarbox'); if (j && !reduceMotion) { j.classList.remove('shake'); void j.offsetWidth; j.classList.add('shake'); }
      return;
    }
    if ((b = t.closest('[data-jar]'))) { shelfSheet(+b.dataset.jar); }
  });
  root.addEventListener('keydown', e => { if (e.target.id === 'ownWin' && e.key === 'Enter') { e.preventDefault(); root.querySelector('[data-write]').click(); } });
}

// what the shaken-out slip says: a little stat about doing it again and again, or the day for one-offs
function slipText(m) {
  const st = get(), w = allWins().filter(x => x.text === m.text), now = new Date();
  const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const month = w.filter(x => x.date.startsWith(ym)).length, hard = w.filter(x => x.bright || st.heavy[x.date]).length;
  const act = m.text.charAt(0).toLowerCase() + m.text.slice(1);
  const since = words(w[0].date), mon = MONTHS[now.getMonth()];
  const options = [];
  if (month >= 2) options.push([mon + ' so far', 'You ' + act + ' ' + month + ' times this month.']);
  if (w.length >= 2 && w.length > month) options.push(['Since ' + since, 'You ' + act + ' ' + w.length + ' times since ' + since + '.']);
  if (hard >= 2) options.push(['Even on hard days', 'On ' + hard + ' hard days, you still ' + act + '.']);
  if (!options.length) options.push([words(m.date) + (m.bright ? ' · on a hard day' : ''), 'On ' + words(m.date) + ', you ' + act + '.']);
  return options[Math.floor(Math.random() * options.length)];
}

function takeOut(root, id) {
  const st = get(); removeById('moments', id);
  st.jarsSeen = Math.min(st.jarsSeen || 0, Math.floor(allWins().length / JAR)); save();
  if (slip && slip.id === id) slip = null;
  toast('Taken out of the jar.'); render(root);
}
function addWin(root, text, date, written) {
  const st = get();
  const stormy = st.heavy[date] || st.weather.some(w => w.date === date && w.types.some(x => STORMY.includes(x)));
  addMoment('win', text, date, { bright: stormy ? 1 : 0, written: written ? 1 : 0 });
  const n = allWins().length, full = Math.floor(n / JAR);
  dropNext = true; slip = null;
  if (full > (st.jarsSeen || 0)) { st.jarsSeen = full; save(); render(root); celebrate(full); return; }
  toast(stormy ? 'Into the jar. On a hard day, it shines brighter.' : 'Into the jar. A star just went up.');
  render(root);
}

function celebrate(k) {
  const w = allWins().slice((k - 1) * JAR, k * JAR);
  openSheet('<div class="jarfull">' + jarSVG(JAR, { seed: k * 31, id: 'c', label: 'A full jar' }) +
    '<div class="big">Your jar is full.</div><p class="say" style="margin:0">' + JAR + ' tiny wins, from ' + esc(words(w[0].date)) + ' to ' + esc(words(w[w.length - 1].date)) + '.</p>' +
    '<p class="muted">It goes on your shelf for good, and a fresh jar starts now. Every star in it is still in your sky.</p>' +
    '<button type="button" class="btn wide" data-close>Put it on the shelf</button></div>');
}

function shelfSheet(k) {
  const w = allWins().slice((k - 1) * JAR, k * JAR); if (!w.length) return;
  const r = mulberry32(hashStr('jar' + k + Date.now())), pick = w.slice().sort(() => r() - 0.5).slice(0, 3);
  openSheet('<h2>Jar ' + k + '</h2><p class="muted">' + JAR + ' tiny wins · ' + esc(words(w[0].date)) + ' to ' + esc(words(w[w.length - 1].date)) + '</p>' +
    '<div class="slips">' + pick.map(m => '<div class="slip"><small>' + esc(words(m.date)) + '</small>' + esc(m.text) + '</div>').join('') + '</div>' +
    '<button type="button" class="btn alt" data-close>Close</button>');
}

function render(root) {
  const st = get(), date = logDate(), w = allWins();
  const full = Math.floor(w.length / JAR), inJar = w.length - full * JAR;
  const doneToday = new Set(w.filter(m => m.date === date).map(m => m.text));
  const drop = dropNext && !reduceMotion; dropNext = false;
  root.innerHTML =
    '<div class="top">' + backLink() + dateChip() + '</div>' +
    '<div class="jarhead"><h1>The jar</h1><p class="say">Every tiny win is a star. Tap the jar to shake one out.</p></div>' +
    '<button type="button" class="jarbox" data-shake aria-label="Shake the jar for a past win">' + jarSVG(inJar, { seed: (full + 1) * 31, drop }) + '</button>' +
    '<p class="jarcount">' + (inJar ? 'Filling up, one star at a time.' : 'A fresh jar, ready for its first star.') + '</p>' +
    // what went in on this day, right under the jar, each with a way to take it back out
    (() => { const tw = w.filter(m => m.date === date); return tw.length ? '<div class="jartoday"><span class="jtl">In the jar ' + (date === today() ? 'today' : 'on ' + esc(words(date))) + '</span>' + tw.map(m => '<span class="jpill">' + esc(m.text) + '<button type="button" class="x" data-unwin="' + m.id + '" aria-label="Take ' + esc(m.text) + ' out of the jar">×</button></span>').join('') + '</div>' : ''; })() +
    (slip ? (() => { const sl = slipText(slip); return '<div class="slip big"><small>' + esc(sl[0]) + '</small>' + esc(sl[1]) + '</div>'; })() : '') +
    '<div class="lbl">Add a tiny win</div>' +
    '<div class="chips wins">' + st.settings.tinyWins.map(x => '<button type="button" class="chip" data-win="' + esc(x) + '" aria-pressed="' + doneToday.has(x) + '">' + (doneToday.has(x) ? '★ ' : '') + esc(x) + '</button>').join('') + '</div>' +
    '<div class="addrow"><label class="sr" for="ownWin">Write your own tiny win</label><input id="ownWin" type="text" placeholder="Or write your own…" autocomplete="off" enterkeyhint="done"><button type="button" class="btn" data-write>Add</button></div>' +
    '<a class="muted editlist" href="#/settings">Change the list of tiny wins in Settings</a>' +
    (full ? '<div class="lbl">Full jars</div><div class="shelf">' + Array.from({ length: full }, (_, i) => { const k = i + 1, ws = w.slice(i * JAR, k * JAR); return '<button type="button" class="shelfjar" data-jar="' + k + '">' + jarSVG(JAR, { seed: k * 31, small: true, id: 's' + k, label: 'Jar ' + k }) + '<b>Jar ' + k + '</b><small>' + esc(words(ws[0].date)) + ' – ' + esc(words(ws[ws.length - 1].date)) + '</small></button>'; }).join('') + '</div>' : '') +
    nav('home');
}
