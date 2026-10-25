// Reports as PDFs: the sleep diary (for your doctor) and the weekly / monthly food report.
import { get, today, addDays, parseKey, dateKey } from './store.js';
import { esc, openSheet, closeSheet, toast, him, IOS, canShareFile, saveToDevice, SAVED_NOTE } from './ui.js';
import { loadArt, fontsReady } from './cards.js';
import { feelLabel, EXERCISES } from './data.js';
import { actDef, summary } from './activities.js';
import { NUTRIENTS, totalOf, sumDay, qtyLabel, myFoods } from './nutrition.js';
import { Doc, PW, PH, M, INK, SOFT, LINE, CARD, BLUE, SUN, HAND, BODY, txt, rr, wrap, longDate, dayDate, shortDay, range, clock, dur, shareFile } from './pdf.js';

const days = (from, to) => { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; };
const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
const round = (v, dp) => { const k = Math.pow(10, dp || 0); return (Math.round(v * k) / k).toLocaleString(); };
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

// the big title block on the first page
function cover(doc, kicker, title, sub, img) {
  const g = doc.g;
  g.fillStyle = BLUE; rr(g, M, M, PW - 2 * M, 300, 34); g.fill();
  g.fillStyle = 'rgba(255,255,255,.08)'; for (let y = M + 20; y < M + 300; y += 26) for (let x = M + 20; x < PW - M; x += 26) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
  txt(g, kicker, M + 50, M + 78, '900 24px ' + BODY, '#DCE7FF');
  txt(g, title, M + 50, M + 168, '700 88px ' + HAND, '#FFFFFF', 'left', 640);
  txt(g, sub, M + 50, M + 236, '800 28px ' + BODY, SUN, 'left', 640);
  if (img) { const h = 330, w = h * img.width / img.height; g.drawImage(img, PW - M - w - 20, M + 300 - h + 10, w, h); }
  doc.y = M + 340;
}
function chip(g, x, y, s, bg, fg) { g.font = '800 19px ' + BODY; const w = g.measureText(s).width + 28; g.fillStyle = bg; rr(g, x, y, w, 34, 17); g.fill(); txt(g, s, x + 14, y + 23, '800 19px ' + BODY, fg); return w; }

async function prep(names) { await fontsReady(); const a = await loadArt(names); return Object.fromEntries(names.map((n, i) => [n, a[i]])); }

