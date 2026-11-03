// "Look what you did" (v81): a month's recap as an A4 portrait poster, the second print on Your wall. From page 14
// of Phavan's wireframes, in the same comic style as the planner, filled with the real month: the weather you
// carried, big numbers (only the ones above zero), the constellations that joined up, the month's quilt, three
// v84: "your month at a glance" (a little calendar: moved, soft days, rest), or, if you add photos in the app,
// polaroids with your photos printed in (photos are never saved), and that month's phrase sticker. At the bottom (v83): the month's soundtrack from On repeat, or else one of "your month's
// best bits" (a proud fact, not a feeling), or else nothing (the photos get taller). Tiny wins and letters stay in
// the app (Phavan: they're personal; a wall is public). No character. First version, to be iterated.
import { get, parseKey, dateKey } from './store.js';
import { weatherByName } from './data.js';
import { updateSky, starPos, mulberry32, hashStr } from './sky-model.js';
import { patches, drawPatch, goldStar } from './screens/quilt.js';
import { SOURCES } from './goals.js';
import { soundtrackOf } from './music.js';
import { drawTape } from './cards.js';
import { EXERCISES } from './data.js';
import { showNum, wu, isPlate } from './units.js';
import { actDef } from './activities.js';

// v88: what each activity is called on the recap ("12 badminton games"). Your own activities: just the name (v97; the big
// number already says how many, and "times: rock climbing" wrapped clumsily).
const ACT_WORD = { walk: ['walk', 'walks'], run: ['run', 'runs'], cycle: ['ride', 'rides'], swim: ['swim', 'swims'], hike: ['hike', 'hikes'],
  badminton: ['badminton game', 'badminton games'], football: ['football game', 'football games'], cricket: ['cricket game', 'cricket games'], tennis: ['tennis game', 'tennis games'],
  kickboxing: ['kickboxing round', 'kickboxing rounds'], mma: ['MMA round', 'MMA rounds'], yoga: ['yoga session', 'yoga sessions'], dance: ['dance class', 'dance classes'], home: ['home workout', 'home workouts'] };
