// The jar: every tiny win is a little paper star dropped into a glass jar. Tap the jar to shake one back out.
// When it's full, it's celebrated and set on the shelf, and a fresh jar begins. Nothing is ever lost.
// Since v41 every jar secretly holds 20 to 40 stars (picked when it starts), its shape hints at its size
// (jam jar, mason jar, cookie jar), and the stars come in different sizes.
import { get, save, addMoment, parseKey, removeById, today } from '../store.js';
import { esc, nav, backLink, dateChip, logDate, toast, openSheet, closeSheet, reduceMotion, prettyDate } from '../ui.js';
import { mulberry32, hashStr } from '../sky-model.js';

export const JAR = 20; // the size jars had before v41 (old full jars keep it)
const MIN_JAR = 20, MAX_JAR = 40;
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
// three jars. Each: the glass body, a lid (its own group, so it can screw on), and the area the stars pile into.
const SHAPES = {
  jam: { // short and round, 20–26 stars
    body: 'M58 118 Q58 108 68 108 L172 108 Q182 108 182 118 L182 124 Q216 136 216 176 L216 262 Q216 290 188 290 L52 290 Q24 290 24 262 L24 176 Q24 136 58 124 Z',
    lid: '<rect x="52" y="80" width="136" height="30" rx="9" fill="#F4C430" stroke="#23262F" stroke-width="3.5"/><path d="M68 85 V105 M84 85 V105 M100 85 V105 M116 85 V105 M132 85 V105 M148 85 V105 M164 85 V105" stroke="#23262F" stroke-width="2" opacity=".3"/>',
    tag: '<path d="M162 112 q14 16 4 34" fill="none" stroke="#D6698C" stroke-width="3"/><rect x="150" y="144" width="32" height="22" rx="4" fill="#FFFDF6" stroke="#23262F" stroke-width="2" transform="rotate(-8 166 155)"/>',
    shine: '<path d="M38 180 Q38 156 56 144" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity=".85"/><path d="M38 196 L38 246" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity=".6"/>',
    xl: 34, xr: 206, bottom: 282, top: 146
  },
  mason: { // tall with a screw band, 27–33 stars
    body: 'M74 64 Q74 56 82 56 L158 56 Q166 56 166 64 L166 72 Q196 84 196 116 L196 270 Q196 290 176 290 L64 290 Q44 290 44 270 L44 116 Q44 84 74 72 Z',
    lid: '<rect x="66" y="26" width="108" height="32" rx="6" fill="#E3B23C" stroke="#23262F" stroke-width="3.5"/><path d="M70 34 H170 M70 42 H170 M70 50 H170" stroke="#23262F" stroke-width="2" opacity=".3"/><rect x="74" y="18" width="92" height="10" rx="4" fill="#F4C430" stroke="#23262F" stroke-width="3"/>',
    tag: '<path d="M150 60 q16 18 4 40" fill="none" stroke="#D6698C" stroke-width="3"/><rect x="138" y="96" width="34" height="24" rx="4" fill="#FFFDF6" stroke="#23262F" stroke-width="2" transform="rotate(-8 155 108)"/>',
    shine: '<path d="M58 130 Q58 104 76 94" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity=".85"/><path d="M58 150 L58 240" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity=".6"/>',
    xl: 52, xr: 188, bottom: 282, top: 100
  },
  cookie: { // big and wide with a glass lid, 34–40 stars
    body: 'M40 104 Q40 92 54 92 L186 92 Q200 92 200 104 L206 112 Q226 130 226 160 L226 262 Q226 292 196 292 L44 292 Q14 292 14 262 L14 160 Q14 130 34 112 Z',
    lid: '<path d="M28 98 Q120 34 212 98 Z" style="fill:var(--jarglass,rgba(255,255,255,.45))" stroke-width="3.5" stroke-linejoin="round" class="jarstroke"/><circle cx="120" cy="50" r="13" fill="#F4C430" stroke="#23262F" stroke-width="3.5"/><path d="M60 88 Q90 66 120 62" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity=".7"/>',
    tag: '<path d="M178 104 q14 16 4 36" fill="none" stroke="#D6698C" stroke-width="3"/><rect x="166" y="138" width="34" height="24" rx="4" fill="#FFFDF6" stroke="#23262F" stroke-width="2" transform="rotate(-8 183 150)"/>',
    shine: '<path d="M28 176 Q28 144 46 128" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity=".85"/><path d="M28 196 L28 248" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity=".6"/>',
    xl: 22, xr: 218, bottom: 284, top: 120
  }
};
export const shapeOf = size => size <= 26 ? 'jam' : size <= 33 ? 'mason' : 'cookie';