// ---------- sleep diary ----------
export async function sleepDiary(from, to) {
  const st = get(), art = await prep(['nightwatch']);
  const rests = st.rests.filter(r => r.date >= from && r.date <= to).sort((a, b) => a.start - b.start);
  const name = st.settings.name;
  const doc = new Doc('Sleep diary', range(from, to));
  cover(doc, 'SLEEP DIARY' + (name ? ' · ' + name.toUpperCase() : ''), 'How I\'ve slept', range(from, to), art.nightwatch);

  // the summary: typical values, not scores
  const byDay = {}; rests.forEach(r => { (byDay[r.date] = byDay[r.date] || []).push(r); });
  const dKeys = Object.keys(byDay).sort();
  const totals = dKeys.map(d => byDay[d].reduce((n, r) => n + (r.end - r.start) / 60000, 0));
  const mains = dKeys.map(d => byDay[d].slice().sort((a, b) => (b.end - b.start) - (a.end - a.start))[0]);
  const minsOf = (ts, shift) => { const x = new Date(ts); let m = x.getHours() * 60 + x.getMinutes(); if (shift && m < 12 * 60) m += 24 * 60; return m; };
  const fmtMins = m => { m = Math.round(m) % (24 * 60); const d = new Date(2000, 0, 1, Math.floor(m / 60), m % 60); return clock(d.getTime()); };
  const naps = rests.filter(r => { const h = new Date(r.start).getHours(); return h >= 9 && h < 18; }).length;
  const tiles = [];
  if (dKeys.length) tiles.push([dKeys.length, dKeys.length === 1 ? 'day with sleep logged' : 'days with sleep logged']);
  if (totals.length) tiles.push([dur(median(totals)), 'typical sleep in a day']);
  // night sleep: the rests that start between 6 pm and 9 am. Asleep = the first of them, up = the end of the last
  const nightOf = d => byDay[d].filter(r => { const h = new Date(r.start).getHours(); return h >= 18 || h < 9; }).sort((a, b) => a.start - b.start);
  const nights = dKeys.map(nightOf).filter(n => n.length);
  if (nights.length) tiles.push([fmtMins(median(nights.map(n => minsOf(n[0].start, true)))), 'usually asleep around']);
  if (nights.length) tiles.push([fmtMins(median(nights.map(n => minsOf(n[n.length - 1].end)))), 'usually up around']);
  doc.heading('At a glance', '“typical” means the middle value, so one odd night doesn\'t skew it');
  doc.tiles(tiles, { big: 48 });
  if (naps) doc.para('Daytime rests (between 9 am and 6 pm): ' + naps + '.', '700 22px ' + BODY, SOFT);

  // week by week (v47): is it changing? One row per week (Monday to Sunday) that has sleep logged, only when there are two or more
  const mondayOf = d => { const x = parseKey(d); return addDays(d, -((x.getDay() + 6) % 7)); };
  const weeks = []; dKeys.forEach((d, i) => { const w = mondayOf(d); let k = weeks.find(z => z.w === w); if (!k) weeks.push(k = { w, days: [], nights: [] }); k.days.push(totals[i]); const n = byDay[d].filter(r => { const h = new Date(r.start).getHours(); return h < 9 || h >= 18; }).reduce((a, r) => a + (r.end - r.start) / 60000, 0); if (n) k.nights.push(n); });
  if (weeks.length > 1) {
    const woke = new Set(st.moments.filter(m => m.area === 'rest' && /^Awake in the night: /.test(m.text) && m.date >= from && m.date <= to).map(m => m.date));
    doc.heading('Week by week', 'each week runs Monday to Sunday', 140 + weeks.length * 74);
    const x0 = M, w = PW - 2 * M, rh = 74, cols = [262, 150, 150, 170], bx = x0 + cols.reduce((a, b) => a + b, 0) + 18, bw = x0 + w - 24 - bx;
    const mx = Math.max(10, Math.ceil(Math.max(...totals) / 60 / 2) * 2), X = mins => bx + bw * Math.min(1, mins / 60 / mx);
    const head = () => {
      const g = doc.need(rh * 2); g.fillStyle = INK; rr(g, x0, doc.y, w, 52, 14); g.fill();
      let x = x0 + 22; ['Week', 'Typical rest', 'Typical night', 'Woke at night'].forEach((h, i) => { txt(g, h, x, doc.y + 34, '800 19px ' + BODY, '#FFFFFF'); x += cols[i]; });
      txt(g, 'Shortest to longest day', bx, doc.y + 34, '800 19px ' + BODY, '#FFFFFF'); doc.y += 52;
    };
    head();
    weeks.forEach((k, i) => {
      if (doc.y + rh > PH - M - 90) { doc.newPage(); head(); }
      const g = doc.g, y = doc.y, wd = woke.size ? [...woke].filter(d => mondayOf(d) === k.w).length : 0;
      if (i % 2 === 0) { g.fillStyle = CARD; g.fillRect(x0, y, w, rh); }
      g.fillStyle = LINE; g.fillRect(x0, y + rh - 1, w, 1);
      let x = x0 + 22;
      txt(g, 'Week of ' + shortDay(k.w), x, y + 33, '800 21px ' + BODY, INK, 'left', cols[0] - 26);
      txt(g, plural(k.days.length, 'day', 'days') + ' logged', x, y + 58, '700 17px ' + BODY, SOFT); x += cols[0];
      txt(g, dur(median(k.days)), x, y + 45, '800 24px ' + BODY, BLUE); x += cols[1];
      txt(g, k.nights.length ? dur(median(k.nights)) : 'naps only', x, y + 45, '700 22px ' + BODY, INK); x += cols[2];
      txt(g, wd ? plural(wd, 'night', 'nights') : 'none noted', x, y + 45, '700 22px ' + BODY, wd ? INK : SOFT);
      // the range: a soft bar from the shortest to the longest day, a dot for the typical one, and the hours in words above it
      const lo = Math.min(...k.days), hi = Math.max(...k.days), mid = median(k.days), cy = y + 50;
      g.fillStyle = '#E4ECFF'; rr(g, bx, cy - 5, bw, 10, 5); g.fill();
      g.fillStyle = '#9DB8F2'; rr(g, X(lo) - 8, cy - 8, Math.max(16, X(hi) - X(lo) + 16), 16, 8); g.fill();
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(X(mid), cy, 11, 0, 7); g.fill(); g.fillStyle = BLUE; g.beginPath(); g.arc(X(mid), cy, 8, 0, 7); g.fill();
      txt(g, lo === hi ? dur(lo) : dur(lo) + ' – ' + dur(hi), bx, y + 28, '700 17px ' + BODY, SOFT);
      doc.y += rh;
    });
    // a little scale under the bars, so the bar has numbers to it
    const g = doc.need(40); [0, mx / 2, mx].forEach(h => txt(g, h + ' h', Math.min(X(h * 60), bx + bw - 4), doc.y + 24, '700 15px ' + BODY, SOFT, h === 0 ? 'left' : h === mx ? 'right' : 'center'));
    doc.y += 34;
    doc.para('“Typical” is the middle day of the week. The dot on each bar is that typical day.', '600 19px ' + BODY, SOFT);
  }

  // hours each day: night sleep and daytime rest stacked, with the typical day as a dashed line
  if (dKeys.length) {
    const all = days(dKeys[0], dKeys[dKeys.length - 1]), isDay = r => { const h = new Date(r.start).getHours(); return h >= 9 && h < 18; };
    const val = all.map(d => { const l = byDay[d] || []; const n = l.filter(r => !isDay(r)).reduce((a, r) => a + (r.end - r.start) / 3600000, 0), dd = l.filter(isDay).reduce((a, r) => a + (r.end - r.start) / 3600000, 0); return { d, n, dd, t: n + dd }; });
    const mx = Math.max(10, Math.ceil(Math.max(...val.map(v => v.t)) / 2) * 2);
    doc.heading('Hours each day', 'night sleep plus any daytime rest', 460);
    const ch = 330, g = doc.need(ch + 120), x0 = M + 60, x1 = PW - M - 10, top = doc.y + 10, bw = (x1 - x0) / all.length, Y = h => top + ch - h / mx * ch;
    g.fillStyle = CARD; rr(g, M, doc.y, PW - 2 * M, ch + 92, 22); g.fill();
    for (let h = 0; h <= mx; h += 2) { g.fillStyle = LINE; g.fillRect(x0, Y(h), x1 - x0, 1.5); txt(g, h + ' h', x0 - 12, Y(h) + 7, '700 17px ' + BODY, SOFT, 'right'); }
    const hatch = (() => { const c = document.createElement('canvas'); c.width = c.height = 12; const cg = c.getContext('2d'); cg.fillStyle = '#B9CCF6'; cg.fillRect(0, 0, 12, 12); cg.strokeStyle = BLUE; cg.lineWidth = 2; cg.beginPath(); cg.moveTo(-3, 15); cg.lineTo(15, -3); cg.stroke(); return g.createPattern(c, 'repeat'); })();
    val.forEach((v, i) => {
      const x = x0 + i * bw + bw * 0.16, w = bw * 0.68;
      if (v.n) { g.fillStyle = BLUE; g.fillRect(x, Y(v.n), w, Y(0) - Y(v.n)); }
      if (v.dd) { g.fillStyle = hatch; g.fillRect(x, Y(v.t), w, Y(v.n) - Y(v.t)); g.strokeStyle = BLUE; g.lineWidth = 1.5; g.strokeRect(x, Y(v.t), w, Y(v.n) - Y(v.t)); }
      if (v.t && bw > 30) txt(g, (Math.round(v.t * 10) / 10) + '', x + w / 2, Y(v.t) - 8, '800 16px ' + BODY, INK, 'center');
      const dd = parseKey(v.d); if (bw > 26 || dd.getDate() % 3 === 1) txt(g, String(dd.getDate()), x + w / 2, top + ch + 26, '800 16px ' + BODY, INK, 'center');
      if (bw > 40) txt(g, ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dd.getDay()], x + w / 2, top + ch + 46, '700 14px ' + BODY, SOFT, 'center');
    });
    const typ = median(val.filter(v => v.t).map(v => v.t));
    if (typ) { g.save(); g.setLineDash([10, 8]); g.strokeStyle = SUN; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, Y(typ)); g.lineTo(x1, Y(typ)); g.stroke(); g.restore(); }
    doc.y = top + ch + 92;
    let cx = M; cx += chip(g, cx, doc.y, 'Solid: night sleep', BLUE, '#FFFFFF') + 10; cx += chip(g, cx, doc.y, 'Striped: daytime rest', '#B9CCF6', INK) + 10; if (typ) chip(g, cx, doc.y, 'Dashed line: typical, ' + dur(typ * 60), '#FFF1C4', INK);
    doc.y += 56;
  }

  // the sleep chart: one row per day, from 6 pm the evening before to 6 pm that day
  if (dKeys.length) {
    doc.heading('Sleep chart', 'each row runs from 6 pm the evening before to 6 pm that day', 200);
    const all = days(dKeys[0], dKeys[dKeys.length - 1]), lw = 190, x0 = M + lw, x1 = PW - M - 110, rh = 30;
    const axis = () => {
      const g = doc.need(40); const labels = ['6pm', '9pm', '12am', '3am', '6am', '9am', '12pm', '3pm', '6pm'];
      labels.forEach((l, i) => txt(g, l, x0 + (x1 - x0) * i / 8, doc.y + 22, '800 17px ' + BODY, SOFT, 'center'));
      doc.y += 36;
    };
    axis();
    all.forEach(d => {
      if (doc.y + rh > PH - M - 40) { doc.newPage(); axis(); }
      const g = doc.g, y = doc.y, base = parseKey(d).getTime() - 6 * 3600000; // 6pm the day before
      g.fillStyle = all.indexOf(d) % 2 ? 'rgba(255,253,247,.0)' : CARD; g.fillRect(M, y, PW - 2 * M, rh);
      for (let i = 0; i <= 8; i++) { g.fillStyle = i === 2 || i === 6 ? '#D8CDB2' : LINE; g.fillRect(x0 + (x1 - x0) * i / 8, y, 1.5, rh); }
      txt(g, shortDay(d), M + 10, y + rh * 0.7, '700 18px ' + BODY, INK);
      (byDay[d] || []).forEach(r => {
        const a = Math.max(0, (r.start - base) / 86400000), b = Math.min(1, (r.end - base) / 86400000); if (b <= a) return;
        g.fillStyle = BLUE; rr(g, x0 + (x1 - x0) * a, y + 6, Math.max(6, (x1 - x0) * (b - a)), rh - 12, 8); g.fill();
      });
      const tot = (byDay[d] || []).reduce((n, r) => n + (r.end - r.start) / 60000, 0);
      if (tot) txt(g, dur(tot), PW - M - 8, y + rh * 0.7, '800 18px ' + BODY, INK, 'right');
      doc.y += rh;
    });
    doc.y += 16;
  }

  // every rest, with how it felt and any night notes
  const notes = {}; st.moments.filter(m => m.area === 'rest' && /^Awake in the night: /.test(m.text) && m.date >= from && m.date <= to).forEach(m => { (notes[m.date] = notes[m.date] || []).push(m.text.replace(/^Awake in the night: /, '')); });
  doc.heading('Every rest', plural(rests.length, 'rest', 'rests') + ' logged');
  const cols = [{ label: 'Day', w: 300 }, { label: 'Fell asleep', w: 170 }, { label: 'Woke up', w: 170 }, { label: 'Asleep for', w: 160 }, { label: 'Felt', w: 248 }];
  const rows = []; let last = null, par = 1;
  rests.forEach(r => {
    const first = r.date !== last; last = r.date; if (first) par = 1 - par;
    rows.push({ shade: !par, cells: [first ? dayDate(r.date) : '', clock(r.start), clock(r.end), dur((r.end - r.start) / 60000), r.feel ? feelLabel(r.feel) : ''] });
    const isLast = rests.filter(x => x.date === r.date).pop() === r;
    if (isLast && notes[r.date]) rows.push({ cells: ['', 'Awake in the night: ' + notes[r.date].join(', ').toLowerCase(), '', '', ''], soft: [0, 1], shade: !par, span: 1 }); // the night note runs across the row
    if (isLast) { const ds = byDay[r.date], tot = ds.reduce((n, x) => n + (x.end - x.start) / 60000, 0); rows.push({ total: true, cells: ['', 'Total for the day', '', dur(tot), ds.length > 1 ? ds.length + ' rests' : ''] }); }
  });
  if (rows.length) doc.table(cols, rows, { boldFirst: true, byShade: true });
  else doc.para('Nothing logged in these dates yet.');
  doc.space(10);

  // in my own words (v45): what woke me, how I woke up, and my notes for the doctor, each with its day and time
  const said = [];
  st.moments.filter(m => m.area === 'rest' && m.woke && m.date >= from && m.date <= to).forEach(m => said.push({ date: m.date, ts: m.ts, text: 'What woke me: ' + m.woke }));
  rests.filter(r => r.words).forEach(r => said.push({ date: r.date, ts: r.end, text: 'How I woke up: ' + r.words }));
  (st.doctorNotes || []).filter(n => n.date >= from && n.date <= to).forEach(n => said.push({ date: n.date, ts: n.ts, text: n.text }));
  if (said.length) {
    doc.heading('Notes', 'in my own words, with the day and time', 160);
    said.sort((a, b) => a.ts - b.ts).forEach(n => {
      doc.para(dayDate(n.date) + ' · ' + clock(n.ts), '800 19px ' + BODY, SOFT);
      doc.para(n.text, '600 23px ' + BODY, INK); doc.space(12);
    });
  }
  doc.para('Logged by me in the Prequel app. Times are when I tapped “going to sleep” and “woke up”, or added by hand.', '600 20px ' + BODY, SOFT);
  return doc.finish('Sleep diary ' + longDate(from) + ' to ' + longDate(to) + '.pdf', 'Sleep diary · ' + range(from, to));
}