export const actWord = (id, n) => { const w = ACT_WORD[id]; if (w) return w[n === 1 ? 0 : 1]; return actDef(id).n.toLowerCase(); };
// the moving tile: your most-done activity by name, and a small line for the rest
function movedTile(acts) {
  if (!acts.length) return [0];
  const by = {}; acts.forEach(a => { by[a.type] = (by[a.type] || 0) + 1; });
  const order = Object.keys(by).sort((a, b) => by[b] - by[a] || a.localeCompare(b)), top = order[0], rest = order.slice(1), more = acts.length - by[top];
  const sub = !rest.length ? '' : rest.length === 1 ? '+ ' + by[rest[0]] + ' ' + actWord(rest[0], by[rest[0]]) : '+ ' + more + ' more ' + (more === 1 ? 'time' : 'times') + ' you moved';
  return [by[top], actWord(top, by[top]), actWord(top, by[top]), sub];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// v90: a polaroid's photo window (416 wide; shorter when there's a box at the bottom), and which part of a photo
// shows in it: cx, cy = the middle of what shows (0 to 1 across the photo), z = zoom (1 = just fills the window)
export const photoWin = bottom => ({ w: 416, h: bottom ? 280 : 350 });
export function cropRect(iw, ih, ww, wh, cx = 0.5, cy = 0.5, z = 1) {
  const s = Math.max(ww / iw, wh / ih) * Math.max(1, z), sw = ww / s, sh = wh / s;
  return { sx: Math.min(Math.max(0, cx * iw - sw / 2), iw - sw), sy: Math.min(Math.max(0, cy * ih - sh / 2), ih - sh), sw, sh };
}
const W = 1654, H = 2339, M = 80, INK = '#1E1E24', CREAM = '#FDF3D6', YEL = '#F4C430', BLU = '#1F55D0', RED = '#E5452F', NAVY = '#161D3A';
const BANG = '"Bangers", "Impact", sans-serif', BODY = '"Nunito", system-ui, sans-serif', HAND = '"Gaegu", cursive';
const inMonth = (k, ym) => typeof k === 'string' && k.startsWith(ym);
const tsIn = (ts, ym) => !!ts && dateKey(new Date(ts)).startsWith(ym);

// everything the poster needs, from the month's data (also used by the page to show what will be on it)
export function recapData(ym) {
  const st = get(), moments = st.moments || [];
  // the weather: the last check-in of each day, in order
  const byDay = {}; (st.weather || []).filter(w => inMonth(w.date, ym)).sort((a, b) => a.ts - b.ts).forEach(w => { byDay[w.date] = w; });
  const weather = Object.keys(byDay).sort().map(d => byDay[d].types[0]).filter(Boolean);
  const tally = {}; weather.forEach(n => { tally[n] = (tally[n] || 0) + 1; });
  // the numbers, only above zero
  const wins = moments.filter(m => m.area === 'win' && inMonth(m.date, ym));
  const tiles = [
    [new Set((st.sessions || []).filter(s => inMonth(s.date, ym)).map(s => s.date)).size, 'rep days', 'rep day'], // v87: days at the gym (two workouts in a day are one rep day)
    movedTile((st.activities || []).filter(a => inMonth(a.date, ym))), // v88: named, with the rest on a small line
    [SOURCES.cooked.items(st).filter(ts => tsIn(ts, ym)).length, 'home-cooked meals', 'home-cooked meal'],
    [wins.length, 'tiny wins', 'tiny win'],
    [new Set((st.rests || []).filter(r => inMonth(r.date, ym)).map(r => r.date)).size, 'nights of rest', 'night of rest'],
    [(st.mind || []).filter(n => tsIn(n.letGo, ym)).length, 'lanterns let go', 'lantern let go']
  ].filter(t => t[0] > 0).slice(0, 5).map(t => [t[0], t[0] === 1 ? t[2] : t[1], t[3] || '']);
  // the sky: constellations that formed this month, and the month's new stars
  let sky = null; try { sky = updateSky(); } catch (e) { sky = st.sky; }
  const byId = Object.fromEntries(moments.map(m => [m.id, m]));
  const cons = ((sky && sky.clusters) || []).filter(c => c.con && (tsIn(c.con.formed, ym) || inMonth(c.to, ym)))
    .map(c => ({ name: c.con.name, edges: c.con.edges, stars: c.con.ids.filter(id => byId[id]).map(id => Object.assign({ id }, starPos(byId[id], c))) })).filter(c => c.stars.length >= 2).slice(-2);
  const newStars = moments.filter(m => inMonth(m.date, ym)).length;
  // the quilt
  const quilt = patches().filter(p => inMonth(p.date, ym));
  // caption suggestions for your photos: only your Move highlights (tiny wins stay in the app)
  const hls = [...new Set((st.activities || []).filter(a => inMonth(a.date, ym) && a.hl && a.hl.trim()).sort((a, b) => a.date.localeCompare(b.date)).map(a => a.hl.trim()))];
  // the month at a glance: each day you moved, each soft day, each night of rest
  const moved = new Set((st.sessions || []).map(s => s.date).concat((st.activities || []).map(a => a.date)).filter(d => inMonth(d, ym)));
  const rested = new Set((st.rests || []).map(r => r.date).filter(d => inMonth(d, ym)));
  const softDays = new Set(Object.keys(st.heavy || {}).filter(d => inMonth(d, ym)));
  // the bottom: the soundtrack, or else one best bit
  let snd = null; try { snd = soundtrackOf(ym); } catch (e) { snd = null; }
  return { weather, tally, tiles, cons, newStars, quilt, hls, moved, rested, softDays, snd, best: snd ? null : bestBit(st, ym, quilt), soft: new Set(Object.keys(st.heavy || {})), any: weather.length + tiles.length + quilt.length + newStars > 0 };
}

// "your month's best bits": one proud fact from the numbers, the first there is of: your heaviest lift, your
// longest rest, your most active week
const ordinal = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
const hm = h => { const m = Math.round(h * 60); return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' m' : ''); };
function bestBit(st, ym, quilt) {
  let top = null;
  (st.sessions || []).filter(s => inMonth(s.date, ym)).forEach(s => (s.exercises || []).forEach(x => {
    const e = EXERCISES[x.key] || (st.customExercises || {})[x.key] || {}; if ((e.t && e.t !== 'wr') || isPlate(x.key)) return;
    (x.sets || []).forEach(z => { const v = parseFloat(z.a); if (/^\d*\.?\d+$/.test(String(z.a)) && v > 0 && (!top || v > top.v)) top = { v, a: String(z.a), name: x.swap || x.name || e.n || 'lift' }; });
  }));
  if (top) return ['Heaviest lift', showNum(top.a) + ' ' + wu() + ', ' + top.name.toLowerCase()];
  const rest = quilt.slice().sort((a, b) => b.hours - a.hours)[0];
  if (rest && rest.hours >= 1) return ['Longest rest', hm(rest.hours) + ', on the ' + ordinal(Number(rest.date.slice(8)))];
  const days = [...new Set((st.sessions || []).map(s => s.date).concat((st.activities || []).map(a => a.date)).filter(d => inMonth(d, ym)))];
  const weeks = {}; days.forEach(d => { const t = parseKey(d), mon = new Date(t); mon.setDate(t.getDate() - (t.getDay() + 6) % 7); const k = dateKey(mon); weeks[k] = (weeks[k] || 0) + 1; });
  const wk = Object.keys(weeks).sort((a, b) => weeks[b] - weeks[a] || a.localeCompare(b))[0];
  if (wk && weeks[wk] >= 2) { const a = parseKey(wk), b = new Date(a); b.setDate(a.getDate() + 6); const S = d => d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); return ['Most active week', S(a) + ' to ' + S(b) + ', ' + weeks[wk] + ' days moving']; }
  return null;
}

