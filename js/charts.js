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
// ---------- your last two weeks of nights (v61, replaces the rest clock) ----------
// One row per day, running from 6 pm the evening before to 6 pm that day (the same rows as the sleep diary).
// Sleep is a solid blue bar; a daytime rest (starting 9 am to 6 pm) is striped. Nothing depends on colour alone.
const minOfDay = ts => { const d = new Date(ts); return d.getHours() * 60 + d.getMinutes(); };
const ampm = m => { m = Math.round(m) % 1440; let h = Math.floor(m / 60); const mm = m % 60, ap = h < 12 ? 'am' : 'pm'; h = h % 12 || 12; return h + (mm ? ':' + String(mm).padStart(2, '0') : '') + ap; };
const med = a => { const s = a.slice().sort((x, y) => x - y), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
export function usualNight(rests) {
  const byDay = {}; rests.forEach(r => { (byDay[r.date] = byDay[r.date] || []).push(r); });
  const nights = Object.keys(byDay).map(d => byDay[d].filter(r => { const h = new Date(r.start).getHours(); return h >= 18 || h < 9; }).sort((a, b) => a.start - b.start)).filter(n => n.length);
  if (nights.length < 3) return null;
  const asleep = med(nights.map(n => { let m = minOfDay(n[0].start); if (m < 720) m += 1440; return m; })), up = med(nights.map(n => minOfDay(n[n.length - 1].end)));
  return { asleep: ampm(asleep), up: ampm(up) };
}
export function nightsChart(rests) {
  const t = today(), list = [];
  for (let i = 13; i >= 0; i--) { const d = dateKey(new Date(parseKey(t).getTime() - i * 86400000)); list.push(d); }
  const R = rests.filter(r => r.start && r.end && r.end > r.start && r.date >= list[0] && r.date <= t);
  if (R.length < 2) return '<p class="empty" style="margin:0">Log a few nights and they\'ll line up here.</p>';
  const usual = usualNight(R);
  const W = 340, lw = 58, x0 = lw, x1 = W - 8, rh = 17, top = 22, H = top + list.length * rh + 6;
  const X = f => x0 + (x1 - x0) * f;
  let svg = '<svg class="nights" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Your last two weeks of nights">' +
    '<defs><pattern id="napHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#C9D8FB"/><rect width="2.4" height="6" fill="#1F55D0"/></pattern></defs>';
  [['6pm', 0], ['12am', 0.25], ['6am', 0.5], ['12pm', 0.75], ['6pm', 1]].forEach(([l, f]) => {
    svg += '<text x="' + X(f).toFixed(1) + '" y="13" class="nlbl" text-anchor="' + (f === 0 ? 'start' : f === 1 ? 'end' : 'middle') + '">' + l + '</text>' +
      '<line x1="' + X(f).toFixed(1) + '" y1="' + (top - 3) + '" x2="' + X(f).toFixed(1) + '" y2="' + (H - 4) + '" class="ngrid' + (f === 0.25 ? ' mid' : '') + '"/>';
  });
  list.forEach((d, i) => {
    const y = top + i * rh, base = parseKey(d).getTime() - 6 * 3600000, dd = parseKey(d);
    if (i % 2 === 0) svg += '<rect x="0" y="' + y + '" width="' + W + '" height="' + rh + '" class="nband"/>';
    svg += '<text x="2" y="' + (y + rh * 0.72).toFixed(1) + '" class="nday">' + esc(d === t ? 'Today' : dd.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' })) + '</text>';
    R.filter(r => r.date === d).forEach(r => {
      const a = Math.max(0, (r.start - base) / 86400000), b = Math.min(1, (r.end - base) / 86400000); if (b <= a) return;
      const h = new Date(r.start).getHours(), nap = h >= 9 && h < 18;
      svg += '<rect x="' + X(a).toFixed(1) + '" y="' + (y + 3) + '" width="' + Math.max(4, X(b) - X(a)).toFixed(1) + '" height="' + (rh - 6) + '" rx="4" fill="' + (nap ? 'url(#napHatch)' : '#1F55D0') + '"' + (nap ? ' stroke="#1F55D0" stroke-width="1.2"' : '') + '/>';
    });
  });
  svg += '</svg>';
  return (usual ? '<p class="nsum">Usually asleep around <b>' + usual.asleep + '</b>, up around <b>' + usual.up + '</b>.</p>' : '') + svg +
    '<p class="nkey"><span class="k solid"></span>Sleep <span class="k striped"></span>Daytime rest</p>';
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