// ---------- food report ----------
const kindOf = (m, mine) => m.kind || (mine[m.foodId] && mine[m.foodId].kind) || null;
export async function foodReport(from, to, label) {
  const st = get(), art = await prep(['eating', 'cooking']);
  const mine = Object.fromEntries(myFoods().map(f => [f.id, f]));
  const ms = (st.meals || []).filter(m => m.date >= from && m.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts);
  const old = (st.foods || []).filter(f => f.date >= from && f.date <= to);
  const D = days(from, to);
  const per = {}; D.forEach(d => { per[d] = { list: ms.filter(m => m.date === d), old: old.filter(f => f.date === d) }; per[d].S = sumDay(per[d].list); });
  const logged = D.filter(d => per[d].list.length || per[d].old.length);
  const withNums = D.filter(d => per[d].S.counted);
  const doc = new Doc('My food', range(from, to));
  cover(doc, 'FOOD REPORT · ' + label.toUpperCase(), /7 days/.test(label) ? 'My week in food' : label.split(' ')[0] + ' in food', range(from, to), art.eating);

  // highlights (only counts above zero)
  const items = ms.length + old.length;
  const firstSeen = {}; (st.meals || []).forEach(m => { const k = m.name.toLowerCase(); if (!firstSeen[k] || m.date < firstSeen[k]) firstSeen[k] = m.date; });
  const newFoods = new Set(ms.filter(m => firstSeen[m.name.toLowerCase()] >= from).map(m => m.name.toLowerCase())).size;
  const kinds = { home: 0, out: 0, packaged: 0 }; ms.forEach(m => { const k = kindOf(m, mine); if (kinds[k] != null) kinds[k]++; }); old.forEach(f => { if (f.tags && f.tags.includes('Cooked it myself')) kinds.home++; });
  const hl = [[items, items === 1 ? 'thing eaten and logged' : 'things eaten and logged'], [logged.length, logged.length === 1 ? 'day with food logged' : 'days with food logged'], [kinds.home, 'home-cooked'], [newFoods, newFoods === 1 ? 'new food tried' : 'new foods tried']].filter(t => t[0] > 0);
  if (!items) { doc.heading('Nothing logged yet'); doc.para('There\'s no food logged in these dates. That\'s okay. Even one thing a day starts to tell a story.'); return doc.finish('Food report ' + longDate(from) + ' to ' + longDate(to) + '.pdf', 'Food · ' + range(from, to)); }
  doc.heading('The highlights');
  doc.tiles(hl);

  // daily averages
  const avg = NUTRIENTS.map((_, i) => { const v = withNums.filter(d => per[d].S.cnt[i] > 0).map(d => per[d].S.t[i]); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; });
  if (withNums.length) {
    doc.heading('A typical day', 'averaged over ' + plural(withNums.length, 'day', 'days') + ' with numbers');
    const show = NUTRIENTS.map((n, i) => [n, i]).filter(([, i]) => avg[i] != null);
    doc.tiles(show.map(([n, i]) => [round(avg[i], n[3]) + (n[2] === 'cal' ? '' : ' ' + n[2]), n[1] + (n[2] === 'cal' ? '' : '')]), { per: 4, h: 130, big: 44 });
    doc.para('Only foods with numbers are counted, so days with a few “just logged it” entries may read a little low.', '600 19px ' + BODY, SOFT);
  }

  // the day by day chart: calories as bars, protein written underneath
  if (withNums.length > 1) {
    doc.heading('Day by day', 'calories as bars · protein in grams underneath', 460);
    const ch = 300, g = doc.need(ch + 90), x0 = M + 10, w = PW - 2 * M - 20, bw = w / D.length, top = doc.y;
    const mx = Math.max(...withNums.map(d => per[d].S.t[0])) || 1;
    g.fillStyle = CARD; rr(g, M, top, PW - 2 * M, ch + 80, 22); g.fill();
    D.forEach((d, i) => {
      const S = per[d].S, x = x0 + i * bw;
      if (S.counted) {
        const h = (ch - 60) * S.t[0] / mx; g.fillStyle = st.sessions.some(s => s.date === d) ? BLUE : '#8FAEF0';
        rr(g, x + bw * 0.18, top + ch - h, bw * 0.64, h, Math.min(10, bw * 0.25)); g.fill();
        if (bw > 44) txt(g, String(Math.round(S.t[0])), x + bw / 2, top + ch - h - 10, '800 17px ' + BODY, INK, 'center');
        if (bw > 40) txt(g, Math.round(S.t[1]) + 'g', x + bw / 2, top + ch + 26, '700 16px ' + BODY, SOFT, 'center');
      }
      const dd = parseKey(d); if (bw > 30 || dd.getDate() % 5 === 1) txt(g, (bw > 60 ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dd.getDay()] + ' ' : '') + dd.getDate(), x + bw / 2, top + ch + 56, '800 16px ' + BODY, INK, 'center');
    });
    doc.y = top + ch + 96;
    const gx = M; let cx = gx; cx += chip(g, cx, doc.y, 'Dark blue: a gym day', BLUE, '#FFFFFF') + 10; chip(g, cx, doc.y, 'Light blue: a rest day', '#8FAEF0', INK);
    doc.y += 54;
  }

  // gym days vs rest days
  const gymD = withNums.filter(d => st.sessions.some(s => s.date === d)), restD = withNums.filter(d => !st.sessions.some(s => s.date === d));
  if (gymD.length && restD.length) {
    const a = (ds, i) => ds.reduce((n, d) => n + per[d].S.t[i], 0) / ds.length;
    doc.heading('Gym days and rest days');
    doc.table([{ label: '', w: 400 }, { label: 'Calories', w: 300, right: true }, { label: 'Protein', w: 348, right: true }], [
      { cells: ['On ' + plural(gymD.length, 'gym day', 'gym days'), round(a(gymD, 0)), round(a(gymD, 1)) + ' g'] },
      { cells: ['On ' + plural(restD.length, 'rest day', 'rest days'), round(a(restD, 0)), round(a(restD, 1)) + ' g'] }
    ], { boldFirst: true, rh: 56, fs: 23 });
  }

  // where it came from
  const kt = [[kinds.home, 'Home-cooked'], [kinds.out, 'Eating out'], [kinds.packaged, 'Packaged']].filter(k => k[0] > 0);
  if (kt.length) {
    doc.heading('Where it came from');
    const g = doc.need(80), tot = kt.reduce((n, k) => n + k[0], 0), w = PW - 2 * M; let x = M;
    const cols = { 'Home-cooked': '#3E9E6E', 'Eating out': '#E5893D', 'Packaged': '#8F7AE0' };
    kt.forEach(k => { const ww = w * k[0] / tot; g.fillStyle = cols[k[1]]; g.fillRect(x, doc.y, ww - 4, 46); if (ww > 170) txt(g, k[1] + ' · ' + k[0], x + 16, doc.y + 31, '800 20px ' + BODY, '#FFFFFF', 'left', ww - 30); x += ww; });
    doc.y += 62;
    doc.para(kt.map(k => k[1] + ': ' + k[0]).join('   ·   '), '700 21px ' + BODY, INK);
  }

  // regulars and protein sources
  const agg = {}; ms.forEach(m => { const k = m.name; const a = agg[k] = agg[k] || { n: 0, p: 0, kc: 0 }; a.n += m.qty || 1; const v = totalOf(m); if (v) { a.p += v[1] || 0; a.kc += v[0] || 0; } });
  const regulars = Object.entries(agg).sort((a, b) => b[1].n - a[1].n).slice(0, 5);
  const protein = Object.entries(agg).filter(e => e[1].p > 0).sort((a, b) => b[1].p - a[1].p).slice(0, 5);
  if (regulars.length) {
    doc.heading('My regulars');
    doc.table([{ label: 'Food', w: 700 }, { label: 'Times', w: 348, right: true }], regulars.map(([n, a]) => ({ cells: [n, round(a.n, 1)] })));
  }
  if (protein.length) {
    doc.heading('Where my protein came from');
    doc.table([{ label: 'Food', w: 700 }, { label: 'Protein in total', w: 348, right: true }], protein.map(([n, a]) => ({ cells: [n, round(a.p) + ' g'] })));
  }

  // weight
  const ws = (st.weights || []).filter(w => w.date >= from && w.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts);
  if (ws.length) {
    doc.heading('Weight', ws.length > 1 ? 'from ' + longDate(ws[0].date) + ' to ' + longDate(ws[ws.length - 1].date) : longDate(ws[0].date));
    doc.para(ws.map(w => longDate(w.date) + ': ' + w.kg + ' kg' + (w.where ? ' (' + w.where + ')' : '')).join('   ·   '), '700 22px ' + BODY, INK);
  }

  // gentle ideas
  doc.heading('A few gentle ideas', 'ideas, not rules', 260);
  const ideas = [];
  const lastW = (st.weights || []).slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  if (withNums.length >= 3) {
    if (avg[1] != null) {
      if (lastW) { const pk = avg[1] / lastW.kg; ideas.push(['Protein', pk >= 1.2 ? 'About ' + round(avg[1]) + ' g a day, or ' + round(pk, 1) + ' g per kg. That\'s right in the range that supports strength training (1.2–1.6 g per kg).' : 'About ' + round(avg[1]) + ' g a day, or ' + round(pk, 1) + ' g per kg. For strength training, 1.2–1.6 g per kg is a common aim. Eggs, paneer, curd, dal, chicken or a scoop of whey are easy add-ons.']); }
      else ideas.push(['Protein', 'About ' + round(avg[1]) + ' g a day. Log your weight once and I can show this per kg, which is how gym advice is usually given.']);
    }
    if (avg[5] != null && avg[5] < 25) ideas.push(['Fibre', 'About ' + round(avg[5], 1) + ' g a day. A bowl of dal, chana or rajma, oats, or fruit with the skin on helps nudge it towards 30 g.']);
    if (avg[4] != null && avg[4] > 20) ideas.push(['Saturated fat', 'About ' + round(avg[4], 1) + ' g a day. Cooking with oil instead of ghee or butter some days, or picking curd over cream, can help with cholesterol.']);
    if (avg[10] != null && avg[10] < 2.4) ideas.push(['Vitamin B12', 'About ' + round(avg[10], 1) + ' µg a day, against roughly 2.4 µg. Eggs, milk, curd, paneer, fish and chicken carry it. Many Indian recipes in the database don\'t list B12, so the real number may be a bit higher.']);
    if (avg[11] != null && avg[11] < 10) ideas.push(['Vitamin D', 'About ' + round(avg[11], 1) + ' µg from food. Food alone rarely covers vitamin D. Morning sun and whatever your doctor suggests matter more.']);
    if (avg[7] != null && avg[7] > 2300) ideas.push(['Sodium', 'About ' + round(avg[7]) + ' mg a day. Packaged snacks and restaurant food are usually the biggest source.']);
  }
  if (!ideas.length) ideas.push(['Keep going', withNums.length >= 3 ? 'Nothing stands out. Keep eating the way that works for you.' : 'Log a few more days with numbers and I\'ll have some ideas for you.']);
  ideas.forEach(([h, s]) => {
    const lines = wrap(doc.g, s, '600 24px ' + BODY, PW - 2 * M - 70), hgt = 70 + lines.length * 35;
    const g = doc.need(hgt + 20); g.fillStyle = CARD; rr(g, M, doc.y, PW - 2 * M, hgt, 24); g.fill(); g.strokeStyle = LINE; g.lineWidth = 2; g.stroke();
    g.fillStyle = SUN; rr(g, M, doc.y, 12, hgt, 6); g.fill();
    txt(g, h, M + 40, doc.y + 48, '800 26px ' + BODY, BLUE);
    lines.forEach((l, i) => txt(g, l, M + 40, doc.y + 88 + i * 35, '600 24px ' + BODY, INK));
    doc.y += hgt + 20;
  });
  doc.space(10);
  doc.para('You logged food on ' + plural(logged.length, 'day', 'days') + '. That\'s the hard part done.', '700 34px ' + HAND, INK);
  doc.para('Numbers come from the Indian Nutrient Databank and USDA, so treat them as close estimates. Not medical advice.', '600 19px ' + BODY, SOFT);
  if (art.cooking) { const g = doc.g, h = 300, w = h * art.cooking.width / art.cooking.height; if (doc.y + h < PH - M - 40) g.drawImage(art.cooking, PW - M - w, PH - M - 50 - h, w, h); }

  // everything eaten, day by day
  doc.newPage();
  doc.heading('Everything I ate', plural(items, 'thing', 'things'));
  const rows = [];
  logged.forEach(d => {
    const S = per[d].S;
    rows.push({ group: dayDate(d), note: S.counted ? '~' + round(S.t[0]) + ' cal · ' + round(S.t[1]) + ' g protein' : '' });
    per[d].list.forEach(m => { const v = totalOf(m); rows.push({ cells: [clock(m.ts), m.name, (m.sure ? '' : '~') + qtyLabel(m), v ? round(v[0]) : '–', v && v[1] != null ? round(v[1]) + ' g' : '–'] }); });
    per[d].old.forEach(f => rows.push({ cells: [clock(f.ts), f.note || (f.tags || []).join(', '), '', '', ''], soft: [0, 1] }));
  });
  doc.table([{ label: 'Time', w: 140 }, { label: 'Food', w: 430 }, { label: 'Portion', w: 230 }, { label: 'Calories', w: 120, right: true }, { label: 'Protein', w: 128, right: true }], rows, { rh: 42, fs: 19 });
  return doc.finish('Food report ' + longDate(from) + ' to ' + longDate(to) + '.pdf', 'Food · ' + range(from, to));
}

