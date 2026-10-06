// Kind charts: only ones that can't go down, or that have no good or bad.
import { dateKey, parseKey, today } from './store.js';
import { esc, prettyDate } from './ui.js';
import { weatherByName } from './data.js';

// ---------- the hill: a count that only ever climbs. A break is a flat stretch, never a drop. ----------
export function hill(dates, colour, unit) {
  const ds = dates.slice().sort();
  if (ds.length < 2) return '<p class="empty" style="margin:0">Your hill starts with your first few logs.</p>';
  const first = parseKey(ds[0]).getTime(), last = parseKey(today()).getTime(), span = Math.max(1, last - first);
  const W = 320, H = 120, P = 8, total = ds.length;
  const byDay = []; ds.forEach((d, i) => { if (byDay.length && byDay[byDay.length - 1][0] === d) byDay[byDay.length - 1][1] = i + 1; else byDay.push([d, i + 1]); });
  const X = d => P + (parseKey(d).getTime() - first) / span * (W - P * 2 - 30);
  const Y = n => H - 18 - n / total * (H - 34);
  let path = 'M' + X(ds[0]) + ' ' + Y(0);
  byDay.forEach(([d, n]) => { path += ' L' + X(d).toFixed(1) + ' ' + Y(n).toFixed(1); });
  const endX = X(today());
  path += ' L' + endX.toFixed(1) + ' ' + Y(total).toFixed(1);
  const area = path + ' L' + endX.toFixed(1) + ' ' + (H - 18) + ' L' + X(ds[0]).toFixed(1) + ' ' + (H - 18) + ' Z';
  const pts = byDay.map(([d, n]) => d + ',' + n).join(';');
  return '<div class="chartwrap"><svg class="hill" viewBox="0 0 ' + W + ' ' + H + '" data-pts="' + pts + '" data-unit="' + esc(unit) + '" data-x0="' + first + '" data-span="' + span + '" role="img" aria-label="' + total + ' ' + esc(unit) + ' so far, climbing since ' + esc(prettyDate(ds[0])) + '">' +
    '<path d="' + area + '" fill="' + colour + '" opacity=".14"/><path d="' + path + '" fill="none" stroke="' + colour + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<circle cx="' + endX + '" cy="' + Y(total) + '" r="4.5" fill="' + colour + '" stroke="var(--paper)" stroke-width="2"/>' +
    '<text x="' + (endX + 8) + '" y="' + (Y(total) + 4) + '" class="endlbl">' + total + '</text>' +
    '<line x1="' + P + '" x2="' + (W - P - 30) + '" y1="' + (H - 18) + '" y2="' + (H - 18) + '" stroke="var(--line)"/>' +
    '<text x="' + P + '" y="' + (H - 4) + '" class="axlbl">' + esc(prettyDate(ds[0], { day: 'numeric', month: 'short' })) + '</text>' +
    '<text x="' + (W - P - 30) + '" y="' + (H - 4) + '" class="axlbl" text-anchor="end">now</text>' +
    '<line class="cross" x1="0" x2="0" y1="6" y2="' + (H - 18) + '" stroke="var(--ink-soft)" stroke-dasharray="2 3" opacity="0"/></svg><div class="readout" aria-live="polite"></div></div>';
}
// tap or drag across a hill to read it
export function wireHills(root) {
  const read = (svg, clientX) => {
    const r = svg.getBoundingClientRect(), x = (clientX - r.left) / r.width * 320;
    const x0 = Number(svg.dataset.x0), span = Number(svg.dataset.span);
    const t = x0 + Math.max(0, Math.min(1, (x - 8) / (320 - 16 - 30))) * span;
    let n = 0; svg.dataset.pts.split(';').forEach(p => { const [d, c] = p.split(','); if (parseKey(d).getTime() <= t) n = Number(c); });
    const line = svg.querySelector('.cross'); line.setAttribute('x1', x); line.setAttribute('x2', x); line.setAttribute('opacity', '1');
    svg.parentNode.querySelector('.readout').textContent = 'By ' + prettyDate(dateKey(new Date(t))) + ': ' + n + ' ' + svg.dataset.unit;
  };
  root.addEventListener('pointerdown', e => { const s = e.target.closest('svg.hill'); if (s) read(s, e.clientX); });
  root.addEventListener('pointermove', e => { const s = e.target.closest('svg.hill'); if (s && e.buttons) read(s, e.clientX); });
}

