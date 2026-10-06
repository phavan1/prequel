import { get, save, uid, addMoment, removeById } from '../store.js';
import { WEATHERS, weatherByName } from '../data.js';
import { esc, nav, backLink, dateChip, logDate, timeOf, prettyDate } from '../ui.js';

let picked = [], strength = 'steady', reply = '';

export function mount(root) {
  render(root);
  root.addEventListener('click', e => {
    const t = e.target;
    let b;
    if ((b = t.closest('[data-w]'))) {
      const i = Number(b.dataset.w);
      picked = picked.includes(i) ? picked.filter(x => x !== i) : [...picked, i].slice(-2);
      render(root); return;
    }
    if ((b = t.closest('[data-s]'))) { strength = b.dataset.s; render(root); return; }
    if (t.closest('[data-log]')) {
      if (!picked.length) return;
      const st = get(), date = logDate();
      const types = picked.map(i => WEATHERS[i][0]);
      const entry = { id: uid(), date, ts: Date.now(), types, strength };
      st.weather.push(entry);
      addMoment('mind', 'Weather: ' + types.join(' + ').toLowerCase() + ', ' + strength, date, { ref: entry.id });
      reply = WEATHERS[picked[picked.length - 1]][4];
      picked = []; save(); render(root); return;
    }
    if ((b = t.closest('[data-del]'))) { removeById('weather', b.dataset.del); render(root); }
  });
}

function render(root) {
  const st = get(), date = logDate();
  const todays = st.weather.filter(w => w.date === date).sort((a, b) => a.ts - b.ts);
  root.innerHTML =
    '<div class="top">' + backLink() + dateChip() + '</div>' +
    '<div><h1>What\'s the weather inside?</h1><p class="sub">Pick one, or mix two. Log as often as it changes. No weather is wrong.</p></div>' +
    '<div class="wgrid">' + WEATHERS.map((w, i) =>
      '<button type="button" class="tile" data-w="' + i + '" aria-pressed="' + picked.includes(i) + '"><span class="ic" style="background:' + w[2] + '22;color:' + w[2] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + w[3] + '</svg></span><span class="nm">' + w[0] + '</span><span class="hn">' + w[1] + '</span></button>').join('') + '</div>' +
    '<div class="card">' +
      '<div class="lbl">How strong</div>' +
      '<div class="seg">' + ['light', 'steady', 'strong'].map(s => '<button type="button" data-s="' + s + '" aria-pressed="' + (strength === s) + '">' + s[0].toUpperCase() + s.slice(1) + '</button>').join('') + '</div>' +
      '<button type="button" class="btn" data-log' + (picked.length ? '' : ' disabled') + '>' + (picked.length ? 'Log ' + esc(picked.map(i => WEATHERS[i][0].toLowerCase()).join(' + ')) : 'Pick a weather') + '</button>' +
      (reply ? '<div class="say" style="color:var(--blue)">' + esc(reply) + '</div>' : '') +
    '</div>' +
    '<div class="card"><div class="lbl">' + esc(prettyDate(date)) + ' so far</div>' +
      (todays.length ? todays.map(w => '<div class="entry"><span class="t">' + timeOf(w.ts) + '</span><span class="wx-dots">' + w.types.map(n => '<i style="background:' + (weatherByName(n) || [0, 0, '#ccc'])[2] + '"></i>').join('') + '</span><span>' + esc(w.types.join(' + ')) + ', ' + esc(w.strength) + '</span><button type="button" class="x" data-del="' + w.id + '" aria-label="Remove this entry">×</button></div>').join('')
        : '<p class="empty">Nothing yet. Whenever you\'re ready.</p>') +
    '</div>' + nav('home');
}
