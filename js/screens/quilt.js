import { get, save, parseKey } from '../store.js';
import { esc, nav, backLink, him, hm, timeOf, reduceMotion, openSheet, FROM } from '../ui.js';
import { mulberry32, hashStr } from '../sky-model.js';
import { feelFamily, feelLabel } from '../data.js';

// ---------- fabrics: palette from how long you rested, pattern family from how it felt ----------
const COOL = [['#1F55D0', '#DCE7FF'], ['#8FB0D9', '#F1F5FC'], ['#6CC2B4', '#E2F4F1'], ['#B07CC6', '#F1E6F6'], ['#3C4A8A', '#E6E9F7']];
const MID = [['#1F55D0', '#FFF4CC'], ['#5DAE7E', '#E1F2E6'], ['#8FB0D9', '#FFF1DE'], ['#D96C8A', '#FBE3EA'], ['#23262F', '#F3EEDF'], ['#6CC2B4', '#FFF4CC']];
const WARM = [['#F4C430', '#FFF4CC'], ['#F2A65A', '#FFEBD6'], ['#E2402F', '#FFE1DA'], ['#D96C8A', '#FFF1DE'], ['#5DAE7E', '#FFF4CC'], ['#1F55D0', '#FFE7B8']];
const FEEL_PATTERNS = { rested: ['stars', 'flowers', 'dots', 'scallops', 'knots'], okay: ['stripes', 'checks', 'gingham', 'plaid', 'diamonds', 'crosses'], groggy: ['waves', 'zigzag', 'triangles', 'knots', 'stripes'] };
export const PAT = {
  stripes(g, s, a, b, r) { g.fillStyle = b; g.fillRect(0, 0, s, s); const ang = [0, 45, 90, 135][Math.floor(r() * 4)] * Math.PI / 180, w = 3 + r() * 5; g.save(); g.translate(s / 2, s / 2); g.rotate(ang); g.fillStyle = a; for (let x = -s; x < s; x += w * 2) g.fillRect(x, -s, w, s * 2); g.restore(); },
  dots(g, s, a, b, r) { g.fillStyle = b; g.fillRect(0, 0, s, s); const rad = 1.4 + r() * 1.8, sp = 7 + r() * 5; g.fillStyle = a; let row = 0; for (let y = 2; y < s + sp; y += sp, row++) for (let x = (row % 2) * sp / 2; x < s + sp; x += sp) { g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); } },
  checks(g, s, a, b, r) { const n = 3 + Math.floor(r() * 4), c = s / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * c, j * c, c + 0.5, c + 0.5); } },
  gingham(g, s, a, b, r) { g.fillStyle = b; g.fillRect(0, 0, s, s); const n = 4 + Math.floor(r() * 4), c = s / n; g.globalAlpha = 0.45; g.fillStyle = a; for (let i = 0; i < n; i += 2) { g.fillRect(i * c, 0, c, s); g.fillRect(0, i * c, s, c); } g.globalAlpha = 1; },
  plaid(g, s, a, b, r) { g.fillStyle = b; g.fillRect(0, 0, s, s); g.globalAlpha = 0.35; g.fillStyle = a; const o = r() * s; [0.15, 0.55].forEach(p => { g.fillRect((p * s + o) % s, 0, s * 0.18, s); g.fillRect(0, (p * s + o) % s, s, s * 0.18); }); g.globalAlpha = 0.8; g.fillRect((0.38 * s + o) % s, 0, 2, s); g.fillRect(0, (0.38 * s + o) % s, s, 2); g.globalAlpha = 1; },
  diamonds(g, s, a, b, r) { g.fillStyle = b; g.fillRect(0, 0, s, s); const n = 2 + Math.floor(r() * 2), c = s / n; g.fillStyle = a; for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const x = i * c, y = j * c; g.beginPath(); g.moveTo(x, y - c / 2.4); g.lineTo(x + c / 3, y); g.lineTo(x, y + c / 2.4); g.lineTo(x - c / 3, y); g.fill(); } },
  crosses(g, s, a, b, r) { g.fillStyle = b; g.fillRect(0, 0, s, s); const sp = 10 + r() * 5, k = 2.2; g.fillStyle = a; for (let y = sp / 2; y < s; y += sp) for (let x = sp / 2; x < s; x += sp) { g.fillRect(x - k * 1.6, y - k / 2, k * 3.2, k); g.fillRect(x - k / 2, y - k * 1.6, k, k * 3.2); } },
  stars(g, s, a, b, r) { g.fillStyle = b; g.fillRect(0, 0, s, s); g.fillStyle = a; const n = 5 + Math.floor(r() * 5); for (let i = 0; i < n; i++) { const x = r() * s, y = r() * s, R = 2.5 + r() * 3; g.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? R * 0.45 : R, an = k * Math.PI / 5 - Math.PI / 2; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } g.fill(); } },
  flowers(g, s, a, b, r) { g.fillStyle = b; g.fillRect(0, 0, s, s); const n = 3 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const x = r() * s, y = r() * s, R = 2 + r() * 2; g.fillStyle = a; for (let k = 0; k < 5; k++) { const an = k * 1.2566; g.beginPath(); g.arc(x + Math.cos(an) * R, y + Math.sin(an) * R, R * 0.8, 0, 7); g.fill(); } g.fillStyle = '#FFF4CC'; g.beginPath(); g.arc(x, y, R * 0.6, 0, 7); g.fill(); } },
  scallops(g, s, a, b, r) { g.fillStyle = b; g.fillRect(0, 0, s, s); const c = 9 + r() * 5; g.strokeStyle = a; g.lineWidth = 1.8; let row = 0; for (let y = 0; y < s + c; y += c / 2, row++) for (let x = (row % 2) * c / 2; x < s + c; x += c) { g.beginPath(); g.arc(x, y, c / 2, 0, Math.PI); g.stroke(); } },
  knots(g, s, a, b, r) { g.fillStyle = b; g.fillRect(0, 0, s, s); g.fillStyle = a; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(r() * s, r() * s, 0.8 + r() * 1.2, 0, 7); g.fill(); } },
  waves(g, s, a, b, r) { g.fillStyle = b; g.fillRect(0, 0, s, s); g.strokeStyle = a; g.lineWidth = 1.6 + r() * 1.4; const sp = 7 + r() * 4, amp = 1.5 + r() * 2.5, f = 0.2 + r() * 0.25; for (let y = 3; y < s + sp; y += sp) { g.beginPath(); for (let x = 0; x <= s; x += 2) g.lineTo(x, y + Math.sin(x * f) * amp); g.stroke(); } },
  zigzag(g, s, a, b, r) { g.fillStyle = b; g.fillRect(0, 0, s, s); g.strokeStyle = a; g.lineWidth = 2 + r() * 1.5; g.lineJoin = 'round'; const sp = 8 + r() * 4, w = 5 + r() * 3; for (let y = 2; y < s + sp; y += sp) { g.beginPath(); for (let x = -w, up = 0; x <= s + w; x += w, up ^= 1) g.lineTo(x, y + (up ? -w / 2 : w / 2)); g.stroke(); } },
  triangles(g, s, a, b, r) { const n = 2 + Math.floor(r() * 2), c = s / n; g.fillStyle = b; g.fillRect(0, 0, s, s); g.fillStyle = a; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.beginPath(); if ((i + j) % 2) { g.moveTo(i * c, j * c); g.lineTo(i * c + c, j * c); g.lineTo(i * c, j * c + c); } else { g.moveTo(i * c + c, j * c); g.lineTo(i * c + c, j * c + c); g.lineTo(i * c, j * c + c); } g.fill(); } }
};
function fabricFor(r, hours, feel) {
  const pal = hours < 6 ? COOL : hours >= 8 ? WARM : MID;
  const [a, b] = pal[Math.floor(r() * pal.length)], pats = FEEL_PATTERNS[feelFamily(feel)];
  return { a, b, pat: pats[Math.floor(r() * pats.length)], seed: Math.floor(r() * 1e9) };
}