// ---------- Move report (v61): for me, and clear enough for a doctor or a coach ----------
// Plain words and tables, a calendar that reads without colour, and the gym as first / latest / best per exercise.
// Highlights and notes stay private (left out on purpose).
const MOVE_BODY = { green: 'Green (awake, normal)', yellow: 'Yellow (tired, a bit sore)', red: 'Red (unwell, faint, pain)' };
function setText(z, k, st) {
  const e = EXERCISES[k] || (st.customExercises || {})[k] || {}, t = e.t || (z.b === '' || z.b == null ? 'hold' : 'wr');
  const reps = z.b !== '' && z.b != null ? ' × ' + z.b : '';
  if (t === 'hold') return z.a + ' sec';
  if (t === 'mins') return z.a + ' min';
  const a = String(z.a);
  if (a === 'nn') return 'weight not noted' + reps;
  if (a === 'bar') return 'bar only' + reps;
  if (a === 'bw' || t === 'bw') return 'body weight' + reps;
  if (a.startsWith('b+')) return 'bar + ' + a.slice(2) + ' kg each side' + reps;
  const unit = (st.units || {})[k] || (k === 'legpress' ? 'plate' : 'kg');
  return (unit === 'plate' ? 'plate ' + a : a + ' kg') + reps;
}
// how heavy a set is, to find the top set: kg (or the kg on each side), then reps
const setWeight = z => { const a = String(z.a); return a.startsWith('b+') ? Number(a.slice(2)) || 0 : Number(a) || 0; };
const better = (x, y) => !y || setWeight(x) > setWeight(y) || (setWeight(x) === setWeight(y) && (Number(x.b) || 0) > (Number(y.b) || 0));
const topSet = sets => sets.reduce((b, z) => better(z, b) ? z : b, null);

