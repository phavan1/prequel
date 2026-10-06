import { get, save, today, backupDue, addMoment } from '../store.js';
import { mulberry32, hashStr } from '../sky-model.js';
import { patches, PAT } from './quilt.js';
import { ensureGoals, checkFinished, openLog } from '../goals.js';
import { AREAS, weatherByName } from '../data.js';
import { esc, him, nav, pop, pick, setLogDate, toast, openSheet, prettyDate } from '../ui.js';

const ICONS = {
  move: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
  food: '<path d="M4 12h16a8 8 0 0 1-16 0zM9 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4"/>',
  rest: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  goal: '<path d="M12 21V4M12 4l7 3-7 3"/><path d="M8 21h8"/>',
  win: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'
};
const svg = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';

const STICKY = ['#FFF1A8', '#DCE7FF', '#FFD9CC', '#DFF0DC', '#EBDDF2'];
const JAR = ['#E5893D', '#C2412D', '#D9A400', '#5DAE7E', '#8B5A3C', '#D96C8A', '#6CC2B4', '#B07CC6', '#3E9E6E', '#F2A65A'];
let root = null;

export function mount(r) {
  root = r;
  setLogDate(null);
  ensureGoals();
  render();
  root.addEventListener('click', onClick);
  if (!document.querySelector('.hello')) checkFinished(); else setTimeout(checkFinished, 2600);
}

// new things you've tried: each one is a jar on his shelf
function jars() {
  return get().foods.filter(f => f.tags.includes('Tried something new')).sort((a, b) => a.ts - b.ts)
    .map(f => { const label = (f.note || 'Something new').trim(); const h = hashStr(label.toLowerCase()); return { label, date: f.date, colour: JAR[h % JAR.length], tall: 20 + (h >> 4) % 9 }; });
}