// one patch per day of rest
export function patches() {
  const byDay = {};
  get().rests.forEach(r => { (byDay[r.date] = byDay[r.date] || []).push(r); });
  return Object.keys(byDay).sort().map(date => {
    const rests = byDay[date].sort((a, b) => a.start - b.start);
    const isNap = r => { const h = new Date(r.start).getHours(); return (r.end - r.start) < 120 * 60000 && h >= 11 && h < 20; };
    const main = rests.filter(r => !isNap(r)), naps = rests.filter(isNap);
    const hours = rests.reduce((n, r) => n + (r.end - r.start), 0) / 3600000;
    const feel = (rests.find(r => r.feel) || {}).feel || 'okay', words = (rests.find(r => r.words) || {}).words || '';
    const pr = mulberry32(hashStr(date + '|' + rests.length + '|' + feel));
    const f0 = fabricFor(pr, hours, feel); let f1 = fabricFor(pr, hours, feel);
    if (f1.a === f0.a && f1.pat === f0.pat) f1 = fabricFor(pr, hours, feel);
    return { date, rests, main, naps, parts: Math.max(1, Math.min(2, main.length)), hours, feel, words, fabrics: [f0, f1], split: pr() < 0.5 ? 'diag' : 'vert', button: ['#E2402F', '#1F55D0', '#F4C430', '#5DAE7E'][Math.floor(pr() * 4)] };
  });
}