// ---------- the weather ribbon: your days as stripes of colour. Days you didn't log simply aren't there. ----------
export function ribbon(weather) {
  const byDay = {};
  weather.slice().sort((a, b) => a.ts - b.ts).forEach(w => { byDay[w.date] = (byDay[w.date] || []).concat(w.types); });
  const days = Object.keys(byDay).sort().slice(-60);
  if (days.length < 3) return '<p class="empty" style="margin:0">Log the weather inside on a few days and your ribbon starts weaving.</p>';
  const W = 320, H = 54, w = W / days.length;
  let rects = '';
  days.forEach((d, i) => {
    const types = Array.from(new Set(byDay[d])).slice(-2), h = H / types.length;
    types.forEach((t, j) => { rects += '<rect x="' + (i * w).toFixed(2) + '" y="' + (j * h).toFixed(2) + '" width="' + (w + 0.4).toFixed(2) + '" height="' + (h + 0.4).toFixed(2) + '" fill="' + (weatherByName(t) || [0, 0, '#ccc'])[2] + '" data-wx="' + esc(prettyDate(d) + ' · ' + types.join(' + ')) + '"/>'; });
  });
  return '<div class="chartwrap"><svg class="ribbon" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Your weather on the last ' + days.length + ' days you logged it">' + rects + '</svg><div class="readout" aria-live="polite">Tap a stripe to see that day.</div></div>';
}

// ---------- the rest clock: every rest laid on one 24-hour circle. It shows your pattern, never a score. ----------
export function restClock(rests) {
  const R = rests.filter(r => r.start && r.end && r.end > r.start).slice(-90);
  if (R.length < 3) return '<p class="empty" style="margin:0">Log a few rests and your clock fills in.</p>';
  const C = 80, rad = 58, ang = ts => { const d = new Date(ts); return ((d.getHours() + d.getMinutes() / 60) / 24) * Math.PI * 2 - Math.PI / 2; };
  const pt = a => [C + Math.cos(a) * rad, C + Math.sin(a) * rad];
  const arcs = R.map(r => {
    let a0 = ang(r.start), a1 = ang(r.end); if (a1 <= a0) a1 += Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0, [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    return '<path d="M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + rad + ' ' + rad + ' 0 ' + large + ' 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '" fill="none" stroke="#D9A400" stroke-width="14" opacity="' + Math.max(0.12, 0.6 / Math.sqrt(R.length)).toFixed(2) + '"/>';
  }).join('');
  const lbl = (t, a) => { const [x, y] = [C + Math.cos(a) * (rad + 18), C + Math.sin(a) * (rad + 18)]; return '<text x="' + x + '" y="' + (y + 4) + '" class="axlbl" text-anchor="middle">' + t + '</text>'; };
  return '<svg class="restclock" viewBox="-26 -6 212 172" role="img" aria-label="Your last ' + R.length + ' rests on a 24-hour clock">' +
    '<circle cx="' + C + '" cy="' + C + '" r="' + rad + '" fill="none" stroke="var(--line)" stroke-width="14"/>' + arcs +
    lbl('12am', -Math.PI / 2) + lbl('6am', 0) + lbl('12pm', Math.PI / 2) + lbl('6pm', Math.PI) + '</svg>';
}

// ---------- one gentle noticing, only when there's enough to go on, only ever kind ----------
const LIGHT = ['Clear sun', 'Golden hour', 'Partly cloudy', 'Rainbow', 'Clear night'];
export function noticing(st) {
  const light = {};
  st.weather.forEach(w => { const l = w.types.filter(t => LIGHT.includes(t)).length / w.types.length; light[w.date] = (light[w.date] || []).concat(l); });
  const days = Object.keys(light); if (days.length < 8) return null;
  const isLight = d => { const v = light[d]; return v.reduce((a, b) => a + b, 0) / v.length >= 0.5; };
  const cands = st.settings.tinyWins.map(w => [w.toLowerCase(), new Set(st.moments.filter(m => m.area === 'win' && m.text === w).map(m => m.date))])
    .concat([['moved your body', new Set(st.sessions.map(s => s.date))], ['cooked for yourself', new Set(st.foods.filter(f => f.tags.includes('Cooked it myself')).map(f => f.date))]]);
  let best = null;
  cands.forEach(([phrase, set]) => {
    const withD = days.filter(d => set.has(d)), without = days.filter(d => !set.has(d));
    if (withD.length < 4 || without.length < 4) return;
    const diff = withD.filter(isLight).length / withD.length - without.filter(isLight).length / without.length;
    if (diff >= 0.2 && (!best || diff > best[1])) best = [phrase, diff];
  });
  return best ? 'On days you ' + best[0] + ', your weather inside tended to be a little lighter.' : null;
}