function render() {
  const st = get(), d = today(), hour = new Date().getHours();
  const wx = st.weather.filter(w => w.date === d).sort((a, b) => a.ts - b.ts);
  const lastWx = wx[wx.length - 1];
  const heavy = !!st.heavy[d];
  const open = st.mind.filter(n => !n.letGo);
  const due = open.filter(n => n.remindOn && n.remindOn <= d);
  root.classList.toggle('heavy', heavy);
  document.body.classList.toggle('heavy-day', heavy);

  let pose = 'standing';
  if (hour < 5) pose = 'nightwatch';
  else if (heavy) pose = 'lying';
  else if (due.length) pose = 'stickynote';
  else if (lastWx) pose = (weatherByName(lastWx.types[lastWx.types.length - 1]) || [])[5] || 'standing';
  const wide = ['lying', 'nightwatch', 'skate', 'asleep', 'legday'].includes(pose);

  const greet = hour < 5 ? 'Still up' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const name = st.settings.name ? ', ' + esc(st.settings.name) : '';
  let line = pick(st.settings.kindLines.length ? st.settings.kindLines : ['Hey, you.']);
  if (hour < 5) line = 'Can\'t sleep? I\'ll keep the lamp on.';
  else if (heavy) line = 'Heavy one today. I\'m lying down too.';

  const wxText = wx.length ? 'Inside today: ' + esc(lastWx.types.join(' + ').toLowerCase()) : 'How\'s the weather inside?';
  const wxDots = wx.length ? '<span class="wx-dots">' + lastWx.types.map(t => '<i style="background:' + (weatherByName(t) || [0, 0, '#ccc'])[2] + '"></i>').join('') + '</span>' : '<b>+</b>';
  const J = jars(), shown = J.slice(-7);

  // three tiny wins for a heavy day, the same three all day
  const wins = st.settings.tinyWins.slice();
  const rr = mulberry32(hashStr(d));
  for (let i = wins.length - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); [wins[i], wins[j]] = [wins[j], wins[i]]; }
  const doneToday = new Set(st.moments.filter(m => m.date === d && m.area === 'win').map(m => m.text));

  root.innerHTML =
    '<div class="top"><div><div class="lbl">' + new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div><h1>' + greet + name + '</h1></div></div>' +
    '<div class="room">' +
      '<div class="floor"></div>' +
      '<a class="window" href="#/sky" aria-label="Your sky, ' + st.moments.length + ' stars"><canvas id="mini"></canvas><span>' + st.moments.length + ' stars ›</span></a>' +
      '<a class="pinboard" href="#/mind" aria-label="Things on my mind, ' + open.length + ' notes">' +
        open.slice(0, 4).map((n, i) => '<i style="background:' + STICKY[i % STICKY.length] + ';left:' + (8 + i * 24) + 'px;top:' + (10 + (i % 2) * 18) + 'px;transform:rotate(' + ((i % 3) - 1) * 6 + 'deg)"><b></b></i>').join('') +
        (open.length ? '' : '<em>clear</em>') + '</a>' +
      '<a class="shelf" href="#/home" data-shelf aria-label="Spice shelf, ' + J.length + ' jars">' +
        '<svg viewBox="0 0 140 52" aria-hidden="true">' +
          shown.map((j, i) => { const x = 6 + i * 19, h = j.tall; return '<rect x="' + x + '" y="' + (40 - h) + '" width="15" height="' + h + '" rx="4" fill="' + j.colour + '" opacity=".88"/><rect x="' + (x + 1.5) + '" y="' + (37 - h) + '" width="12" height="5" rx="1.5" fill="#8B6A46"/><rect x="' + (x + 3) + '" y="' + (40 - h * 0.62) + '" width="9" height="6" rx="1" fill="#FFFDF6"/>'; }).join('') +
          (J.length ? '' : '<rect x="8" y="16" width="15" height="24" rx="4" fill="none" stroke="#C9B48A" stroke-dasharray="3 3"/>') +
          '<rect x="0" y="40" width="140" height="6" rx="2" fill="#B98A5B"/><rect x="14" y="46" width="5" height="6" fill="#9C7249"/><rect x="121" y="46" width="5" height="6" fill="#9C7249"/>' +
        '</svg>' + (J.length > shown.length ? '<span>+' + (J.length - shown.length) + '</span>' : '') + '</a>' +
      '<a class="bed" href="#/quilt" aria-label="Your quilt, ' + new Set(st.rests.map(x => x.date)).size + ' patches">' +
        '<svg viewBox="0 0 170 92" aria-hidden="true"><rect x="2" y="8" width="16" height="80" rx="6" fill="#B98A5B"/><rect x="10" y="78" width="6" height="12" fill="#9C7249"/><rect x="156" y="78" width="6" height="12" fill="#9C7249"/><rect x="12" y="46" width="156" height="34" rx="8" fill="#FFFDF6" stroke="#E2D3AE"/><ellipse cx="34" cy="46" rx="18" ry="9" fill="#FFFDF6" stroke="#E2D3AE"/></svg>' +
        '<canvas id="miniquilt"></canvas></a>' +
      (due.length && !heavy
        ? '<a class="note" href="#/mind">hey… ' + esc(due[0].text.toLowerCase()) + '?</a>'
        : '<div class="bubble" id="line">' + esc(line) + '</div>') +
      '<div class="stage' + (wide ? ' wide' : '') + '"><button type="button" id="tap" aria-label="Say hi">' + him(pose, (wide ? 'wide ' : '') + 'breathe', 'Your character') + '</button></div>' +
    '</div>' +
    (heavy
      ? '<div class="card gentle"><p class="say" style="margin:0">One small thing, if you want it. Or nothing. Both are okay.</p>' +
          '<div class="chips">' + wins.slice(0, 3).map(w => '<button type="button" class="chip" data-win="' + esc(w) + '" aria-pressed="' + doneToday.has(w) + '">' + esc(w) + '</button>').join('') + '</div></div>' +
        '<a class="rowlink" href="#/letters?open=1"><span>' + (st.letters.length ? 'Open a letter from good-day you' : 'No letters yet. Write one on a good day.') + '</span><b>›</b></a>' +
        '<a class="rowlink" href="#/food"><span>Your comfort menu</span><b>›</b></a>' +
        '<a class="rowlink" href="#/weather"><span>' + wxText + '</span>' + wxDots + '</a>' +
        '<button type="button" class="btn ghost wide" data-unheavy>Feeling a bit lighter now</button>'
      : (st.active ? '<a class="rowlink" href="#/move" style="border-color:var(--blue)"><span>' + esc(st.active.n) + ' is still open</span><b>›</b></a>' : '') +
        '<a class="rowlink" href="#/weather"><span>' + wxText + '</span>' + wxDots + '</a>' +
        '<div class="quick">' +
          '<a href="#/food">' + svg(ICONS.food) + 'Food</a>' +
          '<a href="#/rest">' + svg(ICONS.rest) + 'Rest</a>' +
          '<a href="#/wins">' + svg(ICONS.win) + 'Tiny win</a>' +
          '<a href="#/home" data-goals>' + svg(ICONS.goal) + 'Goals</a>' +
        '</div>' +
        (backupDue() ? '<a class="rowlink" href="#/me" style="background:#FFF1C4"><span>Time for a little backup? It keeps everything safe.</span><b>›</b></a>' : '') +
        '<button type="button" class="rowlink" data-heavy style="width:100%"><span>Today feels heavy</span><b>›</b></button>') +
    nav('home');

  drawMini(root.querySelector('#mini'), st);
  drawQuilt(root.querySelector('#miniquilt'));
}

