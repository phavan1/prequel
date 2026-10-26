// Slow ride (v68): an endless, calm bike ride down a winding road, inspired by slowroads.io but drawn the light way:
// a pseudo-3D road on a 2D canvas (no 3D library, works offline, kind to the battery).
// No score, no crashing, no goals. Drag to steer, or let go and it rides itself. The sky follows your real clock.
// The distance never resets (st.games.road.m), and the road carries on from where you stopped: every place along
// it comes from the distance, so the same kilometre always looks the same.
// Places, ~6 km each, blending into the next: fields, forest, lakeside, hills, coast, village, then round again.
import { get, save } from '../store.js';
import { esc, backLink, toast, reduceMotion } from '../ui.js';
import { record, fullCanvas, soundOn, toggleSound, soundIcon } from '../gamekit.js';

export const SEG = 0.6;               // metres per road segment (v69: the road was drawn for 0.6 m but moved as if 2 m, so it felt slow and stuck)
const SL = 200;                // segment length in world units
const ROAD = 1050;             // half the road's width, world units (a country lane, not a highway)
const CAM_H = 1500;            // camera height above the road
const DEPTH = 0.84;            // camera depth (about a 100° field of view)
const N = 170;                 // segments drawn ahead
const GEARS = [['Easy', 22], ['Brisk', 35], ['Breezy', 50]]; // v69: tap the pill to change gear (km/h)
const PLACE_KM = 6;
export const PLACES = [
  { name: 'Open fields', grass: ['#A9D18E', '#9CC781'], far: '#8DB58A', near: '#7FA877', things: ['hay', 'fence', 'tree', 'flowers'] },
  { name: 'The forest road', grass: ['#6FA06A', '#64955F'], far: '#4F7D5B', near: '#3F6B4C', things: ['pine', 'pine', 'tree', 'pine'], dense: 1 },
  { name: 'Lakeside', grass: ['#9CCB8C', '#90BF81'], far: '#7FAE8F', near: '#6E9E7E', things: ['reeds', 'tree', 'jetty', 'reeds'], water: 1 },
  { name: 'Rolling hills', grass: ['#B4D58F', '#A8CB83'], far: '#93BC7E', near: '#86B072', things: ['sheep', 'tree', 'wall', 'sheep'] },
  { name: 'The coast road', grass: ['#C9D7A0', '#BFCD95'], far: '#A9BFA0', near: '#9BB394', things: ['dune', 'post', 'lighthouse', 'dune'], water: 1, sea: 1 },
  { name: 'A sleepy village', grass: ['#A7CC90', '#9BC184'], far: '#8CB28A', near: '#7EA47D', things: ['house', 'lamp', 'house', 'tree'] }
];

// ---------- the road's shape: smooth, seeded, the same every time you pass ----------
const h01 = i => { let x = (i | 0) * 374761393 + 668265263; x = (x ^ (x >>> 13)) * 1274126177; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
function curve(i) { const a = i / 900, b = i / 2600; return 4.2 * Math.sin(a * 6.283 + 1.3) * (0.5 + 0.5 * Math.sin(b * 6.283)) + 1.6 * Math.sin(i / 340 + 2.1); }
function height(i) { return 1500 * Math.sin(i / 95) + 650 * Math.sin(i / 41 + 1.7) + 2200 * Math.sin(i / 700 + 0.4); }
export function placeAt(m) { const k = m / 1000 / PLACE_KM, idx = Math.floor(k), t = k - idx; return { idx, a: PLACES[((idx % PLACES.length) + PLACES.length) % PLACES.length], b: PLACES[(((idx + 1) % PLACES.length) + PLACES.length) % PLACES.length], blend: t > 0.92 ? (t - 0.92) / 0.08 : 0 }; }
const mix = (c1, c2, t) => { const p = c => [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16)); const a = p(c1), b = p(c2); return '#' + a.map((v, k) => Math.round(v + (b[k] - v) * t).toString(16).padStart(2, '0')).join(''); };

