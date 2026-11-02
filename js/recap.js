// "Look what you did" (v81): a month's recap as an A4 portrait poster, the second print on Your wall. From page 14
// of Phavan's wireframes, in the same comic style as the planner, filled with the real month: the weather you
// carried, big numbers (only the ones above zero), the constellations that joined up, the month's quilt, three
// empty polaroid frames to stick real photos into (captions from your highlights and tiny wins), one tiny win,
// and that month's red phrase sticker. No character (Phavan). First version, to be iterated.
import { get, parseKey, dateKey } from './store.js';
import { weatherByName } from './data.js';
import { updateSky, starPos, mulberry32, hashStr } from './sky-model.js';
import { patches, drawQuiltMonth } from './screens/quilt.js';
import { SOURCES } from './goals.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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
    [(st.sessions || []).filter(s => inMonth(s.date, ym)).length, 'gym sessions', 'gym session'],
    [(st.activities || []).filter(a => inMonth(a.date, ym)).length, 'times you moved', 'time you moved'],
    [SOURCES.cooked.items(st).filter(ts => tsIn(ts, ym)).length, 'home-cooked meals', 'home-cooked meal'],
    [wins.length, 'tiny wins', 'tiny win'],
    [new Set((st.rests || []).filter(r => inMonth(r.date, ym)).map(r => r.date)).size, 'nights of rest', 'night of rest'],
    [(st.mind || []).filter(n => tsIn(n.letGo, ym)).length, 'lanterns let go', 'lantern let go']
  ].filter(t => t[0] > 0).slice(0, 5).map(t => [t[0], t[0] === 1 ? t[2] : t[1]]);
  // the sky: constellations that formed this month, and the month's new stars
  let sky = null; try { sky = updateSky(); } catch (e) { sky = st.sky; }
  const byId = Object.fromEntries(moments.map(m => [m.id, m]));
  const cons = ((sky && sky.clusters) || []).filter(c => c.con && (tsIn(c.con.formed, ym) || inMonth(c.to, ym)))
    .map(c => ({ name: c.con.name, edges: c.con.edges, stars: c.con.ids.filter(id => byId[id]).map(id => Object.assign({ id }, starPos(byId[id], c))) })).filter(c => c.stars.length >= 2).slice(-2);
  const newStars = moments.filter(m => inMonth(m.date, ym)).length;
  // the quilt
  const quilt = patches().filter(p => inMonth(p.date, ym));
  // captions for the photo frames: your highlights first, then tiny wins (hard-day ones first)
  const caps = [];
  (st.activities || []).filter(a => inMonth(a.date, ym) && a.hl && a.hl.trim()).sort((a, b) => a.date.localeCompare(b.date)).forEach(a => caps.push(a.hl.trim()));
  wins.slice().sort((a, b) => (b.bright ? 1 : 0) - (a.bright ? 1 : 0) || a.date.localeCompare(b.date)).forEach(m => { if (!caps.includes(m.text)) caps.push(m.text); });
  // the one tiny win at the bottom: a hard-day one if there is one, otherwise the latest
  const hard = wins.filter(m => m.bright || (st.heavy || {})[m.date]), pool = hard.length ? hard : wins;
  const win = pool.length ? pool.slice().sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts)[0] : null;
  return { weather, tally, tiles, cons, newStars, quilt, caps: caps.filter(c => !win || c !== win.text).slice(0, 3), win, soft: new Set(Object.keys(st.heavy || {})), any: weather.length + tiles.length + quilt.length + newStars > 0 };
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

