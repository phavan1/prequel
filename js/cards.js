// Share cards: story-sized (1080 x 1920) pictures drawn from your own data, in a few looks each.
// Everything is drawn here on a canvas, offline. Only what the card shows ever leaves the phone.
import { get, parseKey, dateKey, today } from './store.js';
import { AREAS, weatherByName } from './data.js';
import { updateSky, starPos, mulberry32, hashStr } from './sky-model.js';
import { patches, PAT } from './screens/quilt.js';
import { count, unitOf, ensureGoals } from './goals.js';

export const W = 1080, H = 1920;
const HAND = '"Gaegu", cursive', BODY = '"Nunito", system-ui, sans-serif';
const art = {};
export function loadArt(names) {
  return Promise.all(names.map(n => art[n] ? art[n] : (art[n] = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = 'art/' + n + '.webp'; }))));
}
export function fontsReady() {
  if (!document.fonts) return Promise.resolve();
  return Promise.all(['900 80px Nunito', '800 40px Nunito', '700 40px Gaegu'].map(f => document.fonts.load(f).catch(() => null)));
}

// ---------- little drawing helpers ----------
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function burst(g, x, y, ro, ri, n, rot) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = rot + i * Math.PI / n; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
function star5(g, x, y, r) { g.beginPath(); for (let k = 0; k < 10; k++) { const rr2 = k % 2 ? r * 0.45 : r, a = k * Math.PI / 5 - Math.PI / 2; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.closePath(); }
function grain(g, alpha, seed) {
  const r = mulberry32(seed || 7); g.save(); g.globalAlpha = alpha;
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? '#000' : '#fff'; g.fillRect(r() * W, r() * H, 1.6, 1.6); }
  g.restore();
}
function halftone(g, colour, gap, rad, x0, y0, x1, y1, fade) {
  g.save(); g.fillStyle = colour;
  for (let y = y0; y < y1; y += gap) for (let x = x0 + ((y / gap) % 2 ? gap / 2 : 0); x < x1; x += gap) {
    const k = fade ? Math.max(0, 1 - (y - y0) / (y1 - y0)) : 1; if (k <= 0.02) continue;
    g.beginPath(); g.arc(x, y, rad * k, 0, 7); g.fill();
  }
  g.restore();
}
function text(g, s, x, y, font, colour, align, maxW) {
  g.font = font; g.fillStyle = colour; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic';
  if (maxW) { let size = parseInt(font.match(/(\d+)px/)[1], 10); while (g.measureText(s).width > maxW && size > 20) { size -= 4; g.font = font.replace(/\d+px/, size + 'px'); } }
  g.fillText(s, x, y);
}
function drawArt(g, img, cx, bottom, h, flip) {
  if (!img) return; const w = h * img.width / img.height;
  g.save(); if (flip) { g.translate(cx, 0); g.scale(-1, 1); g.translate(-cx, 0); }
  g.drawImage(img, cx - w / 2, bottom - h, w, h); g.restore();
}
function footer(g, colour, sub) {
  text(g, 'prequel', W / 2, H - 120, '900 44px ' + BODY, colour, 'center');
  text(g, sub || 'the behind-the-scenes of everything I\'m becoming', W / 2, H - 70, '700 30px ' + HAND, colour, 'center');
}
const monthName = (d = new Date()) => d.toLocaleDateString('en-AU', { month: 'long' });

