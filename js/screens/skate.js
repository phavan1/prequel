// Skate home: an endless runner. Tap to jump, tap again in the air for a double jump.
// Dodge cones, bins and puddles, catch stars for bonus points. Only your own best is kept.
import { get, save } from '../store.js';
import { esc, reduceMotion } from '../ui.js';

const OOPS = ['Wipeout!', 'Oof, the pavement.', 'Bailed it!', 'Splat. Still cool.', 'Down he goes!'];
let raf = 0, alive = false, cleanup = null;

export function unmount() { cancelAnimationFrame(raf); alive = false; if (cleanup) cleanup(); }

export function mount(root) {
  const st = get();
  st.games = st.games || {}; st.games.skate = st.games.skate || { best: 0, runs: 0 };
  const rec = st.games.skate;
  root.innerHTML = '<canvas id="sk" aria-label="Skate home game"></canvas>' +
    '<div class="sk-hud"><a class="sk-back" href="#/home">‹ Home</a><span id="skScore">0 m</span><span id="skBest">Best ' + rec.best + ' m</span></div>' +
    '<div class="sk-over" id="skOver"><h1>Skate home</h1><p>Tap to jump. Tap again in the air for a double jump.<br>Dodge the bumps, grab the stars.</p><button type="button" class="btn" id="skGo">Start skating</button></div>';
  const cv = root.querySelector('#sk'), g = cv.getContext('2d');
  const over = root.querySelector('#skOver'), scoreEl = root.querySelector('#skScore'), bestEl = root.querySelector('#skBest');
  const img = new Image(); img.src = 'art/skate.webp';
  let W = 0, H = 0, ground = 0, dpr = 1;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0); ground = Math.round(H * 0.78);
  }
  size(); window.addEventListener('resize', size);

  const hour = new Date().getHours(), night = hour < 6 || hour >= 19;
  root.classList.toggle('night', night);
  const PH = Math.min(110, Math.max(84, H * 0.13)), PW = PH * 506 / 640;
  let s; // the run
  function reset() {
    s = { t: 0, speed: 270, dist: 0, bonus: 0, y: 0, vy: 0, jumps: 0, obs: [], stars: [], pops: [], nextGap: 380, scroll: 0, dead: false };
  }
  reset();
  const px = () => Math.round(W * 0.16);

  function spawn() {
    const m = s.dist / 10, r = Math.random();
    let o;
    if (m > 250 && r < 0.14) o = { k: 'bird', w: 34, h: 18, y: ground - PH - 70 - Math.random() * 40 };
    else if (r < 0.34) o = { k: 'cone', w: 26, h: 34 };
    else if (r < 0.52) o = { k: 'puddle', w: 64 + Math.random() * 30, h: 7 };
    else if (r < 0.7) o = { k: 'bin', w: 34, h: 46 };
    else if (m > 120 && r < 0.86) o = { k: 'cones', w: 58, h: 34 };
    else o = { k: 'hydrant', w: 24, h: 38 };
    o.x = W + 40; if (o.y == null) o.y = ground - o.h;
    s.obs.push(o);
    if (Math.random() < 0.45) { const n = 1 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) s.stars.push({ x: W + 40 + o.w / 2 + (i - (n - 1) / 2) * 30, y: ground - PH - 40 - Math.random() * 50, got: false, gold: Math.random() < 0.15 }); }
    s.nextGap = s.speed * (0.85 + Math.random() * 0.9) + o.w;
  }

  function jump() {
    if (s.dead) return;
    if (s.y === 0) { s.vy = -880; s.jumps = 1; }
    else if (s.jumps < 2) { s.vy = -740; s.jumps = 2; }
  }

  function step(dt) {
    s.t += dt;
    s.speed = Math.min(760, 270 + s.t * 9);
    const dx = s.speed * dt;
    s.dist += dx; s.scroll += dx;
    s.vy += 2500 * dt; s.y = Math.min(0, s.y + s.vy * dt);
    if (s.y === 0) { s.vy = 0; s.jumps = 0; }
    s.nextGap -= dx; if (s.nextGap <= 0) spawn();
    s.obs.forEach(o => { o.x -= dx * (o.k === 'bird' ? 1.25 : 1); });
    s.obs = s.obs.filter(o => o.x + o.w > -60);
    s.stars.forEach(a => { a.x -= dx; });
    s.stars = s.stars.filter(a => a.x > -30 && !a.gone);
    s.pops.forEach(p => { p.y -= 40 * dt; p.life -= dt; });
    s.pops = s.pops.filter(p => p.life > 0);
    // a forgiving hitbox: roughly his legs and board
    const x0 = px() + PW * 0.3, x1 = px() + PW * 0.72, top = ground - PH * 0.86 + s.y, bot = ground + s.y - 4;
    for (const o of s.obs) {
      const pad = o.k === 'puddle' ? 12 : 4;
      if (x1 > o.x + pad && x0 < o.x + o.w - pad && bot > o.y + (o.k === 'puddle' ? 2 : 3) && top < o.y + o.h) { die(); return; }
    }
    for (const a of s.stars) {
      if (!a.got && a.x > x0 - 14 && a.x < x1 + 14 && a.y > top - 14 && a.y < bot) { a.got = true; a.gone = true; const v = a.gold ? 25 : 10; s.bonus += v; s.pops.push({ x: a.x, y: a.y, v, life: 0.8 }); }
    }
  }

  function score() { return Math.floor(s.dist / 10) + s.bonus; }

  function die() {
    s.dead = true; alive = false;
    const sc = score(), best = sc > rec.best;
    rec.runs++; if (best) rec.best = sc; save();
    bestEl.textContent = 'Best ' + rec.best + ' m';
    setTimeout(() => {
      over.innerHTML = '<h1>' + esc(OOPS[Math.floor(Math.random() * OOPS.length)]) + '</h1><p class="big">' + sc + ' m</p><p>' + (best ? 'A new best! ✦' : 'Your best is ' + rec.best + ' m.') + '</p>' +
        '<button type="button" class="btn" id="skGo">Again</button><a class="btn alt" href="#/home">Back home</a>';
      over.classList.remove('gone');
    }, 450);
  }

  // ---------- drawing ----------
  function hills(off, amp, base, col, f) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 10) g.lineTo(x, base - amp * (0.6 + 0.4 * Math.sin((x + off) * f) * Math.sin((x + off) * f * 0.37 + 1)));
    g.lineTo(W, H); g.fill();
  }
  const houseSeed = Array.from({ length: 12 }, (_, i) => ({ w: 46 + (i * 37) % 40, h: 40 + (i * 53) % 50, roof: i % 3 }));
  function draw() {
    const sky = g.createLinearGradient(0, 0, 0, ground);
    if (night) { sky.addColorStop(0, '#141A33'); sky.addColorStop(1, '#3A3F7A'); } else { sky.addColorStop(0, '#BFD8FF'); sky.addColorStop(1, '#FFF1D6'); }
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    if (night) { g.fillStyle = 'rgba(255,248,225,.8)'; for (let i = 0; i < 50; i++) { const x = (i * 97 - s.scroll * 0.02) % W, y = (i * 53) % (ground * 0.6); g.fillRect((x + W) % W, y, 1.5, 1.5); } }
    else { g.fillStyle = '#FFE08A'; g.beginPath(); g.arc(W * 0.8, H * 0.14, 26, 0, 7); g.fill(); }
    hills(s.scroll * 0.08, 60, ground - 70, night ? '#2B3266' : '#CFE3C9', 0.006);
    // houses
    const hs = s.scroll * 0.3; let x = -(hs % 700);
    for (let r = 0; r < 3; r++) houseSeed.forEach((h, i) => {
      const hx = x + i * 60 + r * 700 - 60; if (hx > W + 80 || hx < -100) return;
      g.fillStyle = night ? '#232A57' : ['#F3D9B1', '#E9C9A0', '#DCCDB8'][i % 3];
      g.fillRect(hx, ground - h.h, h.w, h.h);
      g.fillStyle = night ? '#1B2147' : '#C98F6B'; g.beginPath(); g.moveTo(hx - 4, ground - h.h); g.lineTo(hx + h.w / 2, ground - h.h - 18 - h.roof * 4); g.lineTo(hx + h.w + 4, ground - h.h); g.fill();
      g.fillStyle = night ? (i % 2 ? '#F4C430' : '#3A4280') : '#FFFDF6'; g.fillRect(hx + h.w * 0.3, ground - h.h * 0.7, 10, 10);
    });
    // pavement
    g.fillStyle = night ? '#4A4F72' : '#D8CDB8'; g.fillRect(0, ground, W, H - ground);
    g.fillStyle = night ? '#5A6088' : '#E8DFCC'; g.fillRect(0, ground, W, 6);
    g.strokeStyle = night ? '#6B719A' : '#C7BBA3'; g.lineWidth = 2;
    for (let lx = -(s.scroll % 60); lx < W; lx += 60) { g.beginPath(); g.moveTo(lx, ground + 6); g.lineTo(lx - 14, H); g.stroke(); }
    const road = ground + Math.min(70, (H - ground) * 0.45);
    g.fillStyle = night ? '#2E3254' : '#7A7F8E'; g.fillRect(0, road, W, H - road);
    g.fillStyle = night ? '#F4C43099' : '#F4E3A1'; for (let lx = -(s.scroll * 1.0 % 90); lx < W; lx += 90) g.fillRect(lx, road + (H - road) / 2 - 3, 46, 6);
    // obstacles
    s.obs.forEach(o => {
      if (o.k === 'cone' || o.k === 'cones') {
        const n = o.k === 'cones' ? 2 : 1;
        for (let i = 0; i < n; i++) { const cx = o.x + i * 32; g.fillStyle = '#F2A65A'; g.beginPath(); g.moveTo(cx + 13, o.y); g.lineTo(cx + 24, o.y + o.h - 4); g.lineTo(cx + 2, o.y + o.h - 4); g.fill(); g.fillStyle = '#FFFDF6'; g.fillRect(cx + 7, o.y + 15, 12, 5); g.fillStyle = '#D9673B'; g.fillRect(cx - 1, o.y + o.h - 5, 28, 5); }
      } else if (o.k === 'puddle') {
        g.fillStyle = night ? '#6F86C9' : '#9FC1F0'; g.beginPath(); g.ellipse(o.x + o.w / 2, ground + 2, o.w / 2, 7, 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(o.x + o.w / 2, ground + 2, o.w / 4, 3, 0, 0, 7); g.stroke();
      } else if (o.k === 'bin') {
        g.fillStyle = '#5DAE7E'; g.fillRect(o.x + 2, o.y + 6, o.w - 4, o.h - 6); g.fillStyle = '#3E8E62'; g.fillRect(o.x, o.y, o.w, 8); g.fillRect(o.x + 12, o.y - 4, 10, 4);
      } else if (o.k === 'hydrant') {
        g.fillStyle = '#E2402F'; g.fillRect(o.x + 4, o.y + 8, o.w - 8, o.h - 8); g.beginPath(); g.arc(o.x + o.w / 2, o.y + 9, 8, Math.PI, 0); g.fill(); g.fillRect(o.x, o.y + 16, o.w, 6);
      } else if (o.k === 'bird') {
        const f = Math.sin(s.t * 14) * 6; g.strokeStyle = night ? '#F3EEDF' : '#23262F'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(o.x, o.y + 6 - f); g.quadraticCurveTo(o.x + 9, o.y + 2, o.x + 17, o.y + 9); g.quadraticCurveTo(o.x + 25, o.y + 2, o.x + 34, o.y + 6 - f); g.stroke();
      }
    });
    // stars to grab
    s.stars.forEach(a => { if (a.got) return; star(a.x, a.y + Math.sin(s.t * 4 + a.x) * 3, a.gold ? 10 : 8, a.gold ? '#F4C430' : '#FFF1A8'); });
    // him
    const y = ground - PH + s.y + 2;
    g.save(); g.translate(px() + PW / 2, y + PH / 2); if (s.y < 0) g.rotate(Math.max(-0.22, Math.min(0.12, s.vy / 4000)));
    if (s.dead) g.rotate(0.5);
    if (img.complete) g.drawImage(img, -PW / 2, -PH / 2, PW, PH);
    g.restore();
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(px() + PW / 2, ground + 4, PW * 0.38 * (1 + s.y / 400), 4, 0, 0, 7); g.fill();
    s.pops.forEach(p => { g.globalAlpha = Math.max(0, p.life / 0.8); g.fillStyle = night ? '#FFF1A8' : '#23262F'; g.font = '900 16px Nunito, sans-serif'; g.fillText('+' + p.v, p.x - 10, p.y); g.globalAlpha = 1; });
    scoreEl.textContent = score() + ' m';
  }
  function star(x, y, r, c) {
    g.fillStyle = c; g.strokeStyle = 'rgba(35,38,47,.25)'; g.lineWidth = 1; g.beginPath();
    for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.45 : r, an = k * Math.PI / 5 - Math.PI / 2; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
    g.closePath(); g.fill(); g.stroke();
  }

  let last = 0;
  function loop(now) {
    if (!alive) { draw(); return; }
    const dt = Math.min(0.033, (now - (last || now)) / 1000); last = now;
    step(dt); draw();
    raf = requestAnimationFrame(loop);
  }
  function start() { reset(); over.classList.add('gone'); alive = true; last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }

  const onDown = e => {
    if (e.target.closest('a, button')) return;
    if (alive) { e.preventDefault(); jump(); }
  };
  const onKey = e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); if (alive) jump(); else if (!over.classList.contains('gone')) start(); } };
  const onVis = () => { if (document.hidden && alive) { alive = false; over.innerHTML = '<h1>Paused</h1><p>' + score() + ' m so far.</p><button type="button" class="btn" id="skResume">Keep going</button>'; over.classList.remove('gone'); } };
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('click', e => {
    if (e.target.closest('#skGo')) start();
    if (e.target.closest('#skResume')) { over.classList.add('gone'); alive = true; last = 0; raf = requestAnimationFrame(loop); }
  });
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  cleanup = () => { window.removeEventListener('resize', size); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); };
  img.onload = () => draw();
  draw();
  if (reduceMotion) { /* the game is opt-in, so it still runs; nothing flashes */ }
}
