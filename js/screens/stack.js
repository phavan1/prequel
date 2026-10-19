// Stack the stars (v56): a paper star swings on a string; tap to drop it onto the tower.
// Off-centre drops make the tower lean, a dead-centre drop sparkles and straightens it a little, and a star that
// misses tumbles off. The view climbs from the shelf, past the window, through the clouds, into the night, up to the moon.
// The swing speeds up slowly, then settles. Only your own best is kept.
import { save } from '../store.js';
import { esc } from '../ui.js';
import { record, dark, fullCanvas, blip, toggleSound, soundIcon, paperStar, PAPER } from '../gamekit.js';

// how high, in stars, and what you'd see up there
export const PLACES = [[8, 'past the window'], [15, 'into the clouds'], [25, 'up with the birds'], [40, 'into the night sky'], [60, 'all the way to the moon']];
const placeOf = n => { let p = ''; PLACES.forEach(([k, t]) => { if (n >= k) p = t; }); return p; };
const SKY = [[8, [191, 216, 255]], [20, [221, 235, 255]], [32, [247, 201, 169]], [40, [58, 63, 122]], [55, [20, 26, 51]]];
let raf = 0, alive = false, cleanup = null;

export function unmount() { cancelAnimationFrame(raf); alive = false; if (cleanup) cleanup(); }