// ---------- drawing helpers (the planner's comic kit) ----------
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function box(g, x, y, w, h, fill, o = {}) { const sh = o.shadow == null ? 12 : o.shadow, r = o.r == null ? 6 : o.r; if (sh) { g.fillStyle = INK; rr(g, x + sh, y + sh, w, h, r); g.fill(); } g.fillStyle = fill; rr(g, x, y, w, h, r); g.fill(); g.lineWidth = o.lw || 6; g.strokeStyle = INK; g.stroke(); }
function outlined(g, s, x, y, font, fill, ol, lw) { g.font = font; g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = ol; g.strokeText(s, x, y); g.fillStyle = fill; g.fillText(s, x, y); }
function wrapLines(g, s, font, maxW, maxL) {
  g.font = font; const out = []; let line = '';
  String(s).split(/\s+/).forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
  if (line) out.push(line);
  if (out.length > maxL) { const keep = out.slice(0, maxL); let last = keep[maxL - 1]; while (last.length > 1 && g.measureText(last + '…').width > maxW) last = last.slice(0, -1); keep[maxL - 1] = last + '…'; return keep; }
  return out;
}
function fitFont(g, s, family, start, min, maxW, weight = '400') { let fs = start; g.font = weight + ' ' + fs + 'px ' + family; while (g.measureText(s).width > maxW && fs > min) { fs -= 2; g.font = weight + ' ' + fs + 'px ' + family; } return fs; }
function panelTitle(g, s, x, y, col) { g.textAlign = 'left'; g.font = '400 50px ' + BANG; g.fillStyle = col || INK; g.fillText(s, x, y); }