// where every star of a full jar sits: different sizes, piled from the bottom up, scaled so the pile reaches
// the top exactly on the last star. Drawing the first n of them shows the jar filling.
const LAYOUTS = {};
function layout(shape, size, seed) {
  const key = shape + size + ':' + seed; if (LAYOUTS[key]) return LAYOUTS[key];
  const S = SHAPES[shape], r = mulberry32(seed);
  const stars = Array.from({ length: size }, () => ({ u: 0.62 + r() * 0.8, jx: r() - 0.5, jy: r() - 0.5, rot: r() * 1.3, fill: PAPER[Math.floor(r() * PAPER.length)] }));
  const pack = k => {
    const out = []; let y = S.bottom, x = S.xl, rowH = 0, row = 0;
    stars.forEach(st => {
      const rad = st.u * k, step = rad * 1.7;
      if (x + step > S.xr && x > S.xl) { y -= rowH * 0.8; row++; x = S.xl + (row % 2 ? 6 : 0); rowH = 0; }
      out.push({ x: x + rad * 0.85 + st.jx * 5, y: y - rad + st.jy * 4, r: rad, rot: st.rot, fill: st.fill }); x += step; rowH = Math.max(rowH, rad * 2);
    });
    return { out, top: Math.min(...out.map(o => o.y - o.r)) };
  };
  let lo = 4, hi = 60;
  for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2; if (pack(mid).top > S.top) lo = mid; else hi = mid; }
  return (LAYOUTS[key] = pack(lo).out);
}
// the jar as a drawing: n stars in a jar of `size` (default: an old jar of 20), the newest one can drop in
export function jarSVG(n, opts = {}) {
  const size = opts.size || JAR, shape = shapeOf(size), S = SHAPES[shape], id = opts.id || '';
  const L = layout(shape, size, opts.seed || 7);
  let stars = '';
  for (let i = 0; i < Math.min(n, size); i++) {
    const o = L[i], s = star(o.x, o.y, o.r, o.rot, o.fill);
    stars += i === n - 1 && opts.drop ? '<g class="drop">' + s + '</g>' : s;
  }
  const cx = (S.xl + S.xr) / 2, cy = (S.top + S.bottom) / 2;
  return '<svg viewBox="0 0 240 300" class="jarsvg jar-' + shape + (opts.small ? ' small' : '') + '" role="img" aria-label="' + esc(opts.label || 'A jar with ' + n + ' paper stars') + '">' +
    '<defs><clipPath id="jc' + id + '"><path d="' + S.body + '"/></clipPath></defs>' +
    '<ellipse cx="120" cy="293" rx="100" ry="7" fill="rgba(35,38,47,.12)"/>' +
    '<path d="' + S.body + '" style="fill:var(--jarglass,rgba(255,255,255,.45))"/>' +
    '<g clip-path="url(#jc' + id + ')"><g class="jarstars" style="transform-origin:' + cx + 'px ' + cy + 'px">' + stars + '</g></g>' +
    '<path d="' + S.body + '" fill="none" class="jarstroke" stroke-width="3.5" stroke-linejoin="round"/>' + S.shine +
    '<g class="jarlid">' + S.lid + '</g>' +
    (opts.small ? '' : S.tag) +
    '</svg>';
}

// ---------- which stars are in which jar ----------
// The sizes are kept in st.jarPlan (one per jar, oldest first). Jars that were already full before v41 stay 20.
// A new jar's size is picked at random, secretly, the moment it's needed.
function plan() {
  const st = get();
  if (!Array.isArray(st.jarPlan)) st.jarPlan = Array(Math.floor(allWins().length / JAR)).fill(JAR);
  return st.jarPlan;
}
export function jars() {
  const w = allWins(), p = plan(), out = []; let i = 0, k = 0, grew = false;
  for (;;) {
    if (k >= p.length) { p.push(MIN_JAR + Math.floor(Math.random() * (MAX_JAR - MIN_JAR + 1))); grew = true; }
    const size = p[k], ws = w.slice(i, i + size);
    out.push({ k: k + 1, size, wins: ws, full: ws.length === size });
    i += size; k++;
    if (ws.length < size) break;
  }
  if (grew) save();
  return out; // the last one is the jar filling up now
}

let slip = null, dropNext = false;