// ---------- one quilt per month, drawn like a real handmade thing ----------
export const QCOLS = 5;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthLabel = ym => { const [y, m] = ym.split('-').map(Number); return MONTHS[m - 1] + ' ' + y; };
export const monthName = ym => MONTHS[Number(ym.split('-')[1]) - 1];
const dayWords = k => { const d = parseKey(k); return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate(); };
const thisYM = () => { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0'); };
export function byMonth() {
  const out = {}; patches().forEach(p => { (out[p.date.slice(0, 7)] = out[p.date.slice(0, 7)] || []).push(p); });
  return out;
}

let linen = null;
function linenTex() { // a fine woven texture, made once
  if (linen) return linen;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = mulberry32(5);
  for (let i = 0; i < 64; i += 2) { g.fillStyle = 'rgba(255,255,255,' + (0.03 + r() * 0.04) + ')'; g.fillRect(0, i, 64, 0.6); g.fillStyle = 'rgba(0,0,0,' + (0.02 + r() * 0.03) + ')'; g.fillRect(i, 0, 0.6, 64); }
  return (linen = c);
}
const rrect = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const run = (g, path, colour, w, dash) => { g.save(); g.setLineDash(dash || [3.5, 3]); g.strokeStyle = colour; g.lineWidth = w || 1.3; g.lineCap = 'round'; path(); g.stroke(); g.restore(); };

// fabric tile, cached
const tiles = new Map();
export function tileFor(f, size, dpr, scale) {
  const key = f.seed + '|' + f.pat + '|' + f.a + '|' + Math.round(size * dpr) + '|' + (scale || 1); if (tiles.has(key)) return tiles.get(key);
  const c = document.createElement('canvas'); c.width = c.height = Math.ceil(size * dpr);
  const k = scale || 1, g = c.getContext('2d'); g.scale(dpr * k, dpr * k); PAT[f.pat](g, size / k, f.a, f.b, mulberry32(f.seed)); // same pattern scale at any size
  if (tiles.size > 400) tiles.clear(); tiles.set(key, c); return c;
}

// draw one patch at x,y,S (front side)
export function drawPatch(g, d, x, y, S, dpr, opts = {}) {
  let w = opts.w || S, h = S; // a patch can be wider than tall when a quilt needs it to fit
  const big = Math.max(w, h), sc = opts.scale || 1, t0 = tileFor(d.fabrics[0], big, dpr, sc);
  g.fillStyle = 'rgba(35,30,25,0.35)'; g.fillRect(x, y, w, h);
  x += 0.75; y += 0.75; w -= 1.5; h -= 1.5;
  g.save(); rrect(g, x, y, w, h, 3); g.clip();
  if (d.parts === 1) g.drawImage(t0, x, y, big, big);
  else {
    const t1 = tileFor(d.fabrics[1], big, dpr, sc);
    g.save(); g.beginPath(); if (d.split === 'diag') { g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x, y + h); } else g.rect(x, y, w / 2, h); g.clip(); g.drawImage(t0, x, y, big, big); g.restore();
    g.save(); g.beginPath(); if (d.split === 'diag') { g.moveTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); } else g.rect(x + w / 2, y, w / 2, h); g.clip(); g.drawImage(t1, x, y, big, big); g.restore();
  }
  // linen weave + a soft puffy light, like a stuffed square
  g.globalAlpha = 0.7; g.fillStyle = g.createPattern(linenTex(), 'repeat'); g.fillRect(x, y, w, h); g.globalAlpha = 1;
  const puff = g.createRadialGradient(x + w * 0.38, y + h * 0.34, Math.min(w, h) * 0.08, x + w / 2, y + h / 2, Math.max(w, h) * 0.78);
  puff.addColorStop(0, 'rgba(255,255,255,0.12)'); puff.addColorStop(0.55, 'rgba(255,255,255,0)'); puff.addColorStop(1, 'rgba(40,30,20,0.26)');
  g.fillStyle = puff; g.fillRect(x, y, w, h);
  g.restore();
  if (d.parts === 2) { const seam = opts.seam == null ? 1 : opts.seam; run(g, () => { g.beginPath(); if (d.split === 'diag') { g.moveTo(x + w, y); g.lineTo(x + w - w * seam, y + h * seam); } else { g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h * seam); } }, 'rgba(255,255,255,0.95)', 1.6); }
  run(g, () => { g.beginPath(); g.rect(x + 4, y + 4, w - 8, h - 8); }, 'rgba(255,255,255,0.8)', 1.2, [3, 3]);
  if (d.naps.length) { // a little sewn-on button
    const br = Math.max(4.5, Math.min(w, h) * 0.08), bx = x + w - 7 - br, by = y + h - 7 - br;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(bx + 1, by + 1.5, br, 0, 7); g.fill();
    g.fillStyle = d.button; g.beginPath(); g.arc(bx, by, br, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { g.beginPath(); g.arc(bx + a * br * 0.32, by + b * br * 0.32, br * 0.16, 0, 7); g.fill(); });
  }
}
// a finished month is always a whole quilt: pick a grid that fits, and let a few patches be double-wide to close any gaps
export function fullLayout(n) {
  if (n <= 0) return { cols: 1, rows: 1, cells: [] };
  let best = null;
  for (let C = 1; C <= 5; C++) {
    const R = Math.ceil(n / C), L = R * C - n;
    if (C > n || (L > R * Math.floor(C / 2))) continue;
    const score = L * 2 + Math.abs(R - C) * 1.5 + (C < 3 && n > 4 ? 4 : 0) + (C === 1 && n > 1 ? 5 : 0);
    if (!best || score < best.score) best = { C, R, L, score };
  }
  const { C, R, L } = best, dbl = new Array(R).fill(0);
  for (let k = 0; k < L; k++) { let r = Math.floor((k + 0.5) * R / L) % R; while (dbl[r] >= Math.floor(C / 2)) r = (r + 1) % R; dbl[r]++; }
  const cells = [];
  for (let r = 0; r < R; r++) {
    const m = C - dbl[r], wide = new Set(); for (let t = 0; t < dbl[r]; t++) wide.add((Math.floor((t + 0.5) * m / dbl[r]) + r) % m);
    let col = 0; for (let k = 0; k < m; k++) { const span = wide.has(k) ? 2 : 1; cells.push({ col, row: r, span }); col += span; }
  }
  return { cols: C, rows: R, cells };
}
function needle(g, cx, cy, S) {
  g.save(); g.translate(cx, cy); g.rotate(-0.7);
  g.strokeStyle = '#E2402F'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(S * 0.28, -2); g.bezierCurveTo(S * 0.5, -S * 0.3, S * 0.1, -S * 0.45, -S * 0.05, -S * 0.2); g.stroke(); // thread
  g.fillStyle = '#C9CED8'; g.strokeStyle = '#5C6272'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(-S * 0.32, 0); g.lineTo(S * 0.28, -2.2); g.lineTo(S * 0.3, 0); g.lineTo(S * 0.28, 2.2); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#FAF3DC'; g.beginPath(); g.ellipse(S * 0.22, 0, 3, 1.1, 0, 0, 7); g.fill();
  g.restore();
}