// ---------- 1. your sky ----------
function skyData() {
  const st = get(), sky = updateSky(), byId = Object.fromEntries(st.moments.map(m => [m.id, m]));
  const stars = [], cons = [];
  sky.clusters.forEach(cl => {
    cl.members.forEach(id => { const m = byId[id]; if (m) stars.push(Object.assign(starPos(m, cl), { colour: (AREAS[m.area] || AREAS.mind).colour, bright: m.bright })); });
    if (cl.con) cons.push({ name: cl.con.name, formed: cl.con.formed, edges: cl.con.edges.filter(e => byId[e[0]] && byId[e[1]]).map(e => [starPos(byId[e[0]], cl), starPos(byId[e[1]], cl)]) });
  });
  return { stars, cons, newest: cons.slice().sort((a, b) => b.formed - a.formed)[0] };
}
function plotSky(g, D, box, look) {
  const pts = D.stars; if (!pts.length) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pts.forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
  const pad = 60, k = Math.min((box.w - pad * 2) / Math.max(200, x1 - x0), (box.h - pad * 2) / Math.max(200, y1 - y0), 3.2);
  const cx = box.x + box.w / 2 - (x0 + x1) / 2 * k, cy = box.y + box.h / 2 - (y0 + y1) / 2 * k;
  const P = p => [cx + p.x * k, cy + p.y * k];
  g.save(); g.lineCap = 'round';
  D.cons.forEach(c => { g.strokeStyle = look.line; g.lineWidth = 3; g.globalAlpha = 0.75; c.edges.forEach(([a, b]) => { const A = P(a), B = P(b); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); }); });
  g.globalAlpha = 1;
  pts.forEach(p => {
    const [x, y] = P(p), r = 3 + p.size * 2.4 + (p.bright ? 4 : 0);
    const glow = g.createRadialGradient(x, y, 0, x, y, r * 5); glow.addColorStop(0, look.glow ? p.colour + 'AA' : p.colour + '55'); glow.addColorStop(1, p.colour + '00');
    g.fillStyle = glow; g.beginPath(); g.arc(x, y, r * 5, 0, 7); g.fill();
    g.fillStyle = look.core; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    if (p.bright) { g.strokeStyle = look.core; g.lineWidth = 2; g.beginPath(); g.moveTo(x - r * 3, y); g.lineTo(x + r * 3, y); g.moveTo(x, y - r * 3); g.lineTo(x, y + r * 3); g.stroke(); }
  });
  g.restore();
}
export const SKY_LOOKS = [
  { id: 'midnight', name: 'Midnight', bg: ['#070B1F', '#1B2557', '#3B2E6B'], line: '#F4C430', core: '#FFF8E1', ink: '#F3EEDF', soft: '#B8C2E6', glow: true },
  { id: 'dawn', name: 'Dawn', bg: ['#2B2F6B', '#B66C8E', '#F7B48A'], line: '#FFF1C4', core: '#FFFFFF', ink: '#FFF8EC', soft: '#FFE3D1', glow: true },
  { id: 'paper', name: 'Polaroid', bg: ['#F6EEDB', '#F6EEDB', '#EFE3C6'], line: '#F4C430', core: '#FFF8E1', ink: '#23262F', soft: '#5E584B', polaroid: true }
];
export function drawSky(g, look, imgs) {
  const D = skyData(), st = get();
  const gr = g.createLinearGradient(0, 0, 0, H); look.bg.forEach((c, i) => gr.addColorStop(i / (look.bg.length - 1), c));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  let box = { x: 60, y: 430, w: W - 120, h: 920 };
  if (look.polaroid) {
    halftone(g, 'rgba(31,85,208,.07)', 34, 4, 0, 0, W, H);
    g.save(); g.translate(W / 2, 900); g.rotate(-0.035);
    g.fillStyle = 'rgba(0,0,0,.12)'; rr(g, -440 + 14, -500 + 18, 880, 1060, 18); g.fill();
    g.fillStyle = '#FFFDF6'; rr(g, -440, -500, 880, 1060, 18); g.fill();
    const sg = g.createLinearGradient(0, -460, 0, 380); sg.addColorStop(0, '#0B1026'); sg.addColorStop(1, '#2A3170');
    g.fillStyle = sg; g.fillRect(-400, -460, 800, 840);
    g.fillStyle = 'rgba(244,196,48,.55)'; g.save(); g.rotate(0.06); g.fillRect(-90, -530, 180, 56); g.restore();
    text(g, D.newest ? D.newest.name : 'my little sky', 0, 470, '700 64px ' + HAND, '#23262F', 'center', 760);
    g.restore();
    const mr = mulberry32(3); g.fillStyle = 'rgba(255,248,225,.5)';
    box = { x: W / 2 - 400, y: 440, w: 800, h: 840 };
    g.save(); g.translate(W / 2, 900); g.rotate(-0.035); g.translate(-W / 2, -900);
    g.save(); g.beginPath(); g.rect(box.x, box.y, box.w, box.h); g.clip();
    for (let i = 0; i < 160; i++) g.fillRect(box.x + mr() * box.w, box.y + mr() * box.h, 2, 2);
    plotSky(g, D, box, Object.assign({}, look, { line: '#F4C430', core: '#FFF8E1' }));
    g.restore(); g.restore();
  } else {
    const r = mulberry32(11);
    for (let i = 0; i < 420; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.15 + r() * 0.5) + ')'; const s = r() * 2.6; g.fillRect(r() * W, r() * H, s, s); }
    const neb = g.createRadialGradient(W * 0.7, 820, 20, W * 0.7, 820, 640); neb.addColorStop(0, 'rgba(214,105,140,.28)'); neb.addColorStop(1, 'rgba(214,105,140,0)');
    g.fillStyle = neb; g.fillRect(0, 0, W, H);
    plotSky(g, D, box, look);
  }
  text(g, 'MY SKY SO FAR', W / 2, 180, '900 34px ' + BODY, look.soft, 'center');
  g.save(); g.font = '900 34px ' + BODY; g.restore();
  text(g, D.stars.length + (D.stars.length === 1 ? ' little star' : ' little stars'), W / 2, 290, '700 112px ' + HAND, look.ink, 'center', W - 120);
  const sub = (D.cons.length ? D.cons.length + (D.cons.length === 1 ? ' constellation' : ' constellations') + ' · ' : '') + 'every star is a day I showed up';
  text(g, sub, W / 2, 360, '800 36px ' + BODY, look.soft, 'center', W - 140);
  if (!look.polaroid && D.newest) {
    text(g, 'NEWEST CONSTELLATION', 80, 1500, '900 30px ' + BODY, look.soft);
    text(g, D.newest.name, 80, 1590, '700 84px ' + HAND, look.ink, 'left', 620);
  }
  drawArt(g, imgs.nightwatch, look.polaroid ? 860 : 880, H - 190, look.polaroid ? 300 : 330);
  grain(g, look.polaroid ? 0.05 : 0.06, 21);
  footer(g, look.soft);
}