export function drawRecap(ym, phrase) {
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
    g.textAlign = 'center'; const nf = fitFont(g, String(t[0]), BANG, 128, 70, tw - 40);
    g.font = '400 ' + nf + 'px ' + BANG; g.fillStyle = dark ? '#FFFFFF' : INK; g.fillText(String(t[0]), x + tw / 2, y + 150);
    wrapLines(g, t[1], '800 27px ' + BODY, tw - 30, 2).forEach((l, j) => { g.font = '800 27px ' + BODY; g.fillStyle = dark ? '#FFFFFF' : INK; g.fillText(l, x + tw / 2, y + 196 + j * 30); });
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
    const scratch = document.createElement('canvas').getContext('2d'), avail = ph - 120;
    let qw = pw - 60; const probe = drawQuiltMonth(scratch, 0, 0, qw, d.quilt, { current: false, now: 1e15, dpr: 2, still: true, soft: d.soft });
    if (probe.height > avail) qw = qw * avail / probe.height;
    const qh = drawQuiltMonth(scratch, 0, 0, qw, d.quilt, { current: false, now: 1e15, dpr: 2, still: true, soft: d.soft }).height;
    drawQuiltMonth(g, qx + (pw - qw) / 2, y + 86 + Math.max(0, (avail - qh) / 2), qw, d.quilt, { current: false, now: 1e15, dpr: 2, still: true, soft: d.soft });
  } else { g.font = '700 40px ' + HAND; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('Your quilt starts with', qx + pw / 2, y + 300); g.fillText('your first night of rest.', qx + pw / 2, y + 350); g.textAlign = 'left'; }

  // three polaroids to stick real photos into
  y = 1700; const fw = (W - 2 * M - 80) / 3, fh = 400, TILT = [-0.03, 0.02, -0.015];
  for (let i = 0; i < 3; i++) {
    const x = M + i * (fw + 40);
    g.save(); g.translate(x + fw / 2, y + fh / 2); g.rotate(TILT[i]); g.translate(-(x + fw / 2), -(y + fh / 2));
    box(g, x, y, fw, fh, '#FFFFFF', { shadow: 10, lw: 5, r: 3 });
    g.fillStyle = '#EDE3CC'; g.fillRect(x + 22, y + 22, fw - 44, fh - 130); g.strokeStyle = 'rgba(30,30,36,.35)'; g.lineWidth = 2; g.setLineDash([10, 10]); g.strokeRect(x + 22, y + 22, fw - 44, fh - 130); g.setLineDash([]);
    g.textAlign = 'center'; g.font = '800 24px ' + BODY; g.fillStyle = 'rgba(30,30,36,.45)'; g.fillText('your photo here', x + fw / 2, y + 22 + (fh - 130) / 2 + 8);
    const cap = d.caps[i];
    if (cap) wrapLines(g, cap, '800 26px ' + BODY, fw - 44, 2).forEach((l, j, a) => { g.font = '800 26px ' + BODY; g.fillStyle = INK; g.fillText(l, x + fw / 2, y + fh - (a.length === 2 ? 70 : 52) + j * 30); });
    else { g.strokeStyle = 'rgba(30,30,36,.35)'; g.lineWidth = 2; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(x + 40, y + fh - 48); g.lineTo(x + fw - 40, y + fh - 48); g.stroke(); g.setLineDash([]); }
    g.textAlign = 'left'; g.restore();
  }

  // a tiny win, and the month's red sticker
  y = 2150; const bw3 = W - 2 * M - 560;
  box(g, M, y, bw3, 150, '#FFFFFF');
  g.font = '400 40px ' + BANG; g.fillStyle = INK; g.fillText(d.win && (d.win.bright || d.soft.has(d.win.date)) ? 'A TINY WIN, ON A HARD DAY' : 'A TINY WIN', M + 28, y + 52);
  const wt = d.win ? d.win.text : 'You showed up this month. That counts.';
  g.font = '700 40px ' + HAND; g.fillStyle = INK; g.fillText(wrapLines(g, wt, '700 40px ' + HAND, bw3 - 56, 1)[0], M + 28, y + 112);
  const ph2 = phrase || ''; if (ph2) {
    g.save(); const sfs = fitFont(g, ph2, BANG, 52, 30, 440); const sw = g.measureText(ph2).width + 56, sh = sfs + 44;
    g.translate(W - M - 250, y + 80); g.rotate(-0.05); box(g, -sw / 2, -sh / 2, sw, sh, BLU, { shadow: 10, lw: 6, r: 3 });
    g.textAlign = 'center'; g.fillStyle = '#FFFFFF'; g.fillText(ph2, 0, sfs * 0.36); g.restore(); g.textAlign = 'left';
  }
  return c;
}
