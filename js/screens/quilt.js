import { get, save, parseKey } from '../store.js';
import { esc, nav, backLink, him, hm, timeOf, reduceMotion } from '../ui.js';
import { mulberry32, hashStr } from '../sky-model.js';

// ---------- fabrics: palette from how long you rested, pattern family from how it felt ----------
const COOL = [['#1F55D0', '#DCE7FF'], ['#8FB0D9', '#F1F5FC'], ['#6CC2B4', '#E2F4F1'], ['#B07CC6', '#F1E6F6'], ['#3C4A8A', '#E6E9F7']];
const MID = [['#1F55D0', '#FFF4CC'], ['#5DAE7E', '#E1F2E6'], ['#8FB0D9', '#FFF1DE'], ['#D96C8A', '#FBE3EA'], ['#23262F', '#F3EEDF'], ['#6CC2B4', '#FFF4CC']];
const WARM = [['#F4C430', '#FFF4CC'], ['#F2A65A', '#FFEBD6'], ['#E2402F', '#FFE1DA'], ['#D96C8A', '#FFF1DE'], ['#5DAE7E', '#FFF4CC'], ['#1F55D0', '#FFE7B8']];
const FEEL_PATTERNS = { rested: ['stars', 'flowers', 'dots', 'scallops', 'knots'], okay: ['stripes', 'checks', 'gingham', 'plaid', 'diamonds', 'crosses'], groggy: ['waves', 'zigzag', 'triangles', 'knots', 'stripes'] };
const PAT = {
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
  const [a, b] = pal[Math.floor(r() * pal.length)], pats = FEEL_PATTERNS[feel] || FEEL_PATTERNS.okay;
  return { a, b, pat: pats[Math.floor(r() * pats.length)], seed: Math.floor(r() * 1e9) };
}

// one patch per day of rest
function patches() {
  const byDay = {};
  get().rests.forEach(r => { (byDay[r.date] = byDay[r.date] || []).push(r); });
  return Object.keys(byDay).sort().map(date => {
    const rests = byDay[date].sort((a, b) => a.start - b.start);
    const isNap = r => { const h = new Date(r.start).getHours(); return (r.end - r.start) < 120 * 60000 && h >= 11 && h < 20; };
    const main = rests.filter(r => !isNap(r)), naps = rests.filter(isNap);
    const hours = rests.reduce((n, r) => n + (r.end - r.start), 0) / 3600000;
    const feel = (rests.find(r => r.feel) || {}).feel || 'okay';
    const pr = mulberry32(hashStr(date + '|' + rests.length + '|' + feel));
    const f0 = fabricFor(pr, hours, feel); let f1 = fabricFor(pr, hours, feel);
    if (f1.a === f0.a && f1.pat === f0.pat) f1 = fabricFor(pr, hours, feel);
    return { date, rests, main, naps, parts: Math.max(1, Math.min(2, main.length)), hours, feel, fabrics: [f0, f1], split: pr() < 0.5 ? 'diag' : 'vert', button: ['#E2402F', '#1F55D0', '#F4C430', '#5DAE7E'][Math.floor(pr() * 4)] };
  });
}

let raf = 0;
export function unmount() { cancelAnimationFrame(raf); }