export async function moveReport(from, to) {
  const st = get(), art = await prep(['moving']); // v63: him with his notebook after a workout, white sticker outline for the blue cover
  const name = st.settings.name;
  const sessions = st.sessions.filter(x => x.date >= from && x.date <= to).sort((a, b) => a.date.localeCompare(b.date) || (Number(a.ts) || 0) - (Number(b.ts) || 0));
  const acts = (st.activities || []).filter(x => x.date >= from && x.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts);
  const all = days(from, to), nDays = all.length;
  const doc = new Doc('Move report', range(from, to));
  cover(doc, 'MOVE REPORT' + (name ? ' · ' + name.toUpperCase() : ''), 'How I\'ve moved', range(from, to), art.moving);

  // what happened on each day
  const byDay = {}; all.forEach(d => { byDay[d] = { gym: [], acts: [] }; });
  sessions.forEach(x => byDay[x.date].gym.push(x)); acts.forEach(x => byDay[x.date].acts.push(x));
  const activeDays = all.filter(d => byDay[d].gym.length || byDay[d].acts.length);
  const mins = acts.reduce((n, a) => n + (Number(a.mins) || 0), 0) + sessions.reduce((n, x) => n + (Number(x.mins) || 0), 0); // v66: gym sessions have a length now

  // at a glance
  doc.heading('At a glance', 'the ' + nDays + ' days from ' + longDate(from) + ' to ' + longDate(to));
  const tiles = [[activeDays.length + ' of ' + nDays, 'days I moved']];
  if (sessions.length) tiles.push([sessions.length, sessions.length === 1 ? 'gym session' : 'gym sessions']);
  if (acts.length) tiles.push([acts.length, acts.length === 1 ? 'other activity' : 'other activities']);
  if (mins) tiles.push([dur(mins), 'active time, where I noted it']);
  doc.tiles(tiles, { big: 46 });
  const perWeek = Math.round(activeDays.length / nDays * 7 * 10) / 10;
  if (activeDays.length) doc.para('That\'s about ' + perWeek + (perWeek === 1 ? ' day' : ' days') + ' a week.', '700 24px ' + BODY, INK);
  // what I did
  const types = {}; if (sessions.length) types.gym = sessions.length; acts.forEach(a => { types[a.type] = (types[a.type] || 0) + 1; });
  const did = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, n]) => (t === 'gym' ? 'Gym' : actDef(t).n) + ' ' + plural(n, 'time', 'times'));
  if (did.length) doc.para('What I did: ' + did.join(', ') + '.', '600 23px ' + BODY, INK);
  // how my body felt: the check-in before the gym, and how each activity felt
  const lights = {}; sessions.forEach(x => { if (x.light) lights[x.light] = (lights[x.light] || 0) + 1; });
  const feels = {}; acts.forEach(a => { if (a.feel) feels[a.feel] = (feels[a.feel] || 0) + 1; });
  if (Object.keys(lights).length) doc.para('How my body felt before the gym: ' + ['green', 'yellow', 'red'].filter(k => lights[k]).map(k => MOVE_BODY[k] + ' ' + plural(lights[k], 'time', 'times')).join(', ') + '.', '600 23px ' + BODY, INK);
  if (Object.keys(feels).length) doc.para('How the other activities felt: ' + ['Easy', 'Good', 'Tough'].filter(k => feels[k]).map(k => k.toLowerCase() + ' ' + plural(feels[k], 'time', 'times')).join(', ') + '.', '600 23px ' + BODY, INK);

  // body weight: every weigh-in in these dates, with where (different scales read differently)
  const W = (st.weights || []).filter(w => w.date >= from && w.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts);
  if (W.length) {
    doc.heading('Body weight', W.length > 1 ? 'from ' + W[0].kg + ' kg to ' + W[W.length - 1].kg + ' kg' : '', 120 + W.length * 46);
    doc.table([{ label: 'Day', w: 420 }, { label: 'Weight', w: 260 }, { label: 'Where', w: 368 }], W.map(w => ({ cells: [dayDate(w.date), w.kg + ' kg', w.where || ''] })), { boldFirst: true });
  }

  // the calendar: one square a day, with a letter for each thing done (a key underneath), so it reads without colour
  const used = ['gym'].filter(() => sessions.length).concat([...new Set(acts.map(a => a.type))]);
  const code = {}; const taken = new Set();
  used.forEach(t => { const n = t === 'gym' ? 'Gym' : actDef(t).n; let c = n[0].toUpperCase(); if (taken.has(c)) c = n.slice(0, 2).replace(/^./, x => x.toUpperCase()); taken.add(c); code[t] = c; });
  {
    const cols = 7, gap = 12, cw = (PW - 2 * M - gap * (cols - 1)) / cols, ch = all.length > 14 ? 108 : 132, nRows = Math.ceil(all.length / cols);
    doc.heading('Day by day', 'a letter for each thing I did that day', nRows * (ch + gap) + 60); // the whole calendar stays on one page
    for (let i = 0; i < all.length; i += cols) {
      const g = doc.need(ch + gap);
      all.slice(i, i + cols).forEach((d, j) => {
        const x = M + j * (cw + gap), y = doc.y, it = byDay[d], on = it.gym.length || it.acts.length;
        g.fillStyle = on ? '#E4ECFF' : CARD; rr(g, x, y, cw, ch, 18); g.fill(); g.strokeStyle = on ? BLUE : LINE; g.lineWidth = on ? 3 : 2; g.stroke();
        txt(g, shortDay(d).split(',')[0], x + 14, y + 30, '800 18px ' + BODY, SOFT);
        txt(g, String(parseKey(d).getDate()), x + cw - 14, y + 30, '900 22px ' + BODY, INK, 'right');
        const cs = it.gym.map(() => code.gym).concat(it.acts.map(a => code[a.type]));
        txt(g, cs.join(' '), x + 14, y + ch * 0.62, '900 34px ' + BODY, BLUE, 'left', cw - 24);
        const m = it.acts.reduce((n, a) => n + (Number(a.mins) || 0), 0) + it.gym.reduce((n, x) => n + (Number(x.mins) || 0), 0); if (m) txt(g, dur(m), x + 14, y + ch - 16, '700 17px ' + BODY, SOFT);
      });
      doc.y += ch + gap;
    }
    const g = doc.need(50); let cx = M;
    used.forEach(t => { cx += chip(g, cx, doc.y, code[t] + ' = ' + (t === 'gym' ? 'Gym' : actDef(t).n), '#E4ECFF', INK) + 10; if (cx > PW - M - 220) { cx = M; doc.y += 44; } });
    doc.y += 56;
  }

  // week by week: the dates in 7-day stretches from the first day (two rows for two weeks), never a zero
  const weeks = []; for (let i = 0; i < all.length; i += 7) weeks.push(all.slice(i, i + 7));
  if (weeks.length > 1) {
    doc.heading('Week by week', 'each row is 7 days', 140 + weeks.length * 46);
    doc.table([{ label: 'Dates', w: 330 }, { label: 'Days I moved', w: 190 }, { label: 'Gym', w: 150 }, { label: 'Other', w: 150 }, { label: 'Time noted', w: 228 }], weeks.map(ds => {
      const act = ds.filter(d => byDay[d].gym.length || byDay[d].acts.length).length, gy = ds.reduce((n, d) => n + byDay[d].gym.length, 0), ot = ds.reduce((n, d) => n + byDay[d].acts.length, 0), mm = ds.reduce((n, d) => n + byDay[d].acts.concat(byDay[d].gym).reduce((a, x) => a + (Number(x.mins) || 0), 0), 0);
      return { cells: [range(ds[0], ds[ds.length - 1]).replace(/, \d{4}$/, ''), act ? act + ' of ' + ds.length : 'a rest week', gy ? String(gy) : '–', ot ? String(ot) : '–', mm ? dur(mm) : '–'] };
    }), { boldFirst: true });
  }

  // the gym: for each exercise, the first and latest top set in these dates, and the best one
  const ex = {};
  sessions.forEach(x => (x.exercises || []).forEach(e => {
    if (!(e.sets || []).length) return;
    const key = e.swap ? 'swap:' + e.swap : e.key, top = topSet(e.sets);
    const r = ex[key] = ex[key] || { name: e.swap || e.name, k: e.key, n: 0, first: null, last: null, best: null, firstD: x.date, lastD: x.date };
    r.n++; if (!r.first) { r.first = top; r.firstD = x.date; } r.last = top; r.lastD = x.date; if (better(top, r.best)) r.best = top;
  }));
  const rows = Object.values(ex).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  if (rows.length) {
    doc.heading('The gym', 'the heaviest set each time; best = heaviest in these dates', 200);
    doc.table([{ label: 'Exercise', w: 300 }, { label: 'Times', w: 100 }, { label: 'First', w: 216 }, { label: 'Latest', w: 216 }, { label: 'Best', w: 216 }],
      rows.map(r => ({ cells: [r.name, String(r.n), setText(r.first, r.k, st), r.n > 1 ? setText(r.last, r.k, st) : 'same day', setText(r.best, r.k, st)] })), { boldFirst: true, fs: 19 });
    doc.para('“First” and “latest” are the heaviest set on the first and the latest day I did that exercise in these dates.', '600 19px ' + BODY, SOFT);
  } else if (sessions.length) doc.para('Gym sessions in these dates were logged without sets.', '600 22px ' + BODY, SOFT);

  // other activities: totals per kind
  const kinds = [...new Set(acts.map(a => a.type))];
  if (kinds.length) {
    doc.heading('Other activities', 'totals for these dates', 160);
    doc.table([{ label: 'Activity', w: 300 }, { label: 'Times', w: 120 }, { label: 'Time noted', w: 200 }, { label: 'Totals', w: 428 }], kinds.map(t => {
      const L = acts.filter(a => a.type === t), d = actDef(t), m = L.reduce((n, a) => n + (Number(a.mins) || 0), 0);
      const tot = d.f.filter(f => f.num).map(f => [f, L.reduce((n, a) => n + (Number((a.f || {})[f.k]) || 0), 0)]).filter(x => x[1] > 0).map(([f, v]) => (Math.round(v * 10) / 10) + ' ' + f.u);
      return { cells: [d.n, String(L.length), m ? dur(m) : '–', tot.join(', ')] };
    }), { boldFirst: true });
  }

  // every session, in order (no highlights or notes)
  doc.heading('Every session', plural(sessions.length + acts.length, 'entry', 'entries'));
  const list = sessions.map(x => ({ d: x.date, t: Number(x.ts) || 0, what: 'Gym · ' + x.workoutName, det: [x.mins ? x.mins + ' min' : '', plural((x.exercises || []).length, 'exercise', 'exercises'), x.light ? 'felt ' + x.light : ''].filter(Boolean).join(' · ') }))
    .concat(acts.map(a => ({ d: a.date, t: a.ts, what: actDef(a.type).n, det: summary(a) }))).sort((a, b) => a.d.localeCompare(b.d) || a.t - b.t);
  let lastD = null;
  doc.table([{ label: 'Day', w: 330 }, { label: 'What', w: 330 }, { label: 'Details', w: 388 }], list.map(r => { const c = [r.d !== lastD ? dayDate(r.d) : '', r.what, r.det]; lastD = r.d; return { cells: c }; }), { boldFirst: true, fs: 19 });
  doc.para('Logged by me in the Prequel app. Times are only where I noted them; highlights and notes are left out.', '600 20px ' + BODY, SOFT);
  return doc.finish('Move report ' + longDate(from) + ' to ' + longDate(to) + '.pdf', 'Move report · ' + range(from, to));
}