// your month at a glance: a little comic calendar. A filled blue circle on days you moved, a gold star on soft days
// you got through, a small moon on nights you rested. Shapes, not only colours, with a legend in words.
function glance(g, d, ym, x, y, w, h) {
  box(g, x, y, w, h, '#FFFFFF');
  panelTitle(g, 'YOUR MONTH AT A GLANCE', x + 30, y + 62);
  const [yy, mm] = ym.split('-').map(Number), first = new Date(yy, mm - 1, 1), n = new Date(yy, mm, 0).getDate(), lead = (first.getDay() + 6) % 7, rows = Math.ceil((lead + n) / 7);
  const calW = w * 0.64, cx0 = x + 30, top = y + 92, cw = (calW - 30) / 7, ch = (h - 92 - 30 - 24) / rows;
  g.textAlign = 'center'; g.font = '800 20px ' + BODY; g.fillStyle = '#5E584B';
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((l, i) => g.fillText(l, cx0 + i * cw + cw / 2, top + 4));
  for (let day = 1; day <= n; day++) {
    const i = lead + day - 1, cx = cx0 + (i % 7) * cw + cw / 2, cy = top + 24 + Math.floor(i / 7) * ch + ch / 2, k = ym + '-' + String(day).padStart(2, '0'), r = Math.min(cw, ch) * 0.4;
    const mv = d.moved.has(k), sf = d.softDays.has(k), rs = d.rested.has(k);
    if (mv) { g.fillStyle = BLU; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); }
    g.font = '400 ' + Math.round(r * 1.05) + 'px ' + BANG; g.fillStyle = mv ? '#FFFFFF' : INK; g.fillText(String(day), cx, cy + r * 0.36);
    if (sf) smallStar(g, cx + r * 0.85, cy - r * 0.8, r * 0.48);
    if (rs) moon(g, cx + r * 0.9, cy + r * 0.78, r * 0.32);
  }
  // the legend, in words
  const lx = x + calW + 20, ly = top + 20, lr = 22; g.textAlign = 'left';
  const row = (k, draw, label, sub) => { const yy2 = ly + k * 92; draw(lx + lr, yy2 + lr); g.font = '800 28px ' + BODY; g.fillStyle = INK; g.fillText(label, lx + lr * 2 + 18, yy2 + lr + 4); if (sub) { g.font = '700 22px ' + BODY; g.fillStyle = '#5E584B'; g.fillText(sub, lx + lr * 2 + 18, yy2 + lr + 32); } };
  // only what happened gets a row (no zeros)
  let k = 0; const cnt = (v, one, many) => v + ' ' + (v === 1 ? one : many);
  if (d.moved.size) row(k++, (a, b) => { g.fillStyle = BLU; g.beginPath(); g.arc(a, b, lr, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); }, 'you moved', cnt(d.moved.size, 'day', 'days'));
  if (d.softDays.size) row(k++, (a, b) => smallStar(g, a, b, lr * 1.1), 'a soft day', 'you got through ' + cnt(d.softDays.size, 'of them', 'of them').replace(/^1 of them$/, 'one'));
  if (d.rested.size) row(k++, (a, b) => moon(g, a, b, lr * 0.85), 'a night of rest', cnt(d.rested.size, 'night', 'nights'));
}
function smallStar(g, cx, cy, R) { g.beginPath(); for (let q = 0; q < 10; q++) { const r = q % 2 ? R * 0.48 : R, an = -Math.PI / 2 + q * Math.PI / 5; g.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r); } g.closePath(); g.fillStyle = YEL; g.fill(); g.lineWidth = 2.5; g.lineJoin = 'round'; g.strokeStyle = INK; g.stroke(); }
function moon(g, cx, cy, R) { g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip(); g.fillStyle = '#4E77DE'; g.fillRect(cx - R, cy - R, 2 * R, 2 * R); g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(cx + R * 0.55, cy - R * 0.4, R * 0.82, 0, 7); g.fill(); g.restore(); }