// ---------- 2. milestones ----------
export function milestones() {
  const st = get(); ensureGoals(); const out = [];
  (st.goals || []).filter(g => g.finished).forEach(g => out.push({ id: 'g' + g.id, n: g.target, unit: unitOf(g), title: g.name, kicker: 'GOAL REACHED', line: 'counted up, one at a time' }));
  (st.goals || []).filter(g => !g.finished && count(g) > 0).forEach(g => out.push({ id: 'p' + g.id, n: count(g), unit: unitOf(g), title: g.name, kicker: 'SO FAR', line: 'on the way to ' + g.target }));
  if (st.sessions.length) out.push({ id: 's', n: st.sessions.length, unit: st.sessions.length === 1 ? 'session' : 'sessions', title: 'Gym sessions', kicker: 'SHOWED UP', line: 'slow is still moving' });
  const wins = st.moments.filter(m => m.area === 'win').length; if (wins) out.push({ id: 'w', n: wins, unit: 'tiny wins', title: 'Tiny wins', kicker: 'SMALL THINGS', line: 'on hard days, these are the big ones' });
  if (st.moments.length) out.push({ id: 'm', n: st.moments.length, unit: 'stars', title: 'Stars in my sky', kicker: 'MY SKY', line: 'every one a day I showed up' });
  const rd = new Set(st.rests.map(r => r.date)).size; if (rd) out.push({ id: 'r', n: rd, unit: 'days of rest', title: 'Rest', kicker: 'RESTED', line: 'rest is part of the plan' });
  return out;
}
export const MILE_LOOKS = [
  { id: 'comic', name: 'Comic', bg: '#1F55D0', dots: 'rgba(255,255,255,.10)', burst: '#F4C430', burst2: '#FFF1C4', num: '#23262F', ink: '#FFFFFF', soft: '#DCE7FF' },
  { id: 'sunny', name: 'Sunny', bg: '#F4C430', dots: 'rgba(35,38,47,.07)', burst: '#FFF8E1', burst2: '#FFFFFF', num: '#1F55D0', ink: '#23262F', soft: '#5E4A00' },
  { id: 'cream', name: 'Cream', bg: '#FAF3DC', dots: 'rgba(31,85,208,.06)', burst: '#1F55D0', burst2: '#DCE7FF', num: '#FFFFFF', ink: '#23262F', soft: '#5E584B' },
  { id: 'night', name: 'Night', bg: '#141A33', dots: 'rgba(255,255,255,.06)', burst: '#D6698C', burst2: '#F7B48A', rays: '#2C3768', num: '#FFFFFF', ink: '#F3EEDF', soft: '#B8C2E6' }
];
export function drawMilestone(g, look, imgs, m) {
  g.fillStyle = look.bg; g.fillRect(0, 0, W, H);
  halftone(g, look.dots, 30, 6, 0, 0, W, H);
  // rays behind the number
  g.save(); g.translate(W / 2, 760); g.fillStyle = look.rays || look.burst2; g.globalAlpha = look.rays ? 0.5 : 0.35;
  for (let i = 0; i < 18; i++) { g.rotate(Math.PI / 9); g.beginPath(); g.moveTo(0, 0); g.lineTo(-60, -1100); g.lineTo(60, -1100); g.closePath(); g.fill(); }
  g.restore();
  g.save(); g.translate(14, 18); g.fillStyle = 'rgba(0,0,0,.18)'; burst(g, W / 2, 760, 400, 300, 16, 0.1); g.fill(); g.restore();
  g.fillStyle = look.burst; burst(g, W / 2, 760, 400, 300, 16, 0.1); g.fill();
  g.lineWidth = 8; g.strokeStyle = '#23262F'; g.stroke();
  const ns = String(m.n), size = ns.length > 3 ? 230 : ns.length > 2 ? 280 : 340;
  g.save(); g.font = '900 ' + size + 'px ' + BODY; g.textAlign = 'center'; g.lineJoin = 'round';
  g.lineWidth = 22; g.strokeStyle = '#23262F'; g.strokeText(ns, W / 2, 760 + size * 0.36);
  g.fillStyle = look.num; g.fillText(ns, W / 2, 760 + size * 0.36); g.restore();
  // ribbon with the unit
  g.save(); g.translate(W / 2, 1110); g.rotate(-0.03);
  g.fillStyle = '#23262F'; rr(g, -330 + 10, -64 + 12, 660, 128, 22); g.fill();
  g.fillStyle = '#FFFDF6'; rr(g, -330, -64, 660, 128, 22); g.fill(); g.lineWidth = 6; g.strokeStyle = '#23262F'; g.stroke();
  text(g, m.unit.toUpperCase(), 0, 22, '900 64px ' + BODY, '#23262F', 'center', 600);
  g.restore();
  text(g, m.kicker, W / 2, 200, '900 40px ' + BODY, look.soft, 'center');
  text(g, m.title, W / 2, 300, '700 104px ' + HAND, look.ink, 'center', W - 120);
  text(g, m.line, W / 2, 1290, '700 58px ' + HAND, look.ink, 'center', W - 140);
  const sr = mulberry32(hashStr(m.id));
  [[150, 520], [930, 470], [880, 1020], [190, 1060], [990, 760], [90, 780]].forEach(([x, y]) => { g.fillStyle = sr() < 0.5 ? look.burst : look.burst2; star5(g, x, y, 22 + sr() * 26); g.fill(); g.lineWidth = 4; g.strokeStyle = '#23262F'; g.stroke(); });
  drawArt(g, imgs.cheer, W / 2, H - 200, 420);
  grain(g, 0.05, 33);
  footer(g, look.soft);
}