// ---------- the sheets that ask which dates, then hand you the file ----------
function ready(file, doc, what) {
  openSheet('<h2>Your ' + esc(what) + ' is ready</h2><p class="muted">' + esc(file.name.replace(/\.pdf$/, '')) + ' · ' + Math.max(1, Math.round(file.size / 1024)) + ' KB</p>' +
    (IOS ? '<button type="button" class="btn" data-sharepdf>Share or save the PDF</button>'
      : '<button type="button" class="btn" data-savepdf>Save to this phone</button>' + (canShareFile(file) ? '<button type="button" class="btn alt" data-sharepdf>Share it</button>' : '')) +
    '<button type="button" class="btn ' + (IOS ? 'alt' : 'ghost') + '" data-close>Done</button>', async e => {
    if (e.target.closest('[data-savepdf]')) { saveToDevice(file); toast(SAVED_NOTE); return; }
    if (!e.target.closest('[data-sharepdf]')) return;
    const r = await shareFile(file); if (r === 'saved') toast(SAVED_NOTE);
  });
}
async function build(fn, what) {
  openSheet('<h2>Making your ' + esc(what) + '…</h2><p class="muted">Just a moment.</p>');
  try { const file = await fn(); ready(file, null, what); }
  catch (err) { closeSheet(); toast('Something went wrong making the PDF.'); console.error(err); }
}
// every month that has something logged, newest first: [label, from, to]
function monthsWith(dates) {
  const t = today(), seen = new Set(dates.map(d => d.slice(0, 7))), out = [];
  Array.from(seen).sort().reverse().forEach(ym => {
    const [y, m] = ym.split('-').map(Number), from = dateKey(new Date(y, m - 1, 1)), end = dateKey(new Date(y, m, 0));
    out.push([['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1] + ' ' + y, from, end > t ? t : end]);
  });
  return out;
}
function rangeSheet(title, intro, opts, months, onPick) {
  // a range with nothing in it is shown softly and can't be picked, so no empty PDF is ever made
  const optBtn = (o, i) => '<button type="button" class="opt' + (o.empty ? ' empty' : '') + '" data-o="' + i + '"' + (o.empty ? ' disabled' : '') + '>' + o[0] + '<small style="display:block;font-weight:700;opacity:.7">' + esc(range(o[1], o[2])) + (o.empty ? ' · nothing logged in these dates yet' : '') + '</small></button>';
  openSheet('<h2>' + title + '</h2><p class="muted">' + intro + '</p>' + opts.map(optBtn).join('') +
    (months.length ? '<div class="lbl">Or pick a month</div><div class="chips monthpick">' + months.map((m, i) => '<button type="button" class="chip small" data-m="' + i + '">' + m[0] + '</button>').join('') + '</div>' : '') +
    '<button type="button" class="btn alt" data-close>Cancel</button>', e => {
    let b;
    if ((b = e.target.closest('[data-o]'))) { const o = opts[+b.dataset.o]; if (!o.empty) onPick(o[1], o[2], o[3]); return; }
    if ((b = e.target.closest('[data-m]'))) { const m = months[+b.dataset.m]; onPick(m[1], m[2], m[0]); }
  });
}
// before anything is logged there's no report to make yet: say so warmly instead of making an empty PDF
function notYet(pose, title, text) {
  openSheet('<div class="notyet">' + him(pose, 'breathe', 'Your character') + '<h2>' + title + '</h2><p class="muted">' + text + '</p></div><button type="button" class="btn" data-close>Okay</button>');
}
const markEmpty = (opts, dates) => opts.forEach(o => { o.empty = !dates.some(d => d >= o[1] && d <= o[2]); });
export function openSleepDiary() {
  const t = today(), st = get();
  if (!st.rests.length) { notYet('asleep', 'Your sleep diary starts with one rest', 'Log a night, or even a nap, and your first diary will be ready to make.'); return; }
  const first = st.rests.length ? st.rests.reduce((m, r) => r.date < m ? r.date : m, t) : t;
  const opts = [['Last 2 weeks', addDays(t, -13), t], ['Last 4 weeks', addDays(t, -27), t], ['Everything', first, t]];
  markEmpty(opts, st.rests.map(r => r.date));
  rangeSheet('Sleep diary', 'A tidy PDF for you or your doctor. Which dates?', opts, monthsWith(st.rests.map(r => r.date)), (a, b) => build(() => sleepDiary(a, b), 'sleep diary'));
}
export function openFoodReport() {
  const t = today(), st = get();
  const opts = [['The last 7 days', addDays(t, -6), t, 'the last 7 days']];
  const dates = (st.meals || []).map(m => m.date).concat((st.foods || []).map(f => f.date));
  if (!dates.length) { notYet('eating', 'Your first food report is on its way', 'It\'ll be ready once you\'ve logged a day of food. Even one banana counts.'); return; }
  markEmpty(opts, dates);
  const months = monthsWith(dates);
  rangeSheet('Food report', 'Everything you ate, a typical day, and a few gentle ideas, as a PDF.', opts, months, (a, b, label) => build(() => foodReport(a, b, label), 'food report'));
}
export function openMoveReport() {
  const t = today(), st = get(), from = addDays(t, -13);
  const dates = st.sessions.map(x => x.date).concat((st.activities || []).map(a => a.date));
  if (!dates.length) { notYet('proudstar', 'Your first Move report is on its way', 'Log a gym session or any activity, and your report will be ready to make.'); return; }
  const opts = [['Last 2 weeks', from, t], ['Last 4 weeks', addDays(t, -27), t]]; // v62: 4 weeks too
  markEmpty(opts, dates);
  rangeSheet('Move report', 'How you\'ve moved, as a PDF for you, your doctor or a coach. Highlights and notes stay private.', opts, [], (a, b) => build(() => moveReport(a, b), 'Move report'));
}