// the whole hanging quilt for one month. Returns where each patch sits.
export function drawQuiltMonth(g, x, y, w, list, o = {}) {
  const full = !o.current && list.length ? fullLayout(list.length) : null;
  const cols = full ? full.cols : (o.cols || QCOLS), rows = full ? full.rows : Math.max(1, Math.ceil((list.length + (o.current ? 1 : 0)) / cols));
  const B = Math.max(10, w * 0.035), rodY = y + 14, top = y + 34, S = (w - B * 2) / cols, H = rows * S + B * 2, dpr = o.dpr || 1, now = o.now || 0;
  // the drape shadow
  g.save(); g.fillStyle = 'rgba(30,20,10,0.18)'; g.filter = 'blur(10px)'; rrect(g, x + 8, top + 14, w - 6, H, 14); g.fill(); g.restore();
  // loops that hold it on the rod
  [0.18, 0.5, 0.82].forEach(p => { const lx = x + w * p; g.fillStyle = o.binding || '#1F55D0'; rrect(g, lx - 9, rodY - 4, 18, top - rodY + 14, 6); g.fill(); run(g, () => { g.beginPath(); g.moveTo(lx - 5, rodY + 2); g.lineTo(lx - 5, top + 6); g.moveTo(lx + 5, rodY + 2); g.lineTo(lx + 5, top + 6); }, 'rgba(255,255,255,.7)', 1, [2, 2.5]); });
  // binding (the edge of the quilt)
  g.fillStyle = o.binding || '#1F55D0'; rrect(g, x, top, w, H, 12); g.fill();
  // backing fabric where patches are still to come
  g.fillStyle = o.backing || '#F4EAD2'; g.fillRect(x + B, top + B, w - B * 2, rows * S);
  g.save(); g.globalAlpha = 0.5; g.fillStyle = g.createPattern(linenTex(), 'repeat'); g.fillRect(x + B, top + B, w - B * 2, rows * S); g.restore();
  if (!full) for (let i = list.length; i < rows * cols; i++) { const px = x + B + (i % cols) * S, py = top + B + Math.floor(i / cols) * S; run(g, () => { g.beginPath(); g.rect(px + 5, py + 5, S - 10, S - 10); }, 'rgba(120,100,70,0.22)', 1, [2, 4]); }
  // blanket stitch around the edge
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.2; g.lineCap = 'round';
  const per = 15, ix = x + B * 0.45, iy = top + B * 0.45, iw = w - B * 0.9, ih = H - B * 0.9;
  rrect(g, ix, iy, iw, ih, 8); g.stroke();
  for (let px = ix + 8; px < ix + iw - 6; px += per) { g.beginPath(); g.moveTo(px, iy); g.lineTo(px, iy + B * 0.38); g.moveTo(px, iy + ih); g.lineTo(px, iy + ih - B * 0.38); g.stroke(); }
  for (let py = iy + 8; py < iy + ih - 6; py += per) { g.beginPath(); g.moveTo(ix, py); g.lineTo(ix + B * 0.38, py); g.moveTo(ix + iw, py); g.lineTo(ix + iw - B * 0.38, py); g.stroke(); }
  g.restore();
  // patches
  const spots = [];
  let busy = false;
  list.forEach((d, i) => {
    const cell = full ? full.cells[i] : { col: i % cols, row: Math.floor(i / cols), span: 1 };
    const px = x + B + cell.col * S, py = top + B + cell.row * S, pw = S * cell.span, age = now - (d.born == null ? -1e9 : d.born);
    spots.push({ d, x: px, y: py, S, w: pw });
    if (o.hide === d.date) return;
    g.save();
    if (age < 0) { busy = true; g.restore(); return; }
    const t = Math.min(1, age / 700), e = 1 - Math.pow(1 - t, 3); if (age < 2400) busy = true;
    if (t < 1) { g.globalAlpha = e; g.translate(px + pw / 2, py + S / 2); g.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e); g.translate(-(px + pw / 2), -(py + S / 2)); }
    drawPatch(g, d, px, py, S, dpr, { w: pw, scale: Math.max(1, w / 340), seam: age < 2200 ? Math.max(0, Math.min(1, (age - 600) / 1200)) : 1 });
    if (o.soft && o.soft.has(d.date)) { // a gentle shimmer on soft days
      busy = busy || !o.still;
      const tw = o.still ? 0.8 : 0.5 + 0.5 * Math.sin(now / 600 + i);
      [[0.25, 0.3, 1], [0.72, 0.62, 0.7], [0.4, 0.78, 0.55]].forEach(([a, b, k]) => { const sx = px + pw * a, sy = py + S * b, R = S * 0.07 * k * (0.6 + tw * 0.6); g.fillStyle = 'rgba(255,255,255,' + (0.55 + 0.45 * tw) + ')'; g.beginPath(); for (let q = 0; q < 8; q++) { const rr2 = q % 2 ? R * 0.28 : R, an = q * Math.PI / 4; g.lineTo(sx + Math.cos(an) * rr2, sy + Math.sin(an) * rr2); } g.closePath(); g.fill(); });
    }
    g.restore();
  });
  // the needle waits where the next patch will go
  if (o.current && list.length < rows * cols) { const i = list.length; needle(g, x + B + (i % cols) * S + S / 2, top + B + Math.floor(i / cols) * S + S / 2, S); }
  // soft light across the whole quilt
  const sheen = g.createLinearGradient(x, top, x + w, top + H); sheen.addColorStop(0, 'rgba(255,255,255,0.10)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(30,20,10,0.10)');
  g.save(); rrect(g, x, top, w, H, 12); g.clip(); g.fillStyle = sheen; g.fillRect(x, top, w, H); g.restore();
  // the wooden rod, on top
  const rg = g.createLinearGradient(0, rodY - 5, 0, rodY + 5); rg.addColorStop(0, '#C99A63'); rg.addColorStop(1, '#8A5F35');
  g.fillStyle = rg; rrect(g, x - 16, rodY - 5, w + 32, 10, 5); g.fill();
  g.fillStyle = '#7A522C'; [x - 18, x + w + 18].forEach(cx => { g.beginPath(); g.arc(cx, rodY, 8, 0, 7); g.fill(); });
  return { spots, height: top - y + H + 26, B, S, top, busy, careAt: { x: x + w + 4, y: top + H + 6 } };
}