// ---------- 3. a month at a glance ----------
export const MONTH_LOOKS = [
  { id: 'journal', name: 'Journal', bg: '#FAF3DC', card: '#FFFDF6', line: '#E8DDC2', ink: '#23262F', soft: '#5E584B', accent: '#1F55D0' },
  { id: 'cosy', name: 'Cosy dark', bg: '#1C1815', card: '#2F2822', line: '#45392F', ink: '#F2E8DA', soft: '#BCAD9A', accent: '#F4C430' },
  { id: 'blue', name: 'Hoodie', bg: '#1F55D0', card: '#2E63DD', line: '#5B86E8', ink: '#FFFFFF', soft: '#DCE7FF', accent: '#F4C430' }
];
function monthStats(y, mo) {
  const st = get(), inM = d => { const p = parseKey(d); return p.getFullYear() === y && p.getMonth() === mo; };
  const moved = new Set(st.sessions.filter(s => inM(s.date)).map(s => s.date)).size;
  const meals = (st.meals || []).filter(m => inM(m.date)).length + st.foods.filter(f => inM(f.date)).length;
  const rests = new Set(st.rests.filter(r => inM(r.date)).map(r => r.date)).size;
  const wins = st.moments.filter(m => m.area === 'win' && inM(m.date)).length;
  const stars = st.moments.filter(m => inM(m.date)).length;
  const wx = st.weather.filter(w => inM(w.date)).sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts);
  const tiles = [[moved, moved === 1 ? 'day I moved' : 'days I moved'], [meals, meals === 1 ? 'thing I ate, logged' : 'things I ate, logged'], [rests, rests === 1 ? 'day of rest' : 'days of rest'], [wins, wins === 1 ? 'tiny win' : 'tiny wins'], [stars, 'new stars']].filter(t => t[0] > 0).slice(0, 4);
  const qp = patches().filter(p => inM(p.date)).slice(-8);
  return { tiles, wx, qp };
}
export function drawMonth(g, look, imgs) {
  const now = new Date(), y = now.getFullYear(), mo = now.getMonth(), S = monthStats(y, mo);
  g.fillStyle = look.bg; g.fillRect(0, 0, W, H);
  halftone(g, look.id === 'journal' ? 'rgba(31,85,208,.05)' : 'rgba(255,255,255,.05)', 34, 4, 0, 0, W, H);
  text(g, 'MY MONTH, IN PIECES', 80, 170, '900 34px ' + BODY, look.soft);
  text(g, monthName(now), 80, 300, '700 150px ' + HAND, look.ink);
  text(g, String(y), 80 + (() => { g.font = '700 150px ' + HAND; return g.measureText(monthName(now)).width; })() + 24, 300, '900 44px ' + BODY, look.accent);
  // the weather ribbon
  let top = 370;
  if (S.wx.length) {
    text(g, 'the weather inside', 80, top + 30, '800 32px ' + BODY, look.soft);
    const n = S.wx.length, bw = (W - 160) / n;
    g.save(); rr(g, 80, top + 54, W - 160, 150, 26); g.clip();
    S.wx.forEach((w, i) => { const t = w.types, h = 150 / t.length; t.forEach((x, j) => { g.fillStyle = (weatherByName(x) || [0, 0, '#ccc'])[2]; g.fillRect(80 + i * bw, top + 54 + j * h, bw + 1, h + 1); }); });
    g.restore();
    top += 250;
  }
  // number tiles (only ones with something in them)
  const tw = (W - 160 - 24) / 2, th = 230;
  S.tiles.forEach((t, i) => {
    const x = 80 + (i % 2) * (tw + 24), yy = top + Math.floor(i / 2) * (th + 24);
    g.fillStyle = look.card; rr(g, x, yy, tw, th, 34); g.fill(); g.strokeStyle = look.line; g.lineWidth = 3; g.stroke();
    text(g, String(t[0]), x + 40, yy + 130, '900 110px ' + BODY, look.accent);
    text(g, t[1], x + 40, yy + 190, '700 44px ' + HAND, look.ink, 'left', tw - 70);
  });
  top += Math.ceil(S.tiles.length / 2) * (th + 24) + 20;
  // quilt patches from this month
  if (S.qp.length) {
    text(g, 'new quilt patches', 80, top + 30, '800 32px ' + BODY, look.soft);
    const s = Math.min(150, (W - 160 - 10 * (S.qp.length - 1)) / S.qp.length);
    S.qp.forEach((p, i) => {
      const f = p.fabrics[0], x = 80 + i * (s + 10), yy = top + 56;
      const c = document.createElement('canvas'); c.width = c.height = s * 2; const cg = c.getContext('2d'); cg.scale(2, 2); PAT[f.pat](cg, s, f.a, f.b, mulberry32(f.seed));
      g.save(); rr(g, x, yy, s, s, 16); g.clip(); g.drawImage(c, x, yy, s, s); g.restore();
      if (look.id === 'journal') { g.strokeStyle = look.line; g.lineWidth = 3; rr(g, x, yy, s, s, 16); g.stroke(); }
      g.setLineDash([8, 8]); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; rr(g, x + 8, yy + 8, s - 16, s - 16, 10); g.stroke(); g.setLineDash([]);
    });
    top += s + 90;
  }
  if (!S.tiles.length && !S.wx.length) text(g, 'a quiet month, and that\'s okay', W / 2, 900, '700 64px ' + HAND, look.ink, 'center');
  drawArt(g, imgs.afternoon, W - 260, H - 190, 380);
  text(g, 'still here,', 80, H - 380, '700 64px ' + HAND, look.ink);
  text(g, 'still becoming.', 80, H - 310, '700 64px ' + HAND, look.ink);
  grain(g, 0.05, 44);
  footer(g, look.soft);
}

// ---------- sharing ----------
export async function shareCanvas(cv, name) {
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  const file = new File([blob], name + '.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.png'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return 'saved';
}