// ---------- the sky, from your real clock ----------
function skyNow(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  // [hour, top, bottom, tint over the land (alpha)]
  const K = [[0, '#0E1530', '#27305A', 0.55], [5, '#1A2348', '#4A4F7E', 0.45], [6.5, '#F6B98A', '#FCE3C2', 0.12], [8, '#9CC3F2', '#DDEBFA', 0], [16.5, '#8DB8EE', '#E8F0F8', 0], [18, '#F2A06B', '#FCD9A8', 0.1], [19.3, '#5B4E86', '#E79A82', 0.3], [20.5, '#16204A', '#3A3F72', 0.5], [24, '#0E1530', '#27305A', 0.55]];
  let i = 0; while (i < K.length - 2 && h >= K[i + 1][0]) i++;
  const [h0, t0, b0, a0] = K[i], [h1, t1, b1, a1] = K[i + 1], t = (h - h0) / (h1 - h0);
  return { top: mix(t0, t1, t), bottom: mix(b0, b1, t), tint: a0 + (a1 - a0) * t, night: h < 5.5 || h >= 20, h };
}

let raf = 0, cleanup = null, alive = false;
export function unmount() { cancelAnimationFrame(raf); alive = false; if (cleanup) cleanup(); }

export function mount(root, params) {
  const rec = record('road', { m: 0, rides: 0 });
  const startM = rec.m || 0;
  root.innerHTML = '<canvas id="rd" aria-label="Slow ride: an endless calm bike ride"></canvas>' +
    '<div class="sk-hud rd-hud">' + backLink().replace('class="back"', 'class="sk-back"') + '<button type="button" class="sk-back gsound" id="rdSound" aria-label="Sound on or off">' + soundIcon() + '</button></div>' +
    '<div class="rd-place" id="rdPlace"></div><div class="rd-hint" id="rdHint">Drag to steer, or just let it ride.</div>' +
    '<div class="rd-km" id="rdKm" aria-live="off"></div>' +
    '<button type="button" class="rd-gear" id="rdGear"></button>';
  const gearEl = root.querySelector('#rdGear'), cv = root.querySelector('#rd'), kmEl = root.querySelector('#rdKm'), placeEl = root.querySelector('#rdPlace'), hint = root.querySelector('#rdHint');
  const { g, box, stop } = fullCanvas(cv, () => draw(), 1.5); // v69: a little under the iPhone's full sharpness, so every frame is quick (a soft painted look, and much smoother)
  const rider = new Image(); rider.src = 'art/biker.webp';

  // where you are: in segments (the total distance carries on), sideways on the road (-1..1), and steering
  const gear0 = Math.max(0, Math.min(2, rec.gear | 0));
  const s = { pos: startM / SEG, v: GEARS[gear0][1], gear: gear0, pedal: 0, x: 0, tx: 0, drag: null, t: 0, sky: 0, place: -1, savedAt: 0, lean: 0 };
  let sky = skyNow();
  const showGear = () => { const [name] = GEARS[s.gear]; gearEl.innerHTML = '<span class="rd-dots" aria-hidden="true">' + GEARS.map((_, k) => '<i' + (k <= s.gear ? ' class="on"' : '') + '></i>').join('') + '</span>' + name; gearEl.setAttribute('aria-label', 'Speed: ' + name + '. Tap to change.'); };
  showGear();

  // ---------- drawing helpers ----------
  const poly = (x1, y1, w1, x2, y2, w2, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x1 - w1, y1 + 1); g.lineTo(x2 - w2, y2 - 0.5); g.lineTo(x2 + w2, y2 - 0.5); g.lineTo(x1 + w1, y1 + 1); g.closePath(); g.fill(); };
  function hills(W, H, horizon, off, amp, col, f, seed) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W + 8; x += 8) { const u = (x + off) * f; g.lineTo(x, horizon - amp * (0.55 + 0.3 * Math.sin(u + seed) + 0.15 * Math.sin(u * 2.7 + seed * 2))); }
    g.lineTo(W, horizon + 40); g.lineTo(0, horizon + 40); g.fill();
  }
  // one thing by the road, drawn at (x, y = its base on the ground) with a scale k (screen px per world unit)
  function thing(kind, x, y, k, lights) {
    const u = k * 100; if (u < 0.6) return; // too far to see
    g.save(); g.translate(x, y);
    switch (kind) {
      case 'tree': g.fillStyle = '#7A5A3E'; g.fillRect(-0.9 * u, -6 * u, 1.8 * u, 6 * u); g.fillStyle = '#5E9A5A'; g.beginPath(); g.arc(0, -8.5 * u, 4.2 * u, 0, 7); g.fill(); g.fillStyle = '#6FAE68'; g.beginPath(); g.arc(-1.2 * u, -9.5 * u, 2.6 * u, 0, 7); g.fill(); break;
      case 'pine': g.fillStyle = '#6B4E36'; g.fillRect(-0.7 * u, -3 * u, 1.4 * u, 3 * u); g.fillStyle = '#2F6B48'; [[0, 12, 4.6], [0, 9, 3.8], [0, 6, 3]].forEach(([, top, w], n) => { g.beginPath(); g.moveTo(-w * u, (-2.5 - n * 2.8) * u); g.lineTo(0, (-2.5 - n * 2.8 - 5.5) * u); g.lineTo(w * u, (-2.5 - n * 2.8) * u); g.fill(); }); break;
      case 'hay': g.fillStyle = '#E2C26A'; g.fillRect(-2.2 * u, -2.6 * u, 4.4 * u, 2.6 * u); g.fillStyle = '#C9A852'; g.beginPath(); g.ellipse(2.2 * u, -1.3 * u, 0.7 * u, 1.3 * u, 0, 0, 7); g.fill(); break;
      case 'fence': g.fillStyle = '#B08A63'; [-1.4, 0, 1.4].forEach(p => g.fillRect((p - 0.2) * u, -2.2 * u, 0.4 * u, 2.2 * u)); g.fillRect(-1.6 * u, -1.8 * u, 3.2 * u, 0.3 * u); g.fillRect(-1.6 * u, -1 * u, 3.2 * u, 0.3 * u); break;
      case 'flowers': ['#F28FAD', '#F6D26B', '#FFFFFF'].forEach((c, n) => { g.fillStyle = c; g.beginPath(); g.arc((n - 1) * 1.1 * u, -0.5 * u, 0.45 * u, 0, 7); g.fill(); }); break;
      case 'reeds': g.strokeStyle = '#6F8F4E'; g.lineWidth = Math.max(1, 0.25 * u); for (let n = -2; n <= 2; n++) { g.beginPath(); g.moveTo(n * 0.5 * u, 0); g.quadraticCurveTo(n * 0.7 * u, -2 * u, n * 0.9 * u, -3.5 * u); g.stroke(); } g.fillStyle = '#7A5A3E'; g.fillRect(0.4 * u, -3.4 * u, 0.35 * u, 1 * u); break;
      case 'jetty': g.fillStyle = '#9A7653'; g.fillRect(-5 * u, -0.6 * u, 10 * u, 0.6 * u); g.fillStyle = '#7C5C40'; [-4, 0, 4].forEach(p => g.fillRect(p * u, 0, 0.4 * u, 1 * u)); break;
      case 'sheep': g.fillStyle = '#F6F3EA'; g.beginPath(); g.ellipse(0, -1.4 * u, 1.6 * u, 1.1 * u, 0, 0, 7); g.fill(); g.fillStyle = '#3B3B3B'; g.beginPath(); g.ellipse(1.6 * u, -1.6 * u, 0.55 * u, 0.45 * u, 0, 0, 7); g.fill(); g.fillRect(-0.9 * u, -0.5 * u, 0.25 * u, 0.6 * u); g.fillRect(0.7 * u, -0.5 * u, 0.25 * u, 0.6 * u); break;
      case 'wall': g.fillStyle = '#B9B2A2'; g.fillRect(-4 * u, -1.2 * u, 8 * u, 1.2 * u); g.fillStyle = '#A39C8C'; for (let n = -4; n < 4; n += 1.6) g.fillRect(n * u, -1.2 * u, 0.15 * u, 1.2 * u); break;
      case 'dune': g.fillStyle = '#E6D8A8'; g.beginPath(); g.ellipse(0, 0, 4 * u, 1.6 * u, 0, Math.PI, 0); g.fill(); g.strokeStyle = '#8FA36A'; g.lineWidth = Math.max(1, 0.2 * u); for (let n = -1; n <= 1; n++) { g.beginPath(); g.moveTo(n * u, -1.2 * u); g.lineTo(n * 1.3 * u, -2.6 * u); g.stroke(); } break;
      case 'post': g.fillStyle = '#FFFFFF'; g.fillRect(-0.3 * u, -2.2 * u, 0.6 * u, 2.2 * u); g.fillStyle = '#E2402F'; g.fillRect(-0.3 * u, -2.2 * u, 0.6 * u, 0.4 * u); break;
      case 'lighthouse': g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(-1.6 * u, 0); g.lineTo(-1 * u, -14 * u); g.lineTo(1 * u, -14 * u); g.lineTo(1.6 * u, 0); g.fill(); g.fillStyle = '#E2402F'; g.fillRect(-1.35 * u, -5 * u, 2.7 * u, 1.6 * u); g.fillRect(-1.15 * u, -10 * u, 2.3 * u, 1.6 * u); g.fillStyle = '#3B3B3B'; g.fillRect(-1.2 * u, -16 * u, 2.4 * u, 2 * u); lights.push([x, y - 15 * u, 3 * u, '#FFE08A']); break;
      case 'house': g.fillStyle = ['#F3D9B1', '#E9C9A0', '#F1E6D2'][Math.abs(Math.round(x)) % 3]; g.fillRect(-3.5 * u, -5 * u, 7 * u, 5 * u); g.fillStyle = '#B5664A'; g.beginPath(); g.moveTo(-4.2 * u, -5 * u); g.lineTo(0, -8 * u); g.lineTo(4.2 * u, -5 * u); g.fill(); g.fillStyle = '#6B8FC7'; g.fillRect(-2.3 * u, -3.6 * u, 1.4 * u, 1.4 * u); g.fillRect(0.9 * u, -3.6 * u, 1.4 * u, 1.4 * u); lights.push([x - 1.6 * u, y - 2.9 * u, 1.2 * u, '#FFD27A'], [x + 1.6 * u, y - 2.9 * u, 1.2 * u, '#FFD27A']); break;
      case 'lamp': g.fillStyle = '#4A4F5E'; g.fillRect(-0.2 * u, -7 * u, 0.4 * u, 7 * u); g.fillRect(-0.2 * u, -7 * u, 1.4 * u, 0.3 * u); g.fillStyle = '#FFF1C4'; g.fillRect(0.9 * u, -6.9 * u, 0.6 * u, 0.5 * u); lights.push([x + 1.2 * u, y - 6.6 * u, 2.4 * u, '#FFE9A8']); break;
    }
    g.restore();
  }

  function draw() {
    const W = box.W, H = box.H; if (!W) return;
    const horizon = H * 0.42, base = Math.floor(s.pos), pct = s.pos - base;
    const here = placeAt(s.pos * SEG), P = here.a, Q = here.b, bl = here.blend;
    // sky
    const sk = g.createLinearGradient(0, 0, 0, horizon); sk.addColorStop(0, sky.top); sk.addColorStop(1, sky.bottom);
    g.fillStyle = sk; g.fillRect(0, 0, W, horizon + 2);
    if (sky.night) { g.fillStyle = 'rgba(255,248,225,.85)'; for (let i = 0; i < 70; i++) { const sx = ((h01(i) * W * 3 - s.sky * 0.2) % W + W) % W, sy = h01(i + 99) * horizon * 0.9; g.fillRect(sx, sy, 1.6, 1.6); } g.fillStyle = '#FFF4CC'; g.beginPath(); g.arc(W * 0.78, horizon * 0.28, 16, 0, 7); g.fill(); }
    else { const sunY = sky.h < 12 ? horizon * (1 - (sky.h - 6) / 7) : horizon * ((sky.h - 12) / 7.5); g.fillStyle = sky.h > 16.5 || sky.h < 8 ? '#FFC98A' : '#FFF1B8'; g.beginPath(); g.arc(W * 0.72, Math.max(horizon * 0.15, Math.min(horizon - 8, sunY)), 20, 0, 7); g.fill(); }
    // far hills (sea on the coast), drifting with the bends
    if (P.sea || (Q.sea && bl > 0.5)) { g.fillStyle = '#6FA3C9'; g.fillRect(0, horizon - 10, W, H); }
    hills(W, H, horizon + 4, s.sky * 0.3, horizon * 0.22, mix(P.far, Q.far, bl), 0.006, 1);
    hills(W, H, horizon + 10, s.sky * 0.6, horizon * 0.12, mix(P.near, Q.near, bl), 0.011, 4);
    // the road, front to back, with hills hiding what's behind them
    const camY = CAM_H + height(s.pos), pts = [], U = Math.min(W, H * 0.75) / 2, depth = DEPTH * (1 - 0.1 * Math.max(0, (s.v - 22) / 28)); // a touch wider when you go faster
    let x = 0, dx = -curve(base) * pct, maxY = H, lx = 0, lw = 0, ly = 0, chain = false; // lx, ly, lw: where the last strip drawn ended (its middle, height, half-width)
    // the ground under everything, so nothing shows through below the nearest bit of road
    g.fillStyle = mix(P.grass[0], Q.grass[0], bl); g.fillRect(0, horizon, W, H - horizon);
    const proj = (wx, wy, wz) => { const sc = depth / wz; return [W / 2 + sc * (wx - s.x * ROAD) * U, horizon - sc * (wy - camY) * U, sc * ROAD * U, sc]; };
    for (let n = 1; n < N; n++) {
      const i = base + n, z1 = (n - 1 - pct) * SL + 330, z2 = z1 + SL;
      const [x1, y1, w1, sc1] = proj(x, height(i - 1), z1), [x2, y2, w2] = proj(x + dx, height(i), z2);
      x += dx; dx += curve(i) * 3.4;
      pts.push({ i, x: x1, y: y1, w: w1, sc: sc1, clip: maxY });
      if (n === 1) pts.U = U;
      if (y2 >= maxY || y2 >= y1) { chain = false; continue; } // hidden behind a hill
      if (!chain) { lx = x1; ly = y1; lw = w1; chain = true; }
      if (ly - y2 < 1) continue; // far away a segment is thinner than a pixel: fold it into the next strip (v69: far fewer shapes per frame)
      const band = Math.floor(i / 3) % 2, pl = placeAt(i * SEG), gc = mix(pl.a.grass[band], pl.b.grass[band], pl.blend);
      const ny = ly; // draw from the last strip's far edge, so folded segments leave no gaps
      g.fillStyle = gc; g.fillRect(0, y2 - 0.5, W, ny - y2 + 1.5);
      if (pl.a.water || (pl.b.water && pl.blend > 0.5)) poly(0, ny, lx - lw * 2.2, 0, y2, x2 - w2 * 2.2, band ? '#7FB3D6' : '#86B9DB'); // water on the left
      poly(lx, ny, lw * 1.12, x2, y2, w2 * 1.12, band ? '#E8DCC0' : '#D9CCAE');
      poly(lx, ny, lw, x2, y2, w2, band ? '#8E8F95' : '#888990');
      if (band) poly(lx, ny, lw * 0.025, x2, y2, w2 * 0.025, '#F4EFE1');
      maxY = y2; lx = x2; ly = y2; lw = w2;
    }
    // things by the road, far to near
    const lights = [];
    for (let k = pts.length - 1; k >= 0; k--) {
      const p = pts[k], U = pts.U || W / 2, pl = placeAt(p.i * SEG), src = h01(p.i) < pl.blend ? pl.b : pl.a;
      if (p.i % (src.dense ? 2 : 4)) continue;
      if (h01(p.i + 7) < (src.dense ? 0.1 : 0.35)) continue;
      let kind = src.things[Math.floor(h01(p.i + 3) * src.things.length)]; if (kind === 'lighthouse' && h01(p.i + 11) > 0.08) kind = 'dune'; // a lighthouse now and then, not a row of them
      const side = (src.water && kind !== 'jetty') || h01(p.i + 5) < 0.5 ? 1 : -1;
      const off = (kind === 'jetty' ? -1 : side) * (1.5 + h01(p.i + 9) * (kind === 'lighthouse' ? 4 : 2.2));
      const sx = p.x + off * p.w, sy = p.y; if (sy > p.clip + 2) continue;
      thing(kind, sx, sy, p.sc * U * 2.2, lights);
    }
    // the light of the day over the land
    if (sky.tint > 0.01) { const tc = 'rgba(16,22,58,', gt = g.createLinearGradient(0, horizon * 0.2, 0, horizon - 20); gt.addColorStop(0, tc + '0)'); gt.addColorStop(1, tc + sky.tint.toFixed(2) + ')'); g.fillStyle = gt; g.fillRect(0, horizon * 0.2, W, horizon * 0.8 - 20); g.fillStyle = tc + sky.tint.toFixed(2) + ')'; g.fillRect(0, horizon - 20, W, H); } // fades in above the horizon so tall trees and the lighthouse darken too
    if (sky.tint > 0.25) lights.forEach(([lx, ly, lr0, c]) => { const lr = Math.min(lr0, 9); const gr = g.createRadialGradient(lx, ly, 0, lx, ly, lr * 3); gr.addColorStop(0, c); gr.addColorStop(0.35, c + '88'); gr.addColorStop(1, 'rgba(255,230,160,0)'); g.fillStyle = gr; g.beginPath(); g.arc(lx, ly, lr * 3, 0, 7); g.fill(); });
    // him on his bike, leaning into the bends, a gentle bob as he pedals
    if (rider.complete && rider.naturalWidth) {
      const rh = Math.min(H * 0.34, W * 0.75), rw = rh * rider.naturalWidth / rider.naturalHeight, pd = reduceMotion ? 0 : s.pedal, bob = Math.abs(Math.sin(pd)) * rh * 0.008, rock = Math.sin(pd) * 0.022; // he rocks a little with each push on the pedals
      g.save(); g.translate(W / 2, H - rh * 0.06 - bob); g.rotate(s.lean + rock);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(0, -rh * 0.01, rw * 0.32, rh * 0.03, 0, 0, 7); g.fill();
      g.drawImage(rider, -rw / 2, -rh, rw, rh);
      if (sky.tint > 0.25) { const gr = g.createRadialGradient(0, -rh * 0.24, 0, 0, -rh * 0.24, rw * 0.35); gr.addColorStop(0, 'rgba(255,80,60,.55)'); gr.addColorStop(1, 'rgba(255,80,60,0)'); g.fillStyle = gr; g.fillRect(-rw / 2, -rh * 0.5, rw, rh * 0.5); }
      g.restore();
    }
    const kmTxt = ((s.pos * SEG) / 1000).toFixed(1) + ' km'; if (kmEl.textContent !== kmTxt) kmEl.textContent = kmTxt; // only touch the page when the number changes
    // a soft name card as you come into a new place
    if (here.idx !== s.place) { const first = s.place === -1; s.place = here.idx; placeEl.textContent = P.name; placeEl.classList.remove('show'); void placeEl.offsetWidth; placeEl.classList.add('show'); if (first) placeEl.classList.add('first'); }
  }

  // ---------- riding ----------
  function step(dt) {
    s.t += dt;
    const i = Math.floor(s.pos), slope = (height(i + 6) - height(i)) / (6 * SL);
    const want = GEARS[s.gear][1] * (1 - Math.max(-0.1, Math.min(0.2, slope * 3.2))); // a little slower uphill, a little quicker down
    s.v += (want - s.v) * Math.min(1, dt * 0.9); // eases into a new gear over a second or two
    s.pedal += dt * (2.6 + s.v * 0.09); // pedalling quicker as you go faster
    const segs = s.v / 3.6 / SEG * dt;
    s.pos += segs;
    const c = curve(i);
    s.sky += c * segs * 6;
    if (!s.drag) s.tx *= Math.pow(0.35, dt); // let go, and it rides itself back to the middle
    s.x += (s.tx - s.x) * Math.min(1, dt * 2.5);
    s.x = Math.max(-1.6, Math.min(1.6, s.x));
    s.lean += ((-c * 0.035) + (s.tx - s.x) * -0.25 - s.lean) * Math.min(1, dt * 3);
    if (nodes && nodes.on && !document.hidden) { const q = (s.v - 22) / 28; nodes.v.gain.value = 0.05 + 0.05 * q; nodes.f.frequency.value = 380 + 320 * q; } // the wind gets a little louder as you speed up
    if (s.t - s.savedAt > 120) persist(); // saving copies all your data, which can catch a frame, so only every two minutes while riding (and always when you leave or switch apps)
  }
  function persist() { s.savedAt = s.t; rec.m = Math.round(s.pos * SEG); rec.gear = s.gear; save(); }
  let last = 0;
  function loop(now) { if (!alive) return; const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now; if (Math.floor(s.t) !== Math.floor(s.t + dt)) sky = skyNow(); step(dt); draw(); raf = requestAnimationFrame(loop); }

  // ---------- steering: drag left or right ----------
  root.addEventListener('pointerdown', e => { if (e.target.closest('a, button')) return; s.drag = { x: e.clientX, tx: s.tx }; hint.classList.add('gone'); });
  root.addEventListener('pointermove', e => { if (!s.drag) return; e.preventDefault(); s.tx = Math.max(-1.4, Math.min(1.4, s.drag.tx + (e.clientX - s.drag.x) / (box.W * 0.35))); });
  const up = () => { s.drag = null; };
  root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);
  root.addEventListener('click', e => { if (e.target.closest('#rdGear')) { s.gear = (s.gear + 1) % GEARS.length; rec.gear = s.gear; showGear(); hint.classList.add('gone'); return; } const b = e.target.closest('#rdSound'); if (b) { b.textContent = toggleSound() ? '🔊' : '🔈'; hum(); } });
  // sound: a soft breeze and the hum of the tyres, off unless you turn it on
  let ac = null, nodes = null;
  function hum() {
    if (!soundOn()) { if (nodes) { nodes.v.gain.value = 0; nodes.on = false; } return; }
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      if (!nodes) { const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const src = ac.createBufferSource(); src.buffer = b; src.loop = true; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; const v = ac.createGain(); v.gain.value = 0; src.connect(f); f.connect(v); v.connect(ac.destination); src.start(); nodes = { v, f, on: true }; }
      nodes.on = true;
      nodes.v.gain.value = 0.05;
    } catch (e) { /* a bonus */ }
  }
  const onVis = () => { if (document.hidden) { persist(); if (nodes) nodes.v.gain.value = 0; alive = false; cancelAnimationFrame(raf); } else { alive = true; last = 0; sky = skyNow(); hum(); raf = requestAnimationFrame(loop); } };
  document.addEventListener('visibilitychange', onVis);
  cleanup = () => {
    persist(); stop(); document.removeEventListener('visibilitychange', onVis);
    if (nodes) nodes.v.gain.value = 0; if (ac) ac.close().catch(() => {});
    const rode = rec.m - startM; if (rode >= 50) { rec.rides = (rec.rides || 0) + 1; save(); toast((rode / 1000).toFixed(1) + ' km this ride · ' + (rec.m / 1000).toFixed(1) + ' km all together'); }
  };
  root.__road = s; // for the automated tests only
  setTimeout(() => hint.classList.add('gone'), 5000);
  alive = true; hum(); rider.onload = () => draw(); draw(); raf = requestAnimationFrame(loop);
}
