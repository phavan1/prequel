import { get, save, today, backupDue } from '../store.js';
import { mulberry32 } from '../sky-model.js';
import { patches, PAT } from './quilt.js';
import { ensureGoals, checkFinished, openLog } from '../goals.js';
import { AREAS, weatherByName } from '../data.js';
import { esc, him, nav, pop, pick, setLogDate, toast } from '../ui.js';

const ICONS = {
  move: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
  food: '<path d="M4 12h16a8 8 0 0 1-16 0zM9 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4"/>',
  rest: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  goal: '<path d="M12 21V4M12 4l7 3-7 3"/><path d="M8 21h8"/>',
  blanket: '<path d="M3 8c3-2 6-2 9 0s6 2 9 0v10c-3 2-6 2-9 0s-6-2-9 0z"/><path d="M3 13c3-2 6-2 9 0s6 2 9 0"/>',
  win: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'
};
const svg = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';

const SOFT_ASK = ['Wanna slow down?', 'Wanna take a breather?', 'Fancy a slower one?', 'Need a cosy minute?', 'Wanna press pause?'];
let root = null;

export function mount(r) {
  root = r;
  setLogDate(null);
  ensureGoals();
  render();
  root.addEventListener('click', onClick);
  if (!document.querySelector('.hello')) checkFinished(); else setTimeout(checkFinished, 2600);
}

// a proper window: wooden frame, four panes, sill, a little plant, curtains tied back
const WINDOW = '<svg class="frame" viewBox="0 0 168 150" aria-hidden="true">' +
  '<path fill-rule="evenodd" fill="#C99A6B" d="M20 8h128a6 6 0 0 1 6 6v100a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6zM24 18v92h120V18z"/>' +
  '<rect x="81" y="18" width="6" height="92" fill="#C99A6B"/><rect x="24" y="61" width="120" height="6" fill="#C99A6B"/>' +
  '<rect x="6" y="118" width="156" height="9" rx="3" fill="#B98A5B"/>' +
  '<path d="M126 118c0-6 2-8 8-8h6c6 0 8 2 8 8z" fill="#D9673B"/><path d="M137 110c-6-6-8-14-4-18 3 6 4 11 4 18zM137 110c3-8 9-12 13-11-3 6-7 9-13 11zM137 110c-1-9 1-15 5-18 1 7-1 13-5 18z" fill="#5DAE7E"/>' +
  '<rect x="2" y="1" width="164" height="5" rx="2.5" fill="#9C7249"/>' +
  '<path d="M4 6h18c-1 22-3 40-8 54 6 16 9 34 9 56H4z" fill="#FFF6E0" stroke="#E8D7B0"/><path d="M164 6h-18c1 22 3 40 8 54-6 16-9 34-9 56h19z" fill="#FFF6E0" stroke="#E8D7B0"/>' +
  '<path d="M9 14c0 14 1 30 2 44M159 14c0 14-1 30-2 44" stroke="#EADBB8" fill="none"/>' +
  '<rect x="3" y="57" width="20" height="5" rx="2.5" fill="#1F55D0"/><rect x="145" y="57" width="20" height="5" rx="2.5" fill="#1F55D0"/></svg>';
// an embroidery hoop on the wall holding a little piece of your quilt
const HOOP = '<svg class="ring" viewBox="0 0 92 104" aria-hidden="true"><path d="M46 2 L34 18 M46 2 L58 18" stroke="#9C7249" stroke-width="1.5" fill="none"/><circle cx="46" cy="2.5" r="2.5" fill="#9C7249"/>' +
  '<rect x="40" y="13" width="12" height="9" rx="2" fill="#B98A5B"/><circle cx="46" cy="60" r="39" fill="none" stroke="#C99A6B" stroke-width="7"/><circle cx="46" cy="60" r="35.5" fill="none" stroke="#B98A5B" stroke-width="1.2"/></svg>';