function onClick(e) {
  const t = e.target, st = get(), d = today(); let b;
  if ((b = t.closest('#tap'))) {
    pop(b.querySelector('.him'));
    const el = root.querySelector('#line');
    if (el && !st.heavy[d] && new Date().getHours() >= 5) el.textContent = pick(st.settings.kindLines.length ? st.settings.kindLines : ['Hey, you.']);
    return;
  }
  if (t.closest('[data-heavy]')) { st.heavy[d] = true; save(); render(); window.scrollTo(0, 0); return; }
  if (t.closest('[data-unheavy]')) { delete st.heavy[d]; save(); render(); toast('Glad it lifted a little.'); return; }
  if ((b = t.closest('[data-win]'))) {
    if (b.getAttribute('aria-pressed') === 'true') return;
    addMoment('win', b.dataset.win, d, { bright: 1 });
    toast('That counts, and on a hard day it shines brighter.'); render(); return;
  }
  if (t.closest('[data-shelf]')) { e.preventDefault(); openShelf(); return; }
  if (t.closest('[data-goals]')) { e.preventDefault(); openLog(null, () => render()); }
}

function openShelf() {
  const J = jars();
  openSheet('<h2>The spice shelf</h2><p class="muted">Every new food you try adds a jar. Log food and tag it "Tried something new".</p>' +
    (J.length
      ? '<div class="jarlist">' + J.slice().reverse().map(j => '<div class="jarrow"><i style="background:' + j.colour + '"></i><span>' + esc(j.label) + '</span><small>' + esc(prettyDate(j.date)) + '</small></div>').join('') + '</div>'
      : '<p class="empty">No jars yet. The first new thing you try goes here.</p>') +
    '<a class="btn" href="#/food">Log food</a><button type="button" class="btn alt" data-close>Close</button>', null);
}

// his quilt, made of your real patches, newest at the top
function drawQuilt(cv) {
  if (!cv) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth || 120, h = cv.clientHeight || 36;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const cols = 8, rows = 3, cw = w / cols, ch = h / rows;
  const P = patches().slice(-cols * rows).reverse();
  g.fillStyle = '#F3E6C4'; g.fillRect(0, 0, w, h);
  P.forEach((p, i) => {
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch, f = p.fabrics[0];
    const s = Math.ceil(Math.max(cw, ch)) + 1, tile = document.createElement('canvas');
    tile.width = s * 2; tile.height = s * 2; const tg = tile.getContext('2d'); tg.scale(2, 2);
    PAT[f.pat](tg, s, f.a, f.b, mulberry32(f.seed));
    g.save(); g.beginPath(); g.rect(x, y, cw, ch); g.clip(); g.drawImage(tile, x, y, s, s); g.restore();
  });
  g.strokeStyle = 'rgba(255,253,246,.85)'; g.setLineDash([2, 2]); g.lineWidth = 1;
  for (let i = 1; i < cols; i++) { g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, h); g.stroke(); }
  for (let j = 1; j < rows; j++) { g.beginPath(); g.moveTo(0, j * ch); g.lineTo(w, j * ch); g.stroke(); }
}

// a little window onto the sky: one star per moment, always in the same place
function drawMini(cv, st) {
  if (!cv) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth || 120, h = cv.clientHeight || 100;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(201,214,255,' + (0.15 + rnd() * 0.3) + ')'; g.fillRect(rnd() * w, rnd() * h, 1, 1); }
  st.moments.slice(-120).forEach(m => {
    const x = rnd() * w, y = rnd() * (h - 14) + 2, r = 0.8 + rnd() * 1.4 + (m.bright ? 0.8 : 0);
    const c = (AREAS[m.area] || AREAS.mind).colour;
    g.fillStyle = c; g.globalAlpha = 0.35; g.beginPath(); g.arc(x, y, r * 2.4, 0, 7); g.fill();
    g.globalAlpha = 1; g.fillStyle = '#FFF8E1'; g.beginPath(); g.arc(x, y, r * 0.8, 0, 7); g.fill();
  });
}