export function drawRecap(ym, phrase, covers, photos) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const d = recapData(ym), [yy, mm] = ym.split('-').map(Number);
  g.fillStyle = CREAM; g.fillRect(0, 0, W, H);
  g.fillStyle = BLU; g.beginPath(); g.arc(W + 40, 120, 400, 0, 7); g.fill();
  g.fillStyle = YEL; g.beginPath(); g.arc(-60, H + 30, 330, 0, 7); g.fill();
  g.textBaseline = 'alphabetic';
  // the headline and its label
  const title = MONTHS[mm - 1].toUpperCase() + ' ' + yy, tfs = fitFont(g, title, BANG, 190, 120, W - 2 * M - 260);
  g.save(); g.translate(M, 250); g.rotate(-0.02);
  outlined(g, title, 9, 9, '400 ' + tfs + 'px ' + BANG, INK, INK, 18);
  outlined(g, title, 0, 0, '400 ' + tfs + 'px ' + BANG, INK, '#FFFFFF', 16);
  g.restore();
  g.save(); g.translate(M + 10, 290); g.rotate(-0.03);
  g.font = '400 62px ' + BANG; const lw = g.measureText('LOOK WHAT YOU DID').width + 56;
  box(g, 0, 0, lw, 88, RED, { shadow: 9, lw: 6, r: 2 }); g.fillStyle = '#FFFFFF'; g.fillText('LOOK WHAT YOU DID', 28, 66);
  g.restore();

  // the weather you carried
  let y = 440; box(g, M, y, W - 2 * M, 250, '#FFFFFF');
  panelTitle(g, 'THE WEATHER YOU CARRIED', M + 30, y + 66);
  if (d.weather.length) {
    const inner = W - 2 * M - 60, n = d.weather.length, gap = n > 24 ? 6 : 8, bw = Math.min(56, (inner - gap * (n - 1)) / n);
    d.weather.forEach((name, i) => { const w = weatherByName(name), x = M + 30 + i * (bw + gap); g.fillStyle = w ? w[2] : '#CCC'; rr(g, x, y + 92, bw, 78, 5); g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke(); });
    const words = Object.keys(d.tally).sort((a, b) => d.tally[b] - d.tally[a]).map(n => n.toLowerCase() + ' ' + d.tally[n]).join(' · ');
    const wl = wrapLines(g, words, '800 26px ' + BODY, W - 2 * M - 60, 2); g.font = '800 26px ' + BODY; g.fillStyle = INK; wl.forEach((l, j) => g.fillText(l, M + 30, y + (wl.length > 1 ? 206 : 218) + j * 30));
  } else { g.font = '700 40px ' + HAND; g.fillStyle = INK; g.fillText('No weather written down this month. Every day still counted.', M + 30, y + 150); }

  // the numbers
  y = 750; const tiles = d.tiles.length ? d.tiles : [[d.newStars || 1, d.newStars === 1 ? 'star in your sky' : 'stars in your sky']];
  const n = tiles.length, tg = 26, tw = (W - 2 * M - 14 - tg * (n - 1)) / n, FILLS = [YEL, '#FFFFFF', RED, '#FFFFFF', '#9FC0FF'];
  tiles.forEach((t, i) => {
    const x = M + i * (tw + tg), fill = FILLS[i % FILLS.length], dark = fill === RED;
    g.save(); g.translate(x + tw / 2, y + 125); g.rotate(i % 2 ? 0.015 : -0.015); g.translate(-(x + tw / 2), -(y + 125));
    box(g, x, y, tw, 250, fill, { shadow: 12 });
    g.textAlign = 'center'; const sub = t[2], nf = fitFont(g, String(t[0]), BANG, sub ? 110 : 128, 70, tw - 40);
    g.font = '400 ' + nf + 'px ' + BANG; g.fillStyle = dark ? '#FFFFFF' : INK; g.fillText(String(t[0]), x + tw / 2, y + (sub ? 122 : 150));
    const L = wrapLines(g, t[1], '800 27px ' + BODY, tw - 30, 2), ly0 = sub ? 162 : 196;
    L.forEach((l, j) => { g.font = '800 27px ' + BODY; g.fillStyle = dark ? '#FFFFFF' : INK; g.fillText(l, x + tw / 2, y + ly0 + j * 30); });
    if (sub) { // v88: the rest of how you moved, smaller
      // two lines of label leave room for one small line: it shrinks a little to fit whole, never cut
      let fs = 22; if (L.length > 1) { while (fs > 16) { g.font = '700 ' + fs + 'px ' + BODY; if (g.measureText(sub).width <= tw - 30) break; fs--; } }
      const S = L.length > 1 ? [sub] : wrapLines(g, sub, '700 22px ' + BODY, tw - 30, 2), sy = y + ly0 + L.length * 30 + 6;
      S.forEach((l, j) => { g.font = '700 ' + fs + 'px ' + BODY; g.fillStyle = dark ? '#FFE3DD' : '#5E584B'; g.fillText(l, x + tw / 2, sy + j * 25); });
    }
    g.restore();
  });
  g.textAlign = 'left';

  // stars that joined up, and this month's quilt
  y = 1070; const pw = (W - 2 * M - 40) / 2, ph = 560;
  box(g, M, y, pw, ph, NAVY);
  panelTitle(g, 'STARS THAT JOINED UP', M + 30, y + 66, YEL);
  const rnd = mulberry32(hashStr(ym)); g.fillStyle = 'rgba(255,248,225,.75)';
  for (let i = 0; i < 70; i++) { g.beginPath(); g.arc(M + 20 + rnd() * (pw - 40), y + 100 + rnd() * (ph - 130), 1.5 + rnd() * 2.5, 0, 7); g.fill(); }
  if (d.cons.length) {
    const slotW = pw / d.cons.length, COLS = ['#9FC0FF', YEL];
    d.cons.forEach((con, i) => {
      const xs = con.stars.map(s => s.x), ys = con.stars.map(s => s.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const bw2 = slotW - 90, bh = ph - 250, sc = Math.min(bw2 / Math.max(1, x1 - x0), bh / Math.max(1, y1 - y0), 2.4);
      const ox = M + i * slotW + 45 + (bw2 - (x1 - x0) * sc) / 2, oy = y + 120 + (i % 2 ? 40 : 0) + (bh - (y1 - y0) * sc) / 2;
      const P = s => [ox + (s.x - x0) * sc, oy + (s.y - y0) * sc], byId = Object.fromEntries(con.stars.map(s => [s.id, s]));
      g.strokeStyle = COLS[i % 2]; g.lineWidth = 5; g.lineCap = 'round';
      con.edges.forEach(([a, b]) => { if (!byId[a] || !byId[b]) return; const [ax, ay] = P(byId[a]), [bx, by] = P(byId[b]); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); });
      con.stars.forEach(s => { const [sx, sy] = P(s); g.fillStyle = COLS[i % 2]; g.beginPath(); g.arc(sx, sy, 11, 0, 7); g.fill(); });
      g.font = '700 40px ' + HAND; g.fillStyle = COLS[i % 2]; g.textAlign = 'center'; g.fillText(wrapLines(g, con.name, '700 40px ' + HAND, slotW - 30, 1)[0], M + i * slotW + slotW / 2, y + ph - 40);
    });
    g.textAlign = 'left';
  } else {
    g.textAlign = 'center'; g.font = '400 120px ' + BANG; g.fillStyle = YEL; g.fillText(String(d.newStars), M + pw / 2, y + 320);
    g.font = '700 44px ' + HAND; g.fillStyle = '#FFF4CC'; g.fillText(d.newStars === 1 ? 'new star in your sky' : 'new stars in your sky', M + pw / 2, y + 390); g.textAlign = 'left';
  }
  const qx = M + pw + 40; box(g, qx, y, pw, ph, '#FFFFFF');
  panelTitle(g, 'THIS MONTH’S QUILT', qx + 30, y + 66);
  if (d.quilt.length) {
    // v89: no rod and no binding: the patches fill the whole box under the white title strip, one per night, in date
    // order. The grid fits the count (rows of near-square patches; a row with fewer patches stretches them to close
    // the gap), so the box is always full. Stitches and soft days' gold stars stay.
    const top = y + 92, bx = qx + 2.5, bw = pw - 5, bh = ph - (top - y) - 2.5, n = d.quilt.length;
    const rows = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * bh / bw)))), base = Math.floor(n / rows), extra = n % rows, rh = bh / rows;
    g.save(); g.beginPath(); g.rect(bx, top, bw, bh); g.clip();
    let k = 0;
    for (let r = 0; r < rows; r++) {
      const cnt = base + (r < extra ? 1 : 0), cw = bw / cnt, py = top + r * rh;
      for (let c = 0; c < cnt; c++, k++) {
        const p = d.quilt[k], px = bx + c * cw;
        drawPatch(g, p, px, py, rh, 2, { w: cw, scale: Math.max(1, Math.min(cw, rh) / 110) });
        if (d.soft.has(p.date)) goldStar(g, px + cw - Math.min(cw, rh) * 0.2, py + Math.min(cw, rh) * 0.2, Math.min(cw, rh) * 0.13);
      }
    }
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(qx, top); g.lineTo(qx + pw, top); g.stroke(); // the strip's edge
    rr(g, qx, y, pw, ph, 6); g.stroke(); // the box's outline again, crisp over the patch edges
  } else { g.font = '700 40px ' + HAND; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('Your quilt starts with', qx + pw / 2, y + 300); g.fillText('your first night of rest.', qx + pw / 2, y + 350); g.textAlign = 'left'; }

  // your photos as polaroids, or else your month at a glance (taller when there's nothing for the bottom box)
  const bottom = d.snd || d.best, fh = bottom ? 400 : 470;
  y = 1700;
  const pics = (photos || []).filter(p => p && p.img).slice(0, 3);
  if (pics.length) {
    const n = pics.length, fw = Math.min(460, (W - 2 * M - 40 * 2) / 3), gap = 40, x0 = (W - (n * fw + (n - 1) * gap)) / 2, TILT = [-0.03, 0.02, -0.015];
    pics.forEach((p, i) => {
      const x = x0 + i * (fw + gap), ph = fh - 120;
      g.save(); g.translate(x + fw / 2, y + fh / 2); g.rotate(TILT[i]); g.translate(-(x + fw / 2), -(y + fh / 2));
      box(g, x, y, fw, fh, '#FFFFFF', { shadow: 10, lw: 5, r: 3 });
      // the photo, filling its window (cropped from the middle)
      const bw0 = fw - 44, cr = cropRect(p.img.width, p.img.height, bw0, ph, p.cx, p.cy, p.z); // v90: your framing
      g.drawImage(p.img, cr.sx, cr.sy, cr.sw, cr.sh, x + 22, y + 22, bw0, ph);
      g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x + 22, y + 22, bw0, ph);
      const cap = (p.cap || '').trim() || p.date || '';
      g.textAlign = 'center';
      if (cap) wrapLines(g, cap, '700 34px ' + HAND, fw - 44, 2).forEach((l, j, a) => { g.font = '700 34px ' + HAND; g.fillStyle = INK; g.fillText(l, x + fw / 2, y + fh - (a.length === 2 ? 64 : 42) + j * 36); });
      g.textAlign = 'left'; g.restore();
    });
  } else glance(g, d, ym, M, y, W - 2 * M, fh);

  // the bottom: the soundtrack, or one best bit, with the month's sticker beside it; or just the sticker, bigger
  const ph2 = phrase || '';
  if (bottom) {
    y = 2150; const bw3 = W - 2 * M - 560;
    box(g, M, y, bw3, 150, '#FFFFFF');
    if (d.snd) {
      const tw2 = 180; drawTape(g, M + 24, y + 13, tw2, d.snd, covers && covers[d.snd.id]);
      const tx = M + 24 + tw2 + 28, mw = bw3 - (tx - M) - 24;
      g.font = '400 36px ' + BANG; g.fillStyle = RED; g.fillText('THE SOUNDTRACK', tx, y + 46);
      g.font = '700 42px ' + HAND; g.fillStyle = INK; g.fillText(wrapLines(g, d.snd.title, '700 42px ' + HAND, mw, 1)[0], tx, y + 94);
      if (d.snd.artist) { g.font = '800 26px ' + BODY; g.fillStyle = '#5E584B'; g.fillText(wrapLines(g, d.snd.artist, '800 26px ' + BODY, mw, 1)[0], tx, y + 128); }
    } else {
      g.font = '400 40px ' + BANG; g.fillStyle = INK; g.fillText('YOUR MONTH\u2019S BEST BIT', M + 28, y + 52);
      g.font = '800 30px ' + BODY; g.fillStyle = BLU; const lab = d.best[0] + ': '; g.fillText(lab, M + 28, y + 110);
      const lw2 = g.measureText(lab).width; g.font = '700 42px ' + HAND; g.fillStyle = INK; g.fillText(wrapLines(g, d.best[1], '700 42px ' + HAND, bw3 - 56 - lw2, 1)[0], M + 28 + lw2, y + 110);
    }
    if (ph2) {
      g.save(); const sfs = fitFont(g, ph2, BANG, 52, 30, 440); const sw = g.measureText(ph2).width + 56, sh = sfs + 44;
      g.translate(W - M - 250, y + 80); g.rotate(-0.05); box(g, -sw / 2, -sh / 2, sw, sh, BLU, { shadow: 10, lw: 6, r: 3 });
      g.textAlign = 'center'; g.fillStyle = '#FFFFFF'; g.fillText(ph2, 0, sfs * 0.36); g.restore(); g.textAlign = 'left';
    }
  } else if (ph2) {
    g.save(); const sfs = fitFont(g, ph2, BANG, 70, 40, 900); const sw = g.measureText(ph2).width + 80, sh = sfs + 54;
    g.translate(W / 2, 2262); g.rotate(-0.03); box(g, -sw / 2, -sh / 2, sw, sh, BLU, { shadow: 12, lw: 6, r: 3 });
    g.textAlign = 'center'; g.fillStyle = '#FFFFFF'; g.fillText(ph2, 0, sfs * 0.36); g.restore(); g.textAlign = 'left';
  }
  return c;
}