function render() {
  const st = get(), d = today(), hour = new Date().getHours();
  const wx = st.weather.filter(w => w.date === d).sort((a, b) => a.ts - b.ts);
  const lastWx = wx[wx.length - 1];
  const soft = !!st.heavy[d];
  const due = st.mind.filter(n => !n.letGo && n.remindOn && n.remindOn <= d);
  root.classList.toggle('heavy', soft);
  document.body.classList.toggle('heavy-day', soft);

  // he sits with you; on a soft day he's curled up under his blanket
  const pose = soft ? 'asleep' : hour >= 6 && hour < 12 ? 'sitting' : hour >= 12 && hour < 19 ? 'afternoon' : 'nightwatch';
  const greet = hour < 5 ? 'Still up' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const name = st.settings.name ? ', ' + esc(st.settings.name) : '';
  let line = pick(st.settings.kindLines.length ? st.settings.kindLines : ['Hey, you.']);
  if (hour < 5) line = 'Can\'t sleep? I\'ll keep the lamp on.';
  if (soft) line = 'No plans today. I\'m right here.';

  const wxText = wx.length ? 'Inside today: ' + esc(lastWx.types.join(' + ').toLowerCase()) : 'How\'s the weather inside?';
  const wxDots = wx.length ? '<span class="wx-dots">' + lastWx.types.map(t => '<i style="background:' + (weatherByName(t) || [0, 0, '#ccc'])[2] + '"></i>').join('') + '</span>' : '<b>+</b>';

  root.innerHTML =
    '<div class="top"><div><div class="lbl">' + new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div><h1>' + greet + name + '</h1></div></div>' +
    '<div class="room">' +
      '<div class="floor"></div>' + (soft ? '' : '<svg class="rug" viewBox="0 0 240 44" aria-hidden="true"><ellipse cx="120" cy="22" rx="118" ry="20" fill="#DCE7FF"/><ellipse cx="120" cy="22" rx="104" ry="14" fill="none" stroke="#9FB8E8" stroke-width="2" stroke-dasharray="6 5"/></svg>') +
      '<a class="window" href="#/sky" aria-label="Your sky, ' + st.moments.length + ' stars"><canvas id="mini"></canvas>' + WINDOW + '<span>' + st.moments.length + ' stars</span></a>' +
      '<a class="hoop" href="#/quilt" aria-label="Your quilt"><canvas id="miniquilt"></canvas>' + HOOP + '</a>' +
      (due.length && !soft
        ? '<a class="note" href="#/mind">hey… ' + esc(due[0].text.toLowerCase()) + '?</a>'
        : '<div class="bubble" id="line">' + esc(line) + '</div>') +
      '<div class="stage wide"><button type="button" id="tap" aria-label="Say hi">' + him(pose, 'wide breathe', 'Your character') + '</button></div>' +
    '</div>' +
    (soft
      ? '<a class="game" href="#/skate"><span><b>Skate home</b><small>' + ((st.games && st.games.skate && st.games.skate.best) ? 'Your best: ' + st.games.skate.best + ' m' : 'Jump the bumps, grab the stars') + '</small></span><b class="go">Play ›</b></a>' +
        '<a class="rowlink" href="#/letters?open=1"><span>' + (st.letters.length ? 'A letter from good-day you' : 'No letters yet. Write one on a good day.') + '</span><b>›</b></a>' +
        '<button type="button" class="btn ghost wide" data-unheavy>Back to a regular day</button>'
      : (st.active ? '<a class="rowlink" href="#/move" style="border-color:var(--blue)"><span>' + esc(st.active.n) + ' is still open</span><b>›</b></a>' : '') +
        '<a class="rowlink" href="#/weather"><span>' + wxText + '</span>' + wxDots + '</a>' +
        '<div class="quick">' +
          '<a href="#/food">' + svg(ICONS.food) + 'Food</a>' +
          '<a href="#/rest">' + svg(ICONS.rest) + 'Rest</a>' +
          '<a href="#/wins">' + svg(ICONS.win) + 'Tiny win</a>' +
          '<a href="#/home" data-goals>' + svg(ICONS.goal) + 'Goals</a>' +
        '</div>' +
        (backupDue() ? '<a class="rowlink" href="#/me" style="background:#FFF1C4"><span>Time for a little backup? It keeps everything safe.</span><b>›</b></a>' : '') +
        '<button type="button" class="rowlink softask" data-heavy style="width:100%"><span>' + svg(ICONS.blanket) + pick(SOFT_ASK) + '</span><b>›</b></button>') +
    nav('home');

  drawMini(root.querySelector('#mini'), st);
  drawQuilt(root.querySelector('#miniquilt'));
}

