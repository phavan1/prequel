// Little helpers shared by the soft-day games (v56): Keep it up and Stack the stars.
// Skate home predates this and keeps its own copies.
import { get, save } from './store.js';

// a game's own record in st.games, e.g. { best, runs }
export function record(key, extra) {
  const st = get(); st.games = st.games || {};
  st.games[key] = Object.assign({ best: 0, runs: 0 }, extra || {}, st.games[key] || {});
  return st.games[key];
}
export const dark = () => document.documentElement.dataset.theme === 'dark';

// a full-screen canvas that stays sharp on retina screens
export function fullCanvas(cv, onSize) {
  const g = cv.getContext('2d'); const box = { W: 0, H: 0 };
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); box.W = window.innerWidth; box.H = window.innerHeight;
    cv.width = box.W * dpr; cv.height = box.H * dpr; cv.style.width = box.W + 'px'; cv.style.height = box.H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size(); // the game draws itself once it's set up; after that, redraw on resize
  const resized = () => { size(); if (onSize) onSize(box); };
  window.addEventListener('resize', resized);
  return { g, box, stop: () => window.removeEventListener('resize', resized) };
}

// sound is off unless you turn it on (one switch for both games)
export const soundOn = () => !!(get().games && get().games.sound);
export function toggleSound() { const st = get(); st.games = st.games || {}; st.games.sound = !st.games.sound; save(); if (st.games.sound) blip(660, 0.05); return st.games.sound; }
let ac = null;
export function blip(freq, len = 0.09, type = 'sine', vol = 0.18) {
  if (!soundOn()) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.25, t + len);
    v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + len * 2.2);
    o.connect(v); v.connect(ac.destination); o.start(t); o.stop(t + len * 2.4);
  } catch (e) { /* sound is a bonus */ }
}
export const soundIcon = () => soundOn() ? '🔊' : '🔈';

// a chubby paper star, the same one the jar uses in spirit
export function paperStar(g, x, y, r, fill, rot = 0, line = 'rgba(35,38,47,.35)') {
  g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
  for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.52 : r, an = k * Math.PI / 5 - Math.PI / 2; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
  g.closePath(); g.lineJoin = 'round'; g.fillStyle = fill; g.fill();
  g.lineWidth = Math.max(1.5, r * 0.07); g.strokeStyle = line; g.stroke();
  // the folded-paper crease: a lighter half on each point
  g.fillStyle = 'rgba(255,255,255,.28)';
  for (let k = 0; k < 5; k++) { const an = k * 2 * Math.PI / 5 - Math.PI / 2, an2 = an + Math.PI / 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an) * r, Math.sin(an) * r); g.lineTo(Math.cos(an2) * r * 0.52, Math.sin(an2) * r * 0.52); g.closePath(); g.fill(); }
  g.restore();
}
export const PAPER = ['#F4C430', '#F7A6B8', '#9FC1F0', '#A9DDB8', '#C9B2E8', '#FFB27A', '#FFE36E'];