export function mount(root) {
  slip = null;
  render(root);
  // a jar that filled up without its moment (like the first jars, before v41) gets a belated celebration
  setTimeout(() => { if (root.isConnected) maybeCelebrate(); }, 350);
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
  st.jarsCelebrated = Math.min(st.jarsCelebrated || 0, jars().filter(j => j.full).length); save();
  if (slip && slip.id === id) slip = null;
  toast('Taken out of the jar.'); render(root);
}
function addWin(root, text, date, written) {
  const st = get();
  const stormy = st.heavy[date] || st.weather.some(w => w.date === date && w.types.some(x => STORMY.includes(x)));
  addMoment('win', text, date, { bright: stormy ? 1 : 0, written: written ? 1 : 0 });
  dropNext = true; slip = null;
  if (jars().filter(j => j.full).length > (st.jarsCelebrated || 0)) { render(root); maybeCelebrate(); return; }
  toast(stormy ? 'Into the jar. On a hard day, it shines brighter.' : 'Into the jar. A star just went up.');
  render(root);
}

// the newest full jar that hasn't had its moment gets one; any older ones are simply counted as on the shelf
function maybeCelebrate() {
  const st = get(), full = jars().filter(j => j.full), done = st.jarsCelebrated || 0;
  if (full.length <= done) return;
  const extra = full.length - done - 1;
  st.jarsCelebrated = full.length; save();
  celebrate(full[full.length - 1], extra);
}
// the moment: the lid screws on, the stars swirl, and the jar floats up onto the shelf
function celebrate(j, extra) {
  const w = j.wins, before = jars().filter(x => x.full && x.k < j.k).slice(-3);
  const mini = x => '<div class="cslot">' + jarSVG(x.size, { size: x.size, seed: x.k * 31, small: true, id: 'cs' + x.k, label: 'Jar ' + x.k }) + '</div>';
  const sheet = openSheet('<div class="jarfull">' +
    '<div class="cstage"><div class="cjar">' + jarSVG(j.size, { size: j.size, seed: j.k * 31, id: 'c', label: 'Your full jar' }) + '</div>' +
      '<div class="cshelf"><div class="cslots">' + before.map(mini).join('') + '<div class="cslot target"></div></div><div class="plank"></div></div></div>' +
    '<div class="cwords"><div class="big">Your jar is full.</div><p class="say" style="margin:0">' + j.size + ' tiny wins, from ' + esc(words(w[0].date)) + ' to ' + esc(words(w[w.length - 1].date)) + '.</p>' +
    '<p class="muted">It\'s on your shelf for good, and a fresh jar starts now. How big will this one be? Every star in it is still in your sky.' + (extra > 0 ? ' Plus ' + extra + (extra === 1 ? ' more full jar' : ' more full jars') + ' already waiting on your shelf.' : '') + '</p>' +
    '<button type="button" class="btn wide" data-close>Lovely</button></div></div>');
  if (reduceMotion || !sheet.animate) return;
  const svg = sheet.querySelector('.cjar svg'), lid = svg.querySelector('.jarlid'), stars = svg.querySelector('.jarstars');
  const cj = sheet.querySelector('.cjar'), target = sheet.querySelector('.cslot.target'), words2 = sheet.querySelector('.cwords');
  const go = (el, frames, o) => el.animate(frames, Object.assign({ fill: 'both', easing: 'ease-in-out' }, o));
  words2.style.opacity = '0';
  // 1. the lid comes down and screws on, twist by twist
  go(lid, [{ transform: 'translateY(-70px) rotate(-18deg)' }, { transform: 'translateY(-4px) rotate(10deg)', offset: 0.45 }, { transform: 'translateY(0) rotate(-7deg)', offset: 0.62 }, { transform: 'rotate(5deg)', offset: 0.78 }, { transform: 'rotate(-2deg)', offset: 0.9 }, { transform: 'none' }], { duration: 1400, easing: 'ease-out' });
  // 2. the stars swirl and glow
  go(stars, [{ transform: 'rotate(0)' }, { transform: 'rotate(32deg)', offset: 0.35 }, { transform: 'rotate(-20deg)', offset: 0.7 }, { transform: 'rotate(0)' }], { duration: 1600, delay: 1350 });
  go(svg, [{ filter: 'drop-shadow(0 0 0 rgba(255,214,90,0))' }, { filter: 'drop-shadow(0 0 18px rgba(255,214,90,.95))', offset: 0.5 }, { filter: 'drop-shadow(0 0 6px rgba(255,214,90,.5))' }], { duration: 1600, delay: 1350 });
  // 3. it floats up, then settles onto the shelf in the empty spot
  const a = cj.getBoundingClientRect(), t = target.getBoundingClientRect();
  const dx = (t.left + t.width / 2) - (a.left + a.width / 2), dy = (t.top + t.height / 2) - (a.top + a.height / 2), sc = t.width / a.width;
  go(cj, [{ transform: 'none' }, { transform: 'translateY(-26px) scale(1.05)', offset: 0.3 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')' }], { duration: 1500, delay: 3100 });
  go(words2, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 4300 });
}

