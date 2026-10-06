import { get, save, uid, addMoment, today, dateKey } from '../store.js';
import { AREAS, weatherByName } from '../data.js';
import { esc, prettyDate, reduceMotion, openSheet, closeSheet, toast } from '../ui.js';
import { updateSky, starPos, clusterCenter, mulberry32, hashStr } from '../sky-model.js';

let raf = 0, cleanup = [];

export function unmount() { cancelAnimationFrame(raf); cleanup.forEach(fn => fn()); cleanup = []; }

export function mount(root) {
  const st = get();
  const sky = updateSky();
  const lastVisit = sky.lastVisit || 0;
  sky.lastVisit = Date.now(); save();

  root.innerHTML =
    '<canvas id="sky" aria-label="Your sky. Each star is a moment you logged."></canvas>' +
    '<div class="sky-top"><a class="back" href="#/home">‹ Home</a><h1>Your sky</h1><div class="stats" id="stats"></div><div class="legend">' +
      Object.keys(AREAS).map(k => '<span><i style="background:' + AREAS[k].colour + '"></i>' + AREAS[k].name + '</span>').join('') + '</div></div>' +
    '<div class="sky-bar"><button type="button" class="btn alt" id="letBtn">Let something go</button><button type="button" class="btn alt" id="zoomBtn">Year view</button></div>' +
    '<div class="sky-card" id="card" hidden><button type="button" class="x" id="cardClose" aria-label="Close">×</button><div class="lbl" id="cardK"></div><div class="t" id="cardT"></div><div class="m" id="cardM"></div><div class="say" id="cardH" style="color:var(--blue)"></div></div>' +
    '<div class="sky-toast" id="newcon" hidden><div class="lbl">A new constellation</div><div class="n" id="newconName"></div></div>';

  // ---------- build the scene from saved data ----------
  const byId = Object.fromEntries(st.moments.map(m => [m.id, m]));
  const wxColour = {};
  st.weather.forEach(w => { const c = (weatherByName(w.types[w.types.length - 1]) || [])[2]; if (c) (wxColour[w.date] = wxColour[w.date] || []).push(c); });
  const stars = [], cons = [];
  sky.clusters.forEach(cl => {
    const tally = {};
    cl.members.forEach(id => {
      const m = byId[id]; if (!m) return;
      const p = starPos(m, cl);
      stars.push(Object.assign(p, { m, cl, colour: (AREAS[m.area] || AREAS.mind).colour, inCon: !!(cl.con && cl.con.ids.includes(id)), born: m.ts > lastVisit && lastVisit ? performance.now() + 400 + Math.random() * 600 : -1e9 }));
      (wxColour[m.date] || []).forEach(c => { tally[c] = (tally[c] || 0) + 1; });
    });
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    cl.tint = top ? top[0] : '#7C8FE0';
    if (cl.con) {
      const pts = cl.con.ids.map(id => byId[id] && starPos(byId[id], cl)).filter(Boolean);
      if (pts.length) cons.push({ cl, name: cl.con.name, edges: cl.con.edges.filter(e => byId[e[0]] && byId[e[1]]).map(e => [starPos(byId[e[0]], cl), starPos(byId[e[1]], cl)]), lx: pts.reduce((a, p) => a + p.x, 0) / pts.length, ly: Math.max(...pts.map(p => p.y)) + 26, born: cl.con.formed > lastVisit && lastVisit ? performance.now() + 900 : -1e9, isNew: cl.con.formed > lastVisit && !!lastVisit });
    }
  });
  const lanterns = st.mind.filter(n => n.letGo).map(n => {
    const ref = st.moments.find(m => m.ref === n.id);
    const k = ref && sky.placed[ref.id] !== undefined ? sky.placed[ref.id] : 0;
    const c = clusterCenter(k), r = mulberry32(hashStr(n.id));
    return { x: c.x + (r() - 0.5) * 220, y: c.y + (r() - 0.5) * 220, text: n.text, phase: r() * 6, born: n.letGo > lastVisit && lastVisit ? performance.now() : -1e9 };
  });
  const dust = []; const dr = mulberry32(5);
  for (let i = 0; i < 260; i++) dust.push({ x: dr(), y: dr(), a: 0.15 + dr() * 0.35, s: 0.4 + dr() * 0.8 });

  const nCons = cons.length;
  root.querySelector('#stats').textContent = stars.length + (stars.length === 1 ? ' star' : ' stars') + ' · ' + nCons + (nCons === 1 ? ' constellation' : ' constellations') + ' · ' + lanterns.length + (lanterns.length === 1 ? ' lantern' : ' lanterns');
  const fresh = cons.filter(c => c.isNew);
  if (fresh.length) {
    setTimeout(() => { const el = root.querySelector('#newcon'); if (!el) return; root.querySelector('#newconName').textContent = fresh.map(c => c.name).join(' · '); el.hidden = false; setTimeout(() => { el.hidden = true; }, 4200); }, 2200);
  }

  // ---------- canvas ----------
  const cv = root.querySelector('#sky'), ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  const resize = () => { DPR = Math.min(window.devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); };
  window.addEventListener('resize', resize); cleanup.push(() => window.removeEventListener('resize', resize)); resize();
  const spriteCache = {};
  const sprite = colour => {
    if (spriteCache[colour]) return spriteCache[colour];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.12, colour); gr.addColorStop(0.35, colour + '55'); gr.addColorStop(1, colour + '00');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (spriteCache[colour] = c);
  };

  const cam = { x: 0, y: 0, s: 1.25 }, target = { x: 0, y: 0, s: 1.25 };
  // open on a brand-new constellation if there is one, otherwise on your most recent stars
  const latest = () => {
    const newest = cons.filter(c => c.isNew).pop();
    if (newest) { target.x = newest.lx; target.y = newest.ly - 60; target.s = 1.3; return; }
    const recent = stars.slice().sort((a, b) => b.m.ts - a.m.ts).slice(0, 24);
    if (!recent.length) { target.x = 0; target.y = 0; target.s = 1.25; return; }
    target.x = recent.reduce((n, s) => n + s.x, 0) / recent.length; target.y = recent.reduce((n, s) => n + s.y, 0) / recent.length + 30; target.s = 1.05;
  };
  const yearView = () => {
    if (!stars.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    stars.forEach(s => { x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y); });
    target.x = (x0 + x1) / 2; target.y = (y0 + y1) / 2; target.s = Math.min(1.4, (W - 40) / (x1 - x0 + 160), (H - 260) / (y1 - y0 + 160));
  };
  latest(); Object.assign(cam, target);
  const toScreen = (x, y) => [(x - cam.x) * cam.s + W / 2, (y - cam.y) * cam.s + H / 2];
  const toWorld = (sx, sy) => [(sx - W / 2) / cam.s + cam.x, (sy - H / 2) / cam.s + cam.y];
  const streaks = []; let nextStreak = performance.now() + 5000;

  function frame(now) {
    cam.x += (target.x - cam.x) * 0.12; cam.y += (target.y - cam.y) * 0.12; cam.s += (target.s - cam.s) * 0.12;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#070B1E'); bg.addColorStop(1, '#18204A');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    dust.forEach(d => { const sx = ((d.x * 1600 - cam.x * 0.15 * cam.s) % W + W) % W, sy = ((d.y * 1600 - cam.y * 0.15 * cam.s) % H + H) % H; ctx.globalAlpha = d.a; ctx.fillStyle = '#C9D6FF'; ctx.fillRect(sx, sy, d.s, d.s); });
    ctx.globalAlpha = 1;
    // each part of the sky remembers the weather it was born under
    ctx.globalCompositeOperation = 'lighter';
    sky.clusters.forEach(cl => {
      if (!cl.members.length) return;
      const c = clusterCenter(cl.k), [sx, sy] = toScreen(c.x, c.y), r = 150 * cam.s;
      if (sx < -r || sx > W + r || sy < -r || sy > H + r) return;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, cl.tint + '2A'); g.addColorStop(1, cl.tint + '00');
      ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    });
    ctx.globalCompositeOperation = 'source-over';
    cons.forEach(con => {
      const p = Math.min(1, Math.max(0, (now - con.born) / 1800)), per = 1 / Math.max(1, con.edges.length);
      ctx.lineWidth = Math.max(0.8, 1.1 * Math.min(cam.s, 1.6)); ctx.strokeStyle = 'rgba(201,214,255,0.42)';
      con.edges.forEach(([a, b], i) => {
        const e = Math.max(0, Math.min(1, (p - i * per) / per)); if (e <= 0) return;
        const [ax, ay] = toScreen(a.x, a.y), [bx, by] = toScreen(b.x, b.y);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (bx - ax) * e, ay + (by - ay) * e); ctx.stroke();
      });
      if (cam.s > 0.45) {
        const la = Math.max(0, Math.min(1, (now - con.born - 1600) / 900));
        if (la > 0) { const [lx, ly] = toScreen(con.lx, con.ly); ctx.globalAlpha = la * Math.min(1, (cam.s - 0.45) * 3); ctx.fillStyle = '#DDE5FF'; ctx.textAlign = 'center'; ctx.font = '700 ' + Math.round(Math.max(14, Math.min(22, 17 * cam.s))) + 'px Gaegu, cursive'; ctx.fillText(con.name, lx, ly); ctx.globalAlpha = 1; }
      }
    });
    stars.forEach(s => {
      const [sx, sy] = toScreen(s.x, s.y);
      if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) return;
      const age = now - s.born; if (age < 0) return;
      const pop = age < 900 ? 1 + 2.2 * Math.sin(Math.min(1, age / 900) * Math.PI) : 1;
      const tw = reduceMotion ? 1 : 0.72 + 0.28 * Math.sin(now / 1000 * s.speed + s.phase);
      const base = s.size * (s.m.bright ? 1.6 : 1) * (s.inCon ? 1.25 : 1) * Math.max(0.55, Math.min(1.8, cam.s));
      const d = base * 9 * pop;
      ctx.globalAlpha = Math.min(1, tw * (s.inCon || s.m.bright ? 1 : 0.85));
      ctx.drawImage(sprite(s.colour), sx - d / 2, sy - d / 2, d, d);
    });
    ctx.globalAlpha = 1;
    lanterns.forEach(l => {
      let x = l.x, y = l.y; const age = now - l.born;
      if (age < 5200) { const t = age / 5200, e = 1 - Math.pow(1 - t, 3); x = l.x + Math.sin(t * 9) * 14 * (1 - t); y = l.y + 420 * (1 - e); }
      const bob = reduceMotion ? 0 : Math.sin(now / 1100 + l.phase) * 3;
      const [sx, sy] = toScreen(x, y + bob);
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) return;
      const z = Math.max(0.6, Math.min(1.6, cam.s)), g = 30 * z;
      ctx.drawImage(sprite('#FFB565'), sx - g, sy - g, g * 2, g * 2);
      const lw = 9 * z, lh = 12 * z;
      ctx.fillStyle = '#FFC98A'; ctx.beginPath(); ctx.moveTo(sx - lw / 2, sy - lh / 2); ctx.lineTo(sx + lw / 2, sy - lh / 2); ctx.lineTo(sx + lw * 0.62, sy + lh / 2); ctx.lineTo(sx - lw * 0.62, sy + lh / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E58A3C'; ctx.fillRect(sx - lw * 0.35, sy - lh / 2 - 2 * z, lw * 0.7, 2 * z);
    });
    if (!reduceMotion && now > nextStreak) {
      const fl = Math.random() < 0.5;
      streaks.push({ x: fl ? Math.random() * W * 0.5 : W * 0.5 + Math.random() * W * 0.5, y: 80 + Math.random() * H * 0.35, vx: (fl ? 1 : -1) * (5 + Math.random() * 4), vy: 2 + Math.random() * 2.5, life: 1 });
      nextStreak = now + 9000 + Math.random() * 16000;
    }
    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i]; s.x += s.vx; s.y += s.vy; s.life -= 0.018;
      if (s.life <= 0) { streaks.splice(i, 1); continue; }
      const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 14, s.y - s.vy * 14);
      g.addColorStop(0, 'rgba(255,248,220,' + s.life + ')'); g.addColorStop(1, 'rgba(255,248,220,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 14, s.y - s.vy * 14); ctx.stroke();
    }
    if (!stars.length) { ctx.fillStyle = '#C9D6FF'; ctx.textAlign = 'center'; ctx.font = '700 22px Gaegu, cursive'; ctx.fillText('Your sky starts with your first moment.', W / 2, H / 2); }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // ---------- gestures ----------
  const pts = new Map(); let downAt = 0, downPos = null, moved = false, pinch = null;
  const zoomBtn = root.querySelector('#zoomBtn');
  const zoomLabel = () => { zoomBtn.textContent = target.s < 0.6 ? 'Back to now' : 'Year view'; };
  const zoomAt = (sx, sy, s) => { const [wx, wy] = toWorld(sx, sy); target.s = cam.s = s; target.x = cam.x = wx - (sx - W / 2) / s; target.y = cam.y = wy - (sy - H / 2) / s; zoomLabel(); };
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { downAt = performance.now(); downPos = { x: e.clientX, y: e.clientY }; moved = false; }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: target.s }; }
  });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId), cur = { x: e.clientX, y: e.clientY }; pts.set(e.pointerId, cur);
    if (pts.size === 1) { if (Math.hypot(cur.x - downPos.x, cur.y - downPos.y) > 8) moved = true; target.x -= (cur.x - prev.x) / cam.s; target.y -= (cur.y - prev.y) / cam.s; cam.x = target.x; cam.y = target.y; }
    else if (pts.size === 2 && pinch) { moved = true; const [a, b] = [...pts.values()]; zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(0.12, Math.min(4, pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d))); }
  });
  const end = e => { if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (pts.size === 0 && !moved && performance.now() - downAt < 350) tap(e.clientX, e.clientY); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.max(0.12, Math.min(4, target.s * Math.exp(-e.deltaY * 0.0015)))); }, { passive: false });

  const card = root.querySelector('#card');
  function tap(x, y) {
    let best = null, bd = 22 * 22, lan = null;
    stars.forEach(s => { const [sx, sy] = toScreen(s.x, s.y); const d = (sx - x) ** 2 + (sy - y) ** 2; if (d < bd) { bd = d; best = s; } });
    lanterns.forEach(l => { const [sx, sy] = toScreen(l.x, l.y); const d = (sx - x) ** 2 + (sy - y) ** 2; if (d < bd) { bd = d; lan = l; best = null; } });
    card.hidden = true;
    if (lan) { root.querySelector('#cardK').textContent = 'A lantern'; root.querySelector('#cardT').textContent = lan.text; root.querySelector('#cardM').textContent = 'You let this go. It floats here now, lit and light.'; root.querySelector('#cardH').textContent = ''; card.hidden = false; return; }
    if (!best) return;
    const m = best.m, wx = st.weather.filter(w => w.date === m.date).flatMap(w => w.types);
    root.querySelector('#cardK').textContent = prettyDate(m.date) + ' · ' + (AREAS[m.area] || AREAS.mind).name;
    root.querySelector('#cardT').textContent = m.text;
    root.querySelector('#cardM').textContent = wx.length ? 'Weather inside that day: ' + Array.from(new Set(wx)).join(', ').toLowerCase() : 'No weather logged that day.';
    root.querySelector('#cardH').textContent = (m.bright ? 'Extra bright: a first, a best, or a win on a hard day. ' : '') + (best.cl.con ? 'Part of ' + best.cl.con.name + '.' : 'Still looking for its constellation.');
    card.hidden = false;
  }
  root.querySelector('#cardClose').addEventListener('click', () => { card.hidden = true; });
  zoomBtn.addEventListener('click', () => { card.hidden = true; if (target.s < 0.6) latest(); else yearView(); zoomLabel(); });
  root.querySelector('#letBtn').addEventListener('click', () => {
    openSheet('<h2>Let something go</h2><p class="muted">It folds into a paper lantern and floats up into your sky.</p><label class="sr" for="letText">What are you letting go?</label><input id="letText" type="text" placeholder="e.g. that thing someone said" autocomplete="off"><button type="button" class="btn" data-go>Let it go</button><button type="button" class="btn alt" data-close>Not now</button>', ev => {
      if (!ev.target.closest('[data-go]')) return;
      const text = document.getElementById('letText').value.trim(); if (!text) return;
      const n = { id: uid(), text, remindOn: null, created: Date.now(), letGo: Date.now() };
      get().mind.push(n); addMoment('mind', 'Let go: ' + text, today(), { ref: n.id }); save();
      closeSheet(); toast('Watch it float up.');
      const [fx, fy] = toWorld(W / 2, H * 0.35); const r = mulberry32(hashStr(n.id));
      lanterns.push({ x: fx + (r() - 0.5) * 120, y: fy, text, phase: r() * 6, born: performance.now() });
    });
  });
}