// a folded quilt for the shelf
function drawFolded(g, w, h, list) {
  const f = list.slice(0, 4).map(p => p.fabrics[0]);
  for (let k = 3; k >= 0; k--) {
    const fy = h - 18 - k * 9, fx = 6 + k * 2, fw = w - 12 - k * 4, fh = 16;
    const fab = f[k % f.length] || { a: '#1F55D0', b: '#DCE7FF', pat: 'dots', seed: k };
    g.save(); rrect(g, fx, fy - fh + 10, fw, fh, 6); g.clip(); PAT[fab.pat](g, Math.max(fw, 60), fab.a, fab.b, mulberry32(fab.seed)); g.restore();
    g.strokeStyle = 'rgba(35,38,47,.35)'; g.lineWidth = 1; rrect(g, fx, fy - fh + 10, fw, fh, 6); g.stroke();
    run(g, () => { g.beginPath(); g.moveTo(fx + 6, fy + 4); g.lineTo(fx + fw - 6, fy + 4); }, 'rgba(255,255,255,.85)', 1, [2, 2]);
  }
}

let raf = 0, view = null;
export function unmount() { cancelAnimationFrame(raf); raf = 0; }

export function mount(root, params = {}) {
  const st = get(), months = byMonth(), cur = thisYM();
  const keys = Array.from(new Set(Object.keys(months).concat([cur]))).sort();
  if (!view || !keys.includes(view)) view = keys.includes(params.m) ? params.m : cur;
  // patches that are new since you last looked get sewn in
  const seen = new Set(st.quiltSeen || []), firstVisit = !st.quiltSeen;
  st.quiltSeen = patches().map(p => p.date); save();
  const t0 = performance.now();
  Object.values(months).forEach(l => l.forEach((p, i) => { p.born = !firstVisit && !seen.has(p.date) ? t0 + 300 + i * 0 : -1e9; }));
  const soft = new Set(Object.keys(st.heavy || {}));
  let flipped = null;

  const render = () => {
    const list = months[view] || [], i = keys.indexOf(view), isCur = view === cur, n = list.length;
    const line = n ? (isCur ? n + (n === 1 ? ' night' : ' nights') + ' sewn into ' + monthName(view) + '.' : monthName(view) + ': ' + n + (n === 1 ? ' night' : ' nights') + ', all sewn in.') : monthName(view) + '\'s quilt is waiting for its first patch.';
    const past = keys.filter(k => k !== cur && months[k] && months[k].length).reverse();
    root.innerHTML =
      '<div class="top">' + backLink.apply(null, FROM[params.from] || FROM.rest) + '</div>' +
      '<div class="hero qhero">' + him('sewing', 'breathe', 'Your character sewing a patch onto his quilt') + '<div class="txt"><h1>Your quilt</h1><p class="say">Every rest is a patch, sewn in by hand.</p></div></div>' +
      '<div class="qnav"><button type="button" data-mstep="-1" aria-label="Earlier month"' + (i <= 0 ? ' disabled' : '') + '>‹</button><b>' + esc(monthLabel(view)) + '</b><button type="button" data-mstep="1" aria-label="Later month"' + (i >= keys.length - 1 ? ' disabled' : '') + '>›</button></div>' +
      '<p class="qline">' + esc(line) + '</p>' +
      '<div class="qwrap"><canvas id="quilt" aria-label="Your quilt for ' + esc(monthLabel(view)) + '. Each patch is a day of rest. Tap one to read its label."></canvas>' +
        '<button type="button" class="care" data-care aria-label="How to read your quilt"><span>care<br>label</span></button><div class="flip" id="flip" hidden></div></div>' +
      (past.length ? '<div class="lbl">Finished quilts</div><div class="qshelf">' + past.map(k => '<button type="button" class="folded' + (k === view ? ' on' : '') + '" data-month="' + k + '"><canvas width="180" height="96" data-fold="' + k + '"></canvas><b>' + esc(monthName(k)) + '</b><small>' + months[k].length + (months[k].length === 1 ? ' night' : ' nights') + '</small></button>').join('') + '</div>' : '') +
      '<a class="sharecta" href="#/share?t=quilt&m=' + view + '&from=quilt&qf=' + (params.from || 'rest') + '"><span><b>Share this quilt</b><small>A story-sized picture of ' + esc(monthName(view)) + '</small></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg></a>' +
      nav('home');
    root.querySelectorAll('[data-fold]').forEach(c => drawFolded(c.getContext('2d'), c.width, c.height, months[c.dataset.fold]));
    paint();
  };

  let layout = null;
  const paint = () => {
    cancelAnimationFrame(raf);
    const cv = root.querySelector('#quilt'); if (!cv) return;
    const list = months[view] || [], dpr = Math.min(window.devicePixelRatio || 1, 2), W = cv.clientWidth || 360;
    const probe = drawQuiltMonth(document.createElement('canvas').getContext('2d'), 22, 0, W - 44, list, { current: view === cur, now: -1e12 });
    const H = probe.height; cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    const g = cv.getContext('2d');
    const frame = now => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      layout = drawQuiltMonth(g, 22, 0, W - 44, list, { current: view === cur, now, dpr, soft, still: reduceMotion, hide: flipped && flipped.d.date });
      const care = root.querySelector('.care'); if (care) { care.style.left = (layout.careAt.x - 46) + 'px'; care.style.top = (layout.careAt.y - 30) + 'px'; }
      raf = layout.busy ? requestAnimationFrame(frame) : 0;
    };
    raf = requestAnimationFrame(frame);
  };

  // tap a patch: it lifts and flips over to show its label
  const flipTo = spot => {
    const box = root.querySelector('#flip'), wrap = root.querySelector('.qwrap');
    if (!spot) { if (flipped) { box.classList.remove('open'); setTimeout(() => { box.hidden = true; flipped = null; paint(); }, 380); } return; }
    flipped = spot;
    const d = spot.d, mins = Math.round(d.hours * 60);
    const fc = document.createElement('canvas'), dpr = 2; fc.width = spot.w * dpr; fc.height = spot.S * dpr; const fg = fc.getContext('2d'); fg.scale(dpr, dpr); drawPatch(fg, d, 0, 0, spot.S, dpr, { w: spot.w });
    const lw = Math.min(wrap.clientWidth - 30, 300), lh = 200;
    const cx = Math.max(10, Math.min(wrap.clientWidth - lw - 10, spot.x + spot.w / 2 - lw / 2)), cy = Math.max(10, spot.y + spot.S / 2 - lh / 2);
    box.style.setProperty('--fx', (spot.x - cx) + 'px'); box.style.setProperty('--fy', (spot.y - cy) + 'px'); box.style.setProperty('--fs', String(spot.w / lw)); box.style.setProperty('--fsy', String(spot.S / lh));
    box.style.left = cx + 'px'; box.style.top = cy + 'px'; box.style.width = lw + 'px'; box.style.height = lh + 'px';
    box.innerHTML = '<div class="flipin"><div class="face front"></div><div class="face back"><small>' + esc(dayWords(d.date)) + '</small><b>Rested ' + esc(hm(mins)) + (d.main.length > 1 ? ', in ' + d.main.length + ' parts' : '') + (d.naps.length ? ' + a nap' : '') + '</b><p>' + esc(d.rests.map(r => timeOf(r.start) + ' to ' + timeOf(r.end)).join(', then ')) + '</p><p>Felt ' + esc(feelLabel(d.feel).toLowerCase()) + '.' + (d.words ? ' “' + esc(d.words) + '”' : '') + (soft.has(d.date) ? ' A soft day, and you still rested.' : '') + (d.parts === 2 ? ' Two halves, stitched into one.' : '') + '</p></div></div>';
    box.querySelector('.front').style.backgroundImage = 'url(' + fc.toDataURL() + ')';
    box.hidden = false; box.classList.remove('open'); void box.offsetWidth;
    paint(); requestAnimationFrame(() => box.classList.add('open'));
  };

  render();
  root.addEventListener('click', e => {
    const t = e.target; let b;
    if ((b = t.closest('[data-mstep]'))) { const i = keys.indexOf(view) + Number(b.dataset.mstep); if (keys[i]) { view = keys[i]; flipped = null; render(); } return; }
    if ((b = t.closest('[data-month]'))) { view = b.dataset.month; flipped = null; render(); root.querySelector('.qnav').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); return; }
    if (t.closest('[data-care]')) { careSheet(); return; }
    if (t.closest('#flip')) { flipTo(null); return; }
    if (t.id === 'quilt' && layout) {
      const r = t.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const s = layout.spots.find(p => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.S);
      if (flipped) { flipTo(null); return; }
      if (s) flipTo(s);
    }
  });
  // swipe between months
  let sx = null, sy = 0;
  root.addEventListener('touchstart', e => { if (!e.target.closest('.qwrap')) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  root.addEventListener('touchend', e => {
    if (sx == null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { const i = keys.indexOf(view) + (dx < 0 ? 1 : -1); if (keys[i]) { view = keys[i]; flipped = null; render(); } }
  });
  window.addEventListener('resize', () => { if (root.isConnected) paint(); }, { once: true });
}

function careSheet() {
  openSheet('<div class="carelabel"><h2>Care label</h2><p class="muted">How to read your quilt</p>' +
    '<dl><dt>Each patch</dt><dd>One day you rested.</dd>' +
    '<dt>The colours</dt><dd>Cool blues and lilacs for shorter rest, in-between colours for a middling night, warm sunny ones for a full night.</dd>' +
    '<dt>The pattern</dt><dd>How you woke up. Stars, flowers and dots: refreshed or rested. Stripes, checks and plaid: okay or tired. Waves and zigzags: groggy or restless.</dd>' +
    '<dt>Two halves stitched together</dt><dd>A night that came in two parts. Still a whole night of rest.</dd>' +
    '<dt>A little button</dt><dd>A nap that day.</dd>' +
    '<dt>A sparkle</dt><dd>A soft day. You rested anyway.</dd>' +
    '<dt>The needle</dt><dd>Where the next patch will go.</dd></dl>' +
    '<p class="muted" style="font-size:12px">Machine wash cold. Tumble dry with kindness.</p></div><button type="button" class="btn alt" data-close>Close</button>');
}