export function mount(root) {
  const rec = record('stack');
  root.innerHTML = '<canvas id="stk" aria-label="Stack the stars game"></canvas>' +
    '<div class="sk-hud"><a class="sk-back" href="#/home">‹ Home</a><span id="stkN" class="gnow"></span><span id="stkBest" class="gbest"></span><button type="button" class="sk-back gsound" id="stkSound" aria-label="Sound on or off">' + soundIcon() + '</button></div>' +
    '<div class="sk-over" id="stkOver"><h1>Stack the stars</h1><p>Tap to drop the star.<br>Build the tallest tower you can, all the way up to the moon.</p><button type="button" class="btn" id="stkGo">Start stacking</button></div>';
  const cv = root.querySelector('#stk'), over = root.querySelector('#stkOver'), nowEl = root.querySelector('#stkN'), bestEl = root.querySelector('#stkBest');
  const { g, box, stop } = fullCanvas(cv, () => { if (!alive) draw(); });
  const bestText = () => { bestEl.textContent = rec.best ? 'Best ' + rec.best : ''; };
  bestText();

  const dims = () => { const W = box.W, H = box.H, r = Math.max(30, Math.min(46, W * 0.105)); return { W, H, r, step: r * 1.42, ground: H * 0.86, hangY: H * 0.22, amp: Math.min(W * 0.34, 190), shelfW: Math.min(W * 0.62, 300) }; };
  let s;
  function reset() {
    s = { t: 0, tower: [], cur: null, fall: null, tumble: null, phase: Math.random() * 6, cam: 0, settle: 0, pops: [], sparks: [], dead: false, colour: 0 };
    nextStar();
  }
  function nextStar() { s.cur = { c: PAPER[(s.colour++) % PAPER.length] }; }
  const n = () => s.tower.length;
  const starY = (d, i) => d.r * 0.95 + i * d.step; // centre of the i-th star, above the shelf
  const toScreen = (d, wy) => d.ground - (wy - s.cam);
  const toWorld = (d, sy) => d.ground - sy + s.cam;
  const swingX = d => d.W / 2 + d.amp * Math.sin(s.phase);
  reset();
  root.__game = () => ({ s, d: dims() }); // for the automated tests only

  function drop() {
    if (!alive || !s.cur || s.fall) return;
    const d = dims();
    s.fall = { x: swingX(d), y: toWorld(d, d.hangY), vy: 0, c: s.cur.c }; s.cur = null;
  }

  function land(d) {
    const f = s.fall; s.fall = null;
    const base = n() ? s.tower[n() - 1].x : d.W / 2, reach = n() ? d.r * 1.15 : d.shelfW / 2, off = f.x - base;
    if (Math.abs(off) > reach) { // missed: it tumbles off past the tower
      s.tumble = { x: f.x, y: starY(d, n()), vx: Math.sign(off || 1) * 160, vy: 100, rot: 0, c: f.c }; blip(160, 0.18, 'sine', 0.2);
      setTimeout(end, 750); return;
    }
    const perfect = n() > 0 && Math.abs(off) <= d.r * 0.16;
    s.tower.push({ x: perfect ? base : f.x, c: f.c, land: s.t });
    if (perfect) {
      s.settle = 1; s.sparks.push({ x: base, y: starY(d, n() - 1), t: s.t });
      s.pops.push({ x: base, y: starY(d, n() - 1) + d.r * 1.4, text: 'Perfect! ✦', life: 1 });
      blip(990, 0.1, 'triangle');
    } else blip(330 + Math.min(n(), 30) * 12, 0.08, 'triangle');
    const k = PLACES.find(p => p[0] === n());
    if (k) { s.pops.push({ x: d.W / 2, y: starY(d, n() - 1) + d.r * 2.4, text: k[1][0].toUpperCase() + k[1].slice(1) + '!', life: 2.6, big: true }); blip(1180, 0.14, 'triangle'); }
    // too much lean and the tower topples
    const lean = Math.abs(com() - s.tower[0].x);
    if (n() > 2 && lean > d.r * 1.5) { s.toppling = s.t; blip(150, 0.25, 'sine', 0.2); setTimeout(end, 900); return; }
    nowEl.textContent = n() + (n() === 1 ? ' star high' : ' stars high');
    setTimeout(() => { if (alive) nextStar(); }, 180);
  }
  const com = () => s.tower.reduce((a, b) => a + b.x, 0) / (n() || 1);

  function step(dt) {
    const d = dims(); s.t += dt;
    const speed = Math.min(3.4, 1.9 + n() * 0.06); // a little quicker as it grows, then it settles
    s.phase += speed * dt;
    // a perfect drop eases the whole tower back toward the middle a little
    if (s.settle > 0) { const k = Math.min(s.settle, dt * 3); const mid = s.tower[0].x; s.tower.forEach((a, i) => { if (i) a.x += (mid - a.x) * 0.25 * k; }); s.settle -= dt * 3; }
    if (s.fall) { s.fall.vy += 2600 * dt; s.fall.y -= s.fall.vy * dt; if (s.fall.y <= starY(d, n())) { s.fall.y = starY(d, n()); land(d); } }
    if (s.tumble) { const t = s.tumble; t.vy += 2000 * dt; t.x += t.vx * dt; t.y -= t.vy * dt; t.rot += Math.sign(t.vx) * 6 * dt; }
    const want = Math.max(0, starY(d, n()) - (d.ground - d.H * 0.55));
    s.cam += (want - s.cam) * Math.min(1, dt * 4);
    s.pops.forEach(p => { p.y += 40 * dt; p.life -= dt; }); s.pops = s.pops.filter(p => p.life > 0);
  }

  function end() {
    if (s.dead) return; s.dead = true; alive = false;
    const h = n(), best = h > rec.best;
    rec.runs++; if (best) rec.best = h; save(); bestText();
    over.innerHTML = (h
      ? '<h1>' + (s.toppling ? 'Timber!' : 'Whoops, it slipped!') + '</h1><p class="big">' + h + (h === 1 ? ' star high' : ' stars high') + '</p><p>' + (placeOf(h) ? esc(placeOf(h)[0].toUpperCase() + placeOf(h).slice(1)) + '! ' : 'A cosy little tower. ') + (best ? 'A new best! ⭐' : 'Your best is ' + rec.best + '.') + '</p>'
      : '<h1>Missed the shelf!</h1><p>Tap when the star is right above it.</p>') +
      '<button type="button" class="btn" id="stkGo">Again</button><a class="btn alt" href="#/home">Back home</a>';
    over.classList.remove('gone');
  }

  // ---------- drawing ----------
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  function skyAt(alt) { // alt in stars
    if (alt <= SKY[0][0]) return SKY[0][1];
    for (let i = 1; i < SKY.length; i++) if (alt <= SKY[i][0]) return mix(SKY[i - 1][1], SKY[i][1], (alt - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0]));
    return SKY[SKY.length - 1][1];
  }
  function cloud(x, y, k) { g.beginPath(); [[0, 0, 26], [24, -10, 22], [48, 0, 24], [22, 8, 22]].forEach(([dx, dy, r]) => { g.moveTo(x + dx * k + r * k, y + dy * k); g.arc(x + dx * k, y + dy * k, r * k, 0, 7); }); g.fill(); }
  function draw() {
    const d = dims(), dk = dark(), alt = y => toWorld(d, y) / d.step;
    // the sky, in bands
    for (let y = 0; y < d.H; y += 16) { const c = skyAt(alt(y)); g.fillStyle = 'rgb(' + c.join(',') + ')'; g.fillRect(0, y, d.W, 17); }
    // the room wall up to the window line, with the window
    const wallTop = toScreen(d, 8 * d.step);
    if (wallTop > 0) {
      g.fillStyle = dk ? '#2E241C' : '#FBEFD9'; g.fillRect(0, Math.max(0, wallTop), d.W, d.H);
      const wy0 = toScreen(d, 6.5 * d.step), wy1 = toScreen(d, 2.5 * d.step), wx = d.W * 0.06, ww = d.W * 0.24;
      g.fillStyle = '#BFD8FF'; g.fillRect(wx, wy0, ww, wy1 - wy0);
      g.strokeStyle = dk ? '#6B5A48' : '#C98F6B'; g.lineWidth = 6; g.strokeRect(wx, wy0, ww, wy1 - wy0);
      g.beginPath(); g.moveTo(wx + ww / 2, wy0); g.lineTo(wx + ww / 2, wy1); g.moveTo(wx, (wy0 + wy1) / 2); g.lineTo(wx + ww, (wy0 + wy1) / 2); g.lineWidth = 4; g.stroke();
      g.fillStyle = dk ? '#3A2E24' : '#F3E3C6'; g.fillRect(0, wallTop - 6, d.W, 6);
    }
    // clouds, birds, night stars and the moon, fixed in the world
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 9; i++) { const y = toScreen(d, (13 + i * 2.2) * d.step); if (y > -60 && y < d.H + 60) cloud((i % 2 ? d.W * 0.62 : d.W * 0.08) + (i * 37) % 50, y, 0.9 + (i % 3) * 0.2); }
    g.strokeStyle = '#3A3F55'; g.lineWidth = 2.5; g.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const y = toScreen(d, (23 + i * 1.6) * d.step), x = ((i * 97) % (d.W - 60)) + 20 + Math.sin(s.t * 1.2 + i) * 14, f = Math.sin(s.t * 9 + i) * 4; if (y > -20 && y < d.H + 20) { g.beginPath(); g.moveTo(x, y - f); g.quadraticCurveTo(x + 7, y - 5, x + 13, y + 1); g.quadraticCurveTo(x + 19, y - 5, x + 26, y - f); g.stroke(); } }
    g.fillStyle = 'rgba(255,248,225,.9)';
    for (let i = 0; i < 70; i++) { const y = toScreen(d, (38 + (i * 13) % 40 + (i % 7) * 0.3) * d.step); if (y > 0 && y < d.H) g.fillRect((i * 89) % d.W, y, 2, 2); }
    const my = toScreen(d, 62 * d.step); if (my > -80 && my < d.H + 80) { g.fillStyle = '#FFF1A8'; g.beginPath(); g.arc(d.W * 0.74, my, 44, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.06)'; g.beginPath(); g.arc(d.W * 0.74 - 12, my - 8, 8, 0, 7); g.arc(d.W * 0.74 + 14, my + 12, 6, 0, 7); g.fill(); }
    // the shelf
    const sy = toScreen(d, 0);
    if (sy < d.H + 40) {
      g.fillStyle = dk ? '#7A5A3E' : '#C98F6B'; g.fillRect(d.W / 2 - d.shelfW / 2, sy, d.shelfW, 14);
      g.fillStyle = dk ? '#5E4530' : '#A9714F'; g.fillRect(d.W / 2 - d.shelfW / 2 + 22, sy + 14, 10, 26); g.fillRect(d.W / 2 + d.shelfW / 2 - 32, sy + 14, 10, 26);
    }
    // the tower, swaying a little more the more it leans
    const lean = n() ? (com() - s.tower[0].x) / (d.r * 1.5) : 0, top = n();
    const fall = s.toppling ? Math.min(1, (s.t - s.toppling) * 1.4) : 0;
    s.tower.forEach((a, i) => {
      const k = top > 1 ? i / (top - 1) : 0, sway = Math.sin(s.t * 3) * Math.abs(lean) * 6 * k;
      let x = a.x + sway, y = toScreen(d, starY(d, i)), rot = 0;
      if (fall) { const ang = Math.sign(lean || 1) * fall * 1.1 * k; x += Math.sin(ang) * (starY(d, i)) * 0.6; y += (1 - Math.cos(ang)) * starY(d, i) * 0.6 + fall * fall * 200 * k; rot = ang; }
      const pop = Math.max(0, 1 - (s.t - a.land) * 6); // a little squash when it lands
      g.save(); g.translate(x, y); g.scale(1 + pop * 0.12, 1 - pop * 0.12); paperStar(g, 0, 0, d.r, a.c, rot); g.restore();
    });
    s.sparks = s.sparks.filter(p => s.t - p.t < 0.7);
    s.sparks.forEach(p => { const k = (s.t - p.t) / 0.7, y = toScreen(d, p.y); g.globalAlpha = 1 - k; for (let j = 0; j < 8; j++) { const an = j * Math.PI / 4; paperStar(g, p.x + Math.cos(an) * d.r * (1 + k * 1.4), y + Math.sin(an) * d.r * (1 + k * 1.4), 5, '#FFE36E', 0, 'rgba(0,0,0,0)'); } g.globalAlpha = 1; });
    // the swinging star and its string
    if (s.cur && !s.dead) {
      const x = swingX(d); g.strokeStyle = dk || alt(d.hangY) > 36 ? 'rgba(243,238,223,.6)' : 'rgba(35,38,47,.45)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(d.W / 2, 0); g.lineTo(x, d.hangY - d.r * 0.9); g.stroke();
      paperStar(g, x, d.hangY, d.r, s.cur.c, Math.sin(s.phase) * 0.18);
    }
    if (s.fall) paperStar(g, s.fall.x, toScreen(d, s.fall.y), d.r, s.fall.c);
    if (s.tumble) paperStar(g, s.tumble.x, toScreen(d, s.tumble.y), d.r, s.tumble.c, s.tumble.rot);
    s.pops.forEach(p => {
      const y = toScreen(d, p.y), night = alt(y) > 36; g.globalAlpha = Math.max(0, Math.min(1, p.life)); g.font = '900 ' + (p.big ? 24 : 20) + 'px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (p.big) { const w = g.measureText(p.text).width + 34; g.fillStyle = night ? 'rgba(28,24,21,.8)' : 'rgba(255,253,246,.9)'; g.beginPath(); g.roundRect ? g.roundRect(p.x - w / 2, y - 22, w, 44, 22) : g.rect(p.x - w / 2, y - 22, w, 44); g.fill(); }
      g.fillStyle = night ? '#FFE36E' : '#23262F'; g.fillText(p.text, p.x, y); g.globalAlpha = 1; g.textBaseline = 'alphabetic';
    });
    root.classList.toggle('night', alt(d.H * 0.1) > 36);
  }

  let last = 0;
  function loop(now) {
    const dt = Math.min(0.033, (now - (last || now)) / 1000); last = now;
    step(dt); draw();
    if (alive || (!s.dead && (s.tumble || s.toppling))) raf = requestAnimationFrame(loop);
  }
  function start() { reset(); s.toppling = 0; nowEl.textContent = ''; over.classList.add('gone'); alive = true; last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }

  root.addEventListener('pointerdown', e => { if (e.target.closest('a, button')) return; if (alive) { e.preventDefault(); drop(); } });
  root.addEventListener('click', e => {
    if (e.target.closest('#stkGo')) start();
    if (e.target.closest('#stkSound')) e.target.closest('#stkSound').textContent = toggleSound() ? '🔊' : '🔈';
    if (e.target.closest('#stkResume')) { over.classList.add('gone'); alive = true; last = 0; raf = requestAnimationFrame(loop); }
  });
  const onKey = e => { if (e.code === 'Space' || e.code === 'ArrowDown') { e.preventDefault(); if (alive) drop(); else if (!over.classList.contains('gone')) start(); } };
  const onVis = () => { if (document.hidden && alive) { alive = false; cancelAnimationFrame(raf); over.innerHTML = '<h1>Paused</h1><p>' + (n() ? n() + (n() === 1 ? ' star' : ' stars') + ' high so far.' : 'Ready when you are.') + '</p><button type="button" class="btn" id="stkResume">Keep going</button>'; over.classList.remove('gone'); } };
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  cleanup = () => { stop(); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); };
  draw();
}