function onClick(e) {
  const t = e.target, st = get(), d = today(); let b;
  if ((b = t.closest('#tap'))) {
    pop(b.querySelector('.him'));
    const el = root.querySelector('#line');
    if (el && !st.heavy[d]) el.textContent = pick(st.settings.kindLines.length ? st.settings.kindLines : ['Hey, you.']);
    return;
  }
  if (t.closest('[data-heavy]')) { st.heavy[d] = true; save(); render(); window.scrollTo(0, 0); return; }
  if (t.closest('[data-unheavy]')) { delete st.heavy[d]; save(); render(); toast('Glad you took a breather.'); return; }
  if (t.closest('[data-goals]')) { e.preventDefault(); openLog(null, () => render()); }
}

// his quilt, made of your real patches, newest at the top
function drawQuilt(cv) {
  if (!cv) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth || 120, h = cv.clientHeight || 36;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const cols = 4, rows = 4, cw = w / cols, ch = h / rows;
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
  // in the day the window shows a daytime sky; your stars come out after 7pm (the sky page itself is always night)
  const hr = new Date().getHours();
  if (hr >= 6 && hr < 19) {
    const top = hr < 8 ? '#FFD6A5' : hr >= 17 ? '#FFC38A' : '#8FC1F2', bot = hr < 8 ? '#CFE3FF' : hr >= 17 ? '#B9C8F0' : '#DDEEFF';
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sx = w * (0.15 + 0.7 * (hr - 6) / 13), sy = h * (0.22 + 0.25 * Math.abs(hr - 12.5) / 6.5);
    const glow = g.createRadialGradient(sx, sy, 2, sx, sy, 26); glow.addColorStop(0, 'rgba(255,240,180,.9)'); glow.addColorStop(1, 'rgba(255,240,180,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w, h); g.fillStyle = '#FFE58A'; g.beginPath(); g.arc(sx, sy, 8, 0, 7); g.fill();
    const cloud = (x, y, k) => { g.fillStyle = 'rgba(255,255,255,.92)'; [[0, 0, 9], [10, -4, 11], [21, 0, 9], [10, 3, 9]].forEach(c => { g.beginPath(); g.arc(x + c[0] * k, y + c[1] * k, c[2] * k, 0, 7); g.fill(); }); };
    cloud(w * 0.55, h * 0.62, 0.9); cloud(w * 0.08, h * 0.78, 0.7); cloud(w * 0.7, h * 0.28, 0.6);
    return;
  }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(201,214,255,' + (0.15 + rnd() * 0.3) + ')'; g.fillRect(rnd() * w, rnd() * h, 1, 1); }
  st.moments.slice(-120).forEach(m => {
    const x = rnd() * w, y = rnd() * (h - 14) + 2, r = 0.8 + rnd() * 1.4 + (m.bright ? 0.8 : 0);
    const c = (AREAS[m.area] || AREAS.mind).colour;
    g.fillStyle = c; g.globalAlpha = 0.35; g.beginPath(); g.arc(x, y, r * 2.4, 0, 7); g.fill();
    g.globalAlpha = 1; g.fillStyle = '#FFF8E1'; g.beginPath(); g.arc(x, y, r * 0.8, 0, 7); g.fill();
  });
}
