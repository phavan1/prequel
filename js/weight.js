// Body weight (moved out of food.js in v57 so Move can open it too): whenever you get near a scale.
import { save, uid, today } from './store.js';
import { esc, logDate, prettyDate, toast, openSheet } from './ui.js';
import { weights } from './nutrition.js';

// ---------- weight, whenever you get near a scale ----------
export function weightSheet(render = () => {}) {
  const W = weights();
  let where = 'Gym';
  const draw = () => {
    const pts = W.slice().sort((a, b) => a.date.localeCompare(b.date));
    let chart = '';
    if (pts.length >= 2) {
      const ks = pts.map(p => p.kg), lo = Math.min(...ks) - 1, hi = Math.max(...ks) + 1, t0 = new Date(pts[0].date).getTime(), t1 = Math.max(t0 + 1, new Date(pts[pts.length - 1].date).getTime());
      const X = p => 10 + (new Date(p.date).getTime() - t0) / (t1 - t0) * 280, Y = k => 70 - (k - lo) / (hi - lo) * 60;
      chart = '<svg viewBox="0 0 300 80" class="wchart" role="img" aria-label="Your weight over time"><polyline fill="none" stroke="#1F55D0" stroke-width="2" stroke-linejoin="round" points="' + pts.map(p => X(p).toFixed(1) + ',' + Y(p.kg).toFixed(1)).join(' ') + '"/>' + pts.map(p => '<circle cx="' + X(p).toFixed(1) + '" cy="' + Y(p.kg).toFixed(1) + '" r="3" fill="#1F55D0"/>').join('') + '</svg>';
    }
    return '<h2>Weight</h2><p class="muted" style="margin:0">Whenever you\'re near a scale. Different scales read a little differently, so it helps to note where. One a day for each place: saving again changes it.</p>' +
      '<div class="addrow"><label class="sr" for="wKg">Kilograms</label><input id="wKg" type="text" inputmode="decimal" placeholder="kg"><input id="wDay" type="date" max="' + today() + '" value="' + logDate() + '" aria-label="Date" style="max-width:150px"></div>' +
      '<div class="chips">' + ['Gym', 'Hospital', 'Other'].map(w => '<button type="button" class="chip small" data-where="' + w + '" aria-pressed="' + (w === where) + '">' + w + '</button>').join('') + '</div>' +
      '<button type="button" class="btn" data-o="save">Save</button>' + chart +
      '<div class="daylist">' + pts.slice().reverse().map(p => '<div class="entry"><span class="t">' + esc(prettyDate(p.date)) + '</span><span class="nm">' + p.kg + ' kg<small>' + esc(p.where || '') + '</small></span><button type="button" class="x" data-wdel="' + p.id + '" aria-label="Remove">×</button></div>').join('') + '</div>' +
      '<button type="button" class="btn ghost" data-close>Done</button>';
  };
  const sheet = openSheet(draw(), ev => {
    const t = ev.target; let b;
    const redraw = () => { sheet.querySelector('.sheet').innerHTML = draw(); };
    if ((b = t.closest('[data-where]'))) { where = b.dataset.where; sheet.querySelectorAll('[data-where]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
    if ((b = t.closest('[data-wdel]'))) { const keep = W.filter(x => x.id !== b.dataset.wdel); W.length = 0; W.push(...keep); save(); redraw(); render(); return; }
    if (t.closest('[data-o]')) {
      const kg = parseFloat(document.getElementById('wKg').value);
      if (!(kg > 20 && kg < 400)) { toast('Type your weight in kg'); return; }
      const date = [document.getElementById('wDay').value || today(), today()].sort()[0], v = Math.round(kg * 10) / 10;
      // one weight per place per day (v58): saving again replaces that day's one
      const same = W.find(x => x.date === date && (x.where || '') === where);
      if (same) { same.kg = v; same.ts = Date.now(); } else W.push({ id: uid(), date, ts: Date.now(), kg: v, where });
      save(); redraw(); render(); toast(same ? 'Updated your ' + where.toLowerCase() + ' weight for ' + (date === today() ? 'today' : prettyDate(date)) + '.' : 'Noted.');
    }
  });
}
