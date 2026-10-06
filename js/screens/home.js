import { get, today } from '../store.js';
import { AREAS, weatherByName } from '../data.js';
import { esc, him, nav, pop, pick, setLogDate } from '../ui.js';

const ICONS = {
  move: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
  food: '<path d="M4 12h16a8 8 0 0 1-16 0zM9 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4"/>',
  rest: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  win: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'
};
const svg = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';

export function mount(root) {
  setLogDate(null);
  const st = get(), d = today(), hour = new Date().getHours();
  const wx = st.weather.filter(w => w.date === d).sort((a, b) => a.ts - b.ts);
  const lastWx = wx[wx.length - 1];
  const heavy = !!st.heavy[d];
  const due = st.mind.filter(n => !n.letGo && n.remindOn && n.remindOn <= d);
  const sessions = st.sessions.length;

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
  const todayCount = st.moments.filter(m => m.date === d).length;

  root.innerHTML =
    '<div class="top"><div><div class="lbl">' + new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div><h1>' + greet + name + '</h1></div></div>' +
    '<div class="room">' +
      '<div class="floor"></div>' +
      '<a class="window" href="#/sky" aria-label="Open your sky"><canvas id="mini"></canvas><span>' + st.moments.length + ' stars ›</span></a>' +
      (due.length
        ? '<a class="note" href="#/mind">hey… ' + esc(due[0].text.toLowerCase()) + '?</a>'
        : '<div class="bubble" id="line">' + esc(line) + '</div>') +
      '<div class="stage"><button type="button" id="tap" aria-label="Say hi">' + him(pose, (wide ? 'wide ' : '') + 'breathe', 'Your character') + '</button></div>' +
    '</div>' +
    (st.active ? '<a class="rowlink" href="#/move" style="border-color:var(--blue)"><span>' + esc(st.active.n) + ' is still open</span><b>›</b></a>' : '') +
    '<a class="rowlink" href="#/weather"><span>' + wxText + '</span>' + wxDots + '</a>' +
    '<div class="quick">' +
      '<a class="primary" href="#/move">' + svg(ICONS.move) + 'Move</a>' +
      '<a href="#/food">' + svg(ICONS.food) + 'Food</a>' +
      '<a href="#/rest">' + svg(ICONS.rest) + 'Rest</a>' +
      '<a href="#/wins">' + svg(ICONS.win) + 'Tiny win</a>' +
    '</div>' +
    '<a class="rowlink" href="#/wins?heavy=1"><span>' + (heavy ? 'Today\'s heavy. Go gently.' : 'Today feels heavy') + '</span><b>›</b></a>' +
    '<a class="rowlink" href="#/me"><span>Road to 100 sessions</span><b>' + sessions + '</b></a>' +
    '<a class="rowlink" href="#/days"><span>' + (todayCount ? todayCount + (todayCount === 1 ? ' moment' : ' moments') + ' today' : 'Nothing logged today, and that\'s okay') + '</span><b>›</b></a>' +
    nav('home');

  // tap him: a little hop and a new kind line
  const tap = root.querySelector('#tap');
  tap.addEventListener('click', () => {
    pop(tap.querySelector('.him'));
    const el = root.querySelector('#line');
    if (el) el.textContent = pick(st.settings.kindLines.length ? st.settings.kindLines : ['Hey, you.']);
  });
  drawMini(root.querySelector('#mini'), st);
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
