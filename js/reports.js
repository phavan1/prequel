// Reports as PDFs: the sleep diary (for your doctor) and the weekly / monthly food report.
import { get, today, addDays, parseKey, dateKey } from './store.js';
import { esc, openSheet, closeSheet, toast } from './ui.js';
import { loadArt, fontsReady } from './cards.js';
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
    rows.push({ shade: !par, cells: [first ? dayDate(r.date) : '', clock(r.start), clock(r.end), dur((r.end - r.start) / 60000), r.feel ? r.feel[0].toUpperCase() + r.feel.slice(1) : ''] });
    const isLast = rests.filter(x => x.date === r.date).pop() === r;
    if (isLast && notes[r.date]) rows.push({ cells: ['', 'Awake in the night: ' + notes[r.date].join(', ').toLowerCase(), '', '', ''], soft: [0, 1], shade: !par });
  });
  if (rows.length) doc.table(cols, rows, { boldFirst: true, byShade: true });
  else doc.para('Nothing logged in these dates yet.');
  doc.space(10);
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

// ---------- the sheets that ask which dates, then hand you the file ----------
function ready(file, doc, what) {
  openSheet('<h2>Your ' + esc(what) + ' is ready</h2><p class="muted">' + esc(file.name.replace(/\.pdf$/, '')) + ' · ' + Math.max(1, Math.round(file.size / 1024)) + ' KB</p>' +
    '<button type="button" class="btn" data-sharepdf>Share or save the PDF</button><button type="button" class="btn alt" data-close>Done</button>', async e => {
    if (!e.target.closest('[data-sharepdf]')) return;
    const r = await shareFile(file); if (r === 'saved') toast('Saved. Look in your downloads or Files.');
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
  const optBtn = (o, i) => '<button type="button" class="opt" data-o="' + i + '">' + o[0] + '<small style="display:block;font-weight:700;opacity:.7">' + esc(range(o[1], o[2])) + '</small></button>';
  openSheet('<h2>' + title + '</h2><p class="muted">' + intro + '</p>' + opts.map(optBtn).join('') +
    (months.length ? '<div class="lbl">Or pick a month</div><div class="chips monthpick">' + months.map((m, i) => '<button type="button" class="chip small" data-m="' + i + '">' + m[0] + '</button>').join('') + '</div>' : '') +
    '<button type="button" class="btn alt" data-close>Cancel</button>', e => {
    let b;
    if ((b = e.target.closest('[data-o]'))) { const o = opts[+b.dataset.o]; onPick(o[1], o[2], o[3]); return; }
    if ((b = e.target.closest('[data-m]'))) { const m = months[+b.dataset.m]; onPick(m[1], m[2], m[0]); }
  });
}
export function openSleepDiary() {
  const t = today(), st = get();
  const first = st.rests.length ? st.rests.reduce((m, r) => r.date < m ? r.date : m, t) : t;
  const opts = [['Last 2 weeks', addDays(t, -13), t], ['Last 4 weeks', addDays(t, -27), t], ['Everything', first, t]];
  rangeSheet('Sleep diary', 'A tidy PDF for you or your doctor. Which dates?', opts, monthsWith(st.rests.map(r => r.date)), (a, b) => build(() => sleepDiary(a, b), 'sleep diary'));
}
export function openFoodReport() {
  const t = today(), st = get();
  const opts = [['The last 7 days', addDays(t, -6), t, 'the last 7 days']];
  const months = monthsWith((st.meals || []).map(m => m.date).concat((st.foods || []).map(f => f.date)));
  rangeSheet('Food report', 'Everything you ate, a typical day, and a few gentle ideas, as a PDF.', opts, months, (a, b, label) => build(() => foodReport(a, b, label), 'food report'));
}