function shelfSheet(k) {
  const j = jars()[k - 1]; if (!j || !j.wins.length) return; const w = j.wins;
  const r = mulberry32(hashStr('jar' + k + Date.now())), pick = w.slice().sort(() => r() - 0.5).slice(0, 3);
  openSheet('<div class="shelfhead">' + jarSVG(j.size, { size: j.size, seed: k * 31, small: true, id: 'sh' + k, label: 'Jar ' + k }) + '<div><h2>Jar ' + k + '</h2><p class="muted">' + j.size + ' tiny wins · ' + esc(words(w[0].date)) + ' to ' + esc(words(w[w.length - 1].date)) + '</p></div></div>' +
    '<div class="slips">' + pick.map(m => '<div class="slip"><small>' + esc(words(m.date)) + '</small>' + esc(m.text) + '</div>').join('') + '</div>' +
    '<button type="button" class="btn alt" data-close>Close</button>');
}

function render(root) {
  const st = get(), date = logDate(), w = allWins();
  const J = jars(), cur = J[J.length - 1], shelf = J.filter(j => j.full), inJar = cur.wins.length;
  const doneToday = new Set(w.filter(m => m.date === date).map(m => m.text));
  const drop = dropNext && !reduceMotion; dropNext = false;
  root.innerHTML =
    '<div class="top">' + backLink() + dateChip() + '</div>' +
    '<div class="jarhead"><h1>The jar</h1><p class="say">Every tiny win is a star. Tap the jar to shake one out.</p></div>' +
    '<button type="button" class="jarbox" data-shake aria-label="Shake the jar for a past win">' + jarSVG(inJar, { size: cur.size, seed: cur.k * 31, drop }) + '</button>' +
    '<p class="jarcount">' + (inJar ? 'Filling up, one star at a time.' : 'A fresh jar, ready for its first star.') + '</p>' +
    // what went in on this day, right under the jar, each with a way to take it back out
    (() => { const tw = w.filter(m => m.date === date); return tw.length ? '<div class="jartoday"><span class="jtl">In the jar ' + (date === today() ? 'today' : 'on ' + esc(words(date))) + '</span>' + tw.map(m => '<span class="jpill">' + esc(m.text) + '<button type="button" class="x" data-unwin="' + m.id + '" aria-label="Take ' + esc(m.text) + ' out of the jar">×</button></span>').join('') + '</div>' : ''; })() +
    (slip ? (() => { const sl = slipText(slip); return '<div class="slip big"><small>' + esc(sl[0]) + '</small>' + esc(sl[1]) + '</div>'; })() : '') +
    '<div class="lbl">Add a tiny win</div>' +
    '<div class="chips wins">' + st.settings.tinyWins.map(x => '<button type="button" class="chip" data-win="' + esc(x) + '" aria-pressed="' + doneToday.has(x) + '">' + (doneToday.has(x) ? '★ ' : '') + esc(x) + '</button>').join('') + '</div>' +
    '<div class="addrow"><label class="sr" for="ownWin">Write your own tiny win</label><input id="ownWin" type="text" placeholder="Or write your own…" autocomplete="off" enterkeyhint="done"><button type="button" class="btn" data-write>Add</button></div>' +
    '<a class="muted editlist" href="#/settings">Change the list of tiny wins in Settings</a>' +
    (shelf.length ? '<div class="lbl">Full jars</div><div class="shelf">' + shelf.map(j => { const k = j.k, ws = j.wins; return '<button type="button" class="shelfjar" data-jar="' + k + '">' + jarSVG(j.size, { size: j.size, seed: k * 31, small: true, id: 's' + k, label: 'Jar ' + k }) + '<b>Jar ' + k + '</b><small>' + esc(words(ws[0].date)) + ' – ' + esc(words(ws[ws.length - 1].date)) + '</small></button>'; }).join('') + '</div>' : '') +
    nav('home');
}