export function mount(root) {
  const st = get(), list = patches();
  const seen = new Set(st.quiltSeen || []);
  const firstVisit = !st.quiltSeen;
  st.quiltSeen = list.map(p => p.date); save();
  const t0 = performance.now();
  list.forEach((p, i) => { p.born = !firstVisit && !seen.has(p.date) ? t0 + 300 + i * 0 : -1e9; });
  const split = list.filter(p => p.parts === 2).length, naps = list.filter(p => p.naps.length).length;

  root.innerHTML =
    '<div class="top">' + backLink('#/rest', 'Rest') + '</div>' +
    '<div class="hero">' + him('asleep', 'breathe', 'Your character asleep under a blanket') + '<div class="txt"><h1>Your quilt</h1><p class="say">Every rest adds a patch. Split nights get stitched together.</p></div></div>' +
    '<p class="muted" style="font-size:13px;font-weight:700">' + list.length + (list.length === 1 ? ' patch' : ' patches') + ' · ' + split + ' split nights stitched · ' + naps + (naps === 1 ? ' button' : ' buttons') + '</p>' +
    '<div class="chips"><span class="chip small" style="pointer-events:none">one rest = one fabric</span><span class="chip small" style="pointer-events:none">two parts = two halves</span><span class="chip small" style="pointer-events:none">a nap = a button</span></div>' +
    (list.length ? '<canvas id="quilt" aria-label="Your rest quilt. Each patch is a day of rest."></canvas>' : '<p class="empty">Your quilt starts with your first logged rest. Log one from the Rest screen.</p>') +
    '<div class="card" id="qcard" hidden><div class="lbl" id="qK"></div><h2 id="qT"></h2><p class="muted" id="qM" style="font-size:14px;line-height:1.4"></p></div>' +
    nav('home');
  if (!list.length) return;

  const cv = root.querySelector('#quilt'), ctx = cv.getContext('2d');
  const COLS = 6, PAD = 14; let W = 0, S = 0, DPR = 1;
  const cache = new Map();
  const tile = (f, size) => {
    const key = f.seed + '|' + f.pat + '|' + f.a + '|' + size; if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas'); c.width = c.height = Math.ceil(size * DPR);
    const g = c.getContext('2d'); g.scale(DPR, DPR); PAT[f.pat](g, size, f.a, f.b, mulberry32(f.seed)); cache.set(key, c); return c;
  };
  const layout = () => { DPR = Math.min(window.devicePixelRatio || 1, 2); W = cv.clientWidth || 360; S = (W - PAD * 2) / COLS; const H = Math.ceil(list.length / COLS) * S + PAD * 2; cv.style.height = H + 'px'; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cache.clear(); };
  cv.style.width = '100%'; cv.style.display = 'block';
  layout();
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const stitch = (path, colour, off) => { ctx.save(); ctx.setLineDash([3, 3]); ctx.lineDashOffset = off || 0; ctx.strokeStyle = colour; ctx.lineWidth = 1.2; path(); ctx.stroke(); ctx.restore(); };
  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const H = cv.height / DPR; ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1F55D0'; rr(0, 0, W, H, 18); ctx.fill();
    stitch(() => rr(6, 6, W - 12, H - 12, 13), 'rgba(255,255,255,0.7)');
    let busy = false;
    list.forEach((d, i) => {
      const x = PAD + (i % COLS) * S, y = PAD + Math.floor(i / COLS) * S, age = now - d.born;
      if (age < 0) { busy = true; return; }
      const t = Math.min(1, age / 700), e = 1 - Math.pow(1 - t, 3);
      if (age < 2400) busy = true;
      ctx.save();
      if (t < 1) { ctx.globalAlpha = e; ctx.translate(x + S / 2, y + S / 2); ctx.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e); ctx.translate(-(x + S / 2), -(y + S / 2)); }
      const t0 = tile(d.fabrics[0], S);
      if (d.parts === 1) ctx.drawImage(t0, x, y, S, S);
      else {
        const t1 = tile(d.fabrics[1], S);
        ctx.save(); ctx.beginPath(); if (d.split === 'diag') { ctx.moveTo(x, y); ctx.lineTo(x + S, y); ctx.lineTo(x, y + S); } else ctx.rect(x, y, S / 2, S); ctx.clip(); ctx.drawImage(t0, x, y, S, S); ctx.restore();
        ctx.save(); ctx.beginPath(); if (d.split === 'diag') { ctx.moveTo(x + S, y); ctx.lineTo(x + S, y + S); ctx.lineTo(x, y + S); } else ctx.rect(x + S / 2, y, S / 2, S); ctx.clip(); ctx.drawImage(t1, x, y, S, S); ctx.restore();
        const seam = age < 2200 ? Math.max(0, Math.min(1, (age - 600) / 1200)) : 1;
        stitch(() => { ctx.beginPath(); if (d.split === 'diag') { ctx.moveTo(x + S, y); ctx.lineTo(x + S - S * seam, y + S * seam); } else { ctx.moveTo(x + S / 2, y); ctx.lineTo(x + S / 2, y + S * seam); } }, 'rgba(255,255,255,0.95)');
      }
      ctx.strokeStyle = 'rgba(35,38,47,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);
      stitch(() => { ctx.beginPath(); ctx.rect(x + 3.5, y + 3.5, S - 7, S - 7); }, 'rgba(255,255,255,0.75)', reduceMotion || age > 2400 ? 0 : -age / 40);
      if (d.naps.length) { const bx = x + S - 10, by = y + S - 10; ctx.fillStyle = d.button; ctx.beginPath(); ctx.arc(bx, by, 5, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.85)'; [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(bx + dx, by + dy, 0.8, 0, 7); ctx.fill(); }); }
      ctx.restore();
    });
    raf = busy ? requestAnimationFrame(draw) : 0;
  }
  raf = requestAnimationFrame(draw);
  const onResize = () => { layout(); if (!raf) raf = requestAnimationFrame(draw); };
  window.addEventListener('resize', onResize, { once: true });

  cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left - PAD, y = e.clientY - r.top - PAD;
    const i = Math.floor(y / S) * COLS + Math.floor(x / S), d = list[i], card = root.querySelector('#qcard');
    if (x < 0 || y < 0 || x >= S * COLS || !d) { card.hidden = true; return; }
    root.querySelector('#qK').textContent = parseKey(d.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
    root.querySelector('#qT').textContent = 'Rested ' + hm(Math.round(d.hours * 60)) + (d.main.length > 1 ? ', in ' + d.main.length + ' parts' : '') + (d.naps.length ? ' + a nap' : '');
    root.querySelector('#qM').textContent = d.rests.map(r => timeOf(r.start) + ' to ' + timeOf(r.end)).join(', then ') + '. Felt ' + d.feel + '.' + (d.parts === 2 ? ' Two halves, stitched into one. Still a whole night of care.' : '');
    card.hidden = false; card.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  });
}
