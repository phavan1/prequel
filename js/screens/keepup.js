// Keep it up (v56): slide the pillow to keep your emoji in the air, like Instagram's DM game.
// Game speed: every bounce makes it a little quicker. The count only appears after the first bounce (no zeros),
// every 10 bounces lights a little star in the background, and only your own best is kept.
import { save } from '../store.js';
import { esc } from '../ui.js';
import { record, dark, fullCanvas, blip, toggleSound, soundIcon, paperStar } from '../gamekit.js';

const PICKS = ['star', '😄', '🥲', '🍵', '🎧', '🐣', '🏀'];
const OOPS = ['It got away!', 'Whoops!', 'Dropped it!', 'So close!', 'Down it goes!'];
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const firstChar = v => { v = (v || '').trim(); if (!v) return ''; try { if (window.Intl && Intl.Segmenter) return [...new Intl.Segmenter().segment(v)][0].segment; } catch (e) { /* older phones */ } return Array.from(v)[0]; };
let raf = 0, alive = false, cleanup = null;

export function unmount() { cancelAnimationFrame(raf); alive = false; if (cleanup) cleanup(); }

export function mount(root) {
  const rec = record('keepup', { emoji: 'star' });
  root.innerHTML = '<canvas id="ku" aria-label="Keep it up game"></canvas>' +
    '<div class="sk-hud"><a class="sk-back" href="#/home">‹ Home</a><span id="kuBest" class="gbest"></span><button type="button" class="sk-back gsound" id="kuSound" aria-label="Sound on or off">' + soundIcon() + '</button></div>' +
    '<div class="sk-over" id="kuOver"></div>';
  const cv = root.querySelector('#ku'), over = root.querySelector('#kuOver'), bestEl = root.querySelector('#kuBest');
  const { g, box, stop } = fullCanvas(cv, () => { if (!alive) draw(); });
  const bestText = () => { bestEl.textContent = rec.best ? 'Best ' + rec.best : ''; };
  bestText();

  let s;
  const dims = () => {
    const W = box.W, H = box.H, py = H * 0.82, r = Math.max(24, Math.min(38, W * 0.08)), pw = Math.max(110, Math.min(170, W * 0.34));
    const h = py - H * 0.2, tUp = 0.62, G = 2 * h / (tUp * tUp);
    return { W, H, py, r, pw, ph: 30, G, V0: G * tUp, VX: W * 0.95 };
  };
  function reset() {
    const d = dims();
    s = { n: 0, ts: 1, x: d.W / 2, y: d.H * 0.26, vx: (Math.random() - 0.5) * d.W * 0.25, vy: 0, rot: 0, spin: (Math.random() - 0.5) * 2, squish: 0, px: d.W / 2, tx: d.W / 2, pillow: 0, stars: [], pops: [], t: 0, dead: false };
  }
  reset();

  function startScreen() {
    const own = PICKS.includes(rec.emoji) ? '' : rec.emoji;
    over.innerHTML = '<h1>Keep it up</h1><p>Slide the pillow with your finger.<br>Don\'t let it drop!</p>' +
      '<div class="emopick" role="group" aria-label="What bounces">' + PICKS.concat(own ? [own] : []).map(e => '<button type="button" data-emo="' + esc(e) + '" aria-pressed="' + (rec.emoji === e) + '" aria-label="' + (e === 'star' ? 'Paper star' : esc(e)) + '">' + (e === 'star' ? '<i class="pstar"></i>' : esc(e)) + '</button>').join('') + '</div>' +
      '<input id="kuOwn" class="emoown" placeholder="or your own emoji" aria-label="Your own emoji" autocomplete="off">' +
      '<button type="button" class="btn" id="kuGo">Start</button>';
    over.classList.remove('gone');
  }
  startScreen();
  root.__game = () => ({ s, d: dims() }); // for the automated tests only

  function bounce(d) {
    s.y = d.py - d.r; s.vy = -d.V0;
    const off = Math.max(-1, Math.min(1, (s.x - s.px) / (d.pw / 2)));
    s.vx = off * d.VX + s.vx * 0.2; s.spin = off * 9 + (Math.random() - 0.5); s.squish = 1; s.pillow = 1;
    s.n++; s.ts = Math.min(2.6, 1 + s.n * 0.05); // game speed: quicker with every bounce
    blip(420 + (s.n % 12) * 34);
    if (s.n % 10 === 0) {
      s.stars.push({ x: d.W * (0.1 + Math.random() * 0.8), y: d.H * (0.08 + Math.random() * 0.5), r: 5 + Math.random() * 5, born: s.t });
      s.pops.push({ x: s.x, y: s.y - d.r * 1.6, text: s.n + '! ✦', life: 1 });
      blip(880, 0.12, 'triangle');
    }
  }

  function step(dt) {
    const d = dims(), sd = dt * s.ts; s.t += dt;
    s.px += (s.tx - s.px) * Math.min(1, dt * 30);
    s.px = Math.max(d.pw / 2, Math.min(d.W - d.pw / 2, s.px));
    const prevBottom = s.y + d.r;
    s.vy += d.G * sd; s.x += s.vx * sd; s.y += s.vy * sd; s.rot += s.spin * sd;
    if (s.x < d.r) { s.x = d.r; s.vx = Math.abs(s.vx) * 0.9; }
    if (s.x > d.W - d.r) { s.x = d.W - d.r; s.vx = -Math.abs(s.vx) * 0.9; }
    if (s.y < d.r + 60 && s.vy < 0) { s.y = d.r + 60; s.vy = Math.abs(s.vy) * 0.4; }
    if (s.vy > 0 && prevBottom <= d.py + 4 && s.y + d.r >= d.py && Math.abs(s.x - s.px) <= d.pw / 2 + d.r * 0.55) bounce(d);
    s.squish = Math.max(0, s.squish - dt * 7); s.pillow = Math.max(0, s.pillow - dt * 6);
    s.pops.forEach(p => { p.y -= 50 * dt; p.life -= dt; }); s.pops = s.pops.filter(p => p.life > 0);
    if (s.y - d.r > d.H) end();
  }

  function end() {
    s.dead = true; alive = false;
    const n = s.n, best = n > rec.best;
    rec.runs++; if (best) rec.best = n; save(); bestText();
    setTimeout(() => {
      over.innerHTML = n
        ? '<h1>' + esc(OOPS[Math.floor(Math.random() * OOPS.length)]) + '</h1><p class="big">' + n + (n === 1 ? ' bounce' : ' bounces') + '</p><p>' + (best ? 'A new best! ⭐' : 'Your best is ' + rec.best + '.') + '</p>'
        : '<h1>It slipped right past</h1><p>Slide the pillow under it as it falls.</p>';
      over.innerHTML += '<button type="button" class="btn" id="kuGo">Again</button><button type="button" class="btn alt" id="kuPick">Change what bounces</button><a class="btn alt" href="#/home">Back home</a>';
      over.classList.remove('gone');
    }, 350);
  }

  // ---------- drawing ----------
  function pillow(d) {
    const w = d.pw, h = d.ph * (1 - s.pillow * 0.22), x = s.px - w / 2, y = d.py + (d.ph - h) * 0.6, k = 7;
    g.save();
    g.fillStyle = 'rgba(0,0,0,.10)'; g.beginPath(); g.ellipse(s.px, d.py + d.ph + 8, w * 0.46, 6, 0, 0, 7); g.fill();
    g.beginPath(); // puffy edges: each side bulges out a little
    g.moveTo(x + k, y); g.quadraticCurveTo(s.px, y - 7, x + w - k, y);
    g.quadraticCurveTo(x + w + 4, y - 3, x + w - 2, y + h / 2); g.quadraticCurveTo(x + w + 4, y + h + 3, x + w - k, y + h);
    g.quadraticCurveTo(s.px, y + h + 7, x + k, y + h);
    g.quadraticCurveTo(x - 4, y + h + 3, x + 2, y + h / 2); g.quadraticCurveTo(x - 4, y - 3, x + k, y);
    g.closePath(); g.fillStyle = dark() ? '#3D5A99' : '#BFD8FF'; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = dark() ? '#9FB8E8' : '#3D66C9'; g.stroke();
    g.setLineDash([5, 5]); g.lineWidth = 1.5; g.strokeStyle = dark() ? 'rgba(255,255,255,.45)' : 'rgba(61,102,201,.55)';
    g.beginPath(); g.moveTo(x + 14, y + 6); g.quadraticCurveTo(s.px, y + 1, x + w - 14, y + 6); g.stroke();
    g.restore();
  }
  function ball(d) {
    const sq = s.squish, sx = 1 + sq * 0.22, sy = 1 - sq * 0.22;
    g.save(); g.translate(s.x, s.y + sq * d.r * 0.15); g.scale(sx, sy);
    if (rec.emoji === 'star') paperStar(g, 0, 0, d.r * 1.08, '#F4C430', s.rot);
    else { g.rotate(s.rot); g.font = Math.round(d.r * 1.9) + 'px ' + EMOJI_FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(rec.emoji, 0, d.r * 0.08); }
    g.restore();
  }
  function draw() {
    const d = dims(), dk = dark();
    const bg = g.createLinearGradient(0, 0, 0, d.H);
    if (dk) { bg.addColorStop(0, '#1C1815'); bg.addColorStop(1, '#2E241C'); } else { bg.addColorStop(0, '#FFF6CF'); bg.addColorStop(1, '#FFE6C4'); }
    g.fillStyle = bg; g.fillRect(0, 0, d.W, d.H);
    s.stars.forEach(a => { const tw = 0.75 + 0.25 * Math.sin((s.t - a.born) * 3 + a.x); paperStar(g, a.x, a.y, a.r * Math.min(1, (s.t - a.born) * 3) * tw, dk ? '#F4C430' : '#FFD45A', 0, 'rgba(0,0,0,.12)'); });
    if (s.n > 0) { g.font = '900 ' + Math.round(Math.min(170, d.W * 0.42)) + 'px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = dk ? 'rgba(243,238,223,.13)' : 'rgba(35,38,47,.12)'; g.fillText(String(s.n), d.W / 2, d.H * 0.45); }
    pillow(d); ball(d);
    s.pops.forEach(p => { g.globalAlpha = Math.max(0, p.life); g.font = '900 22px Nunito, sans-serif'; g.textAlign = 'center'; g.fillStyle = dk ? '#FFE36E' : '#23262F'; g.fillText(p.text, p.x, p.y); g.globalAlpha = 1; });
  }

  let last = 0;
  function loop(now) {
    if (!alive) { draw(); return; }
    const dt = Math.min(0.033, (now - (last || now)) / 1000); last = now;
    step(dt); draw();
    raf = requestAnimationFrame(loop);
  }
  function start() { reset(); over.classList.add('gone'); alive = true; last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }

  const aim = e => { if (alive && !e.target.closest('a, button, input')) { e.preventDefault(); s.tx = e.clientX; } };
  root.addEventListener('pointerdown', aim);
  root.addEventListener('pointermove', aim);
  root.addEventListener('click', e => {
    let b;
    if (e.target.closest('#kuGo')) start();
    if (e.target.closest('#kuPick')) startScreen();
    if (e.target.closest('#kuSound')) e.target.closest('#kuSound').textContent = toggleSound() ? '🔊' : '🔈';
    if (e.target.closest('#kuResume')) { over.classList.add('gone'); alive = true; last = 0; raf = requestAnimationFrame(loop); }
    if ((b = e.target.closest('[data-emo]'))) { rec.emoji = b.dataset.emo; save(); over.querySelectorAll('[data-emo]').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); }
  });
  root.addEventListener('input', e => {
    if (!e.target.matches('#kuOwn')) return;
    const c = firstChar(e.target.value); if (!c) return;
    rec.emoji = c; save(); over.querySelectorAll('[data-emo]').forEach(x => x.setAttribute('aria-pressed', 'false')); draw();
  });
  const onKey = e => {
    if (e.target.matches && e.target.matches('input')) return;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); s.tx = s.px + (e.code === 'ArrowLeft' ? -60 : 60); }
    if (e.code === 'Space' && !alive && !over.classList.contains('gone')) { e.preventDefault(); start(); }
  };
  const onVis = () => { if (document.hidden && alive) { alive = false; over.innerHTML = '<h1>Paused</h1><p>' + (s.n ? s.n + (s.n === 1 ? ' bounce' : ' bounces') + ' so far.' : 'Ready when you are.') + '</p><button type="button" class="btn" id="kuResume">Keep going</button>'; over.classList.remove('gone'); } };
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  cleanup = () => { stop(); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); };
  draw();
}
