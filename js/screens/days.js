import { get, save, today, dateKey, parseKey } from '../store.js';
import { AREAS, weatherByName, EXERCISES } from '../data.js';
import { esc, nav, prettyDate, setLogDate, timeOf, openSheet, closeSheet } from '../ui.js';
import { openLog } from '../goals.js';

let month = null, selected = null;

export function mount(root, params) {
  if (params.args && params.args[0]) selected = params.args[0];
  if (!selected) selected = today();
  if (!month) { const d = parseKey(selected); month = [d.getFullYear(), d.getMonth()]; }
  render(root);
  root.addEventListener('click', e => {
    const t = e.target; let b;
    if ((b = t.closest('[data-day]'))) { selected = b.dataset.day; render(root); return; }
    if ((b = t.closest('[data-month]'))) { const n = Number(b.dataset.month); const d = new Date(month[0], month[1] + n, 1); month = [d.getFullYear(), d.getMonth()]; render(root); return; }
    if ((b = t.closest('[data-delm]'))) { confirmDelete(root, b.dataset.delm); return; }
    if ((b = t.closest('[data-sess]'))) { editSession(root, b.dataset.sess); return; }
    if (t.closest('[data-goals]')) { openLog(selected, () => render(root)); return; }
    if ((b = t.closest('[data-go]'))) { const go = b.dataset.go; location.hash = '#/' + go + (selected === today() ? '' : (go.includes('?') ? '&' : '?') + 'd=' + selected); }
  });
}

function confirmDelete(root, id) {
  const st = get(), m = st.moments.find(x => x.id === id); if (!m) return;
  openSheet('<h2>Remove this?</h2><p class="muted">' + esc(m.text) + '</p><button type="button" class="btn danger" data-yes>Remove it</button><button type="button" class="btn alt" data-close>Keep it</button>', ev => {
    if (!ev.target.closest('[data-yes]')) return;
    if (m.ref) ['sessions', 'rests', 'foods', 'weather', 'goalLogs', 'letters'].forEach(l => { if (st[l]) st[l] = st[l].filter(x => x.id !== m.ref); });
    st.moments = st.moments.filter(x => x.id !== id);
    save(); closeSheet(); render(root);
  });
}

// a finished workout: fix any number, or remove a set you didn't mean to log
function editSession(root, id) {
  const st = get(), s = st.sessions.find(x => x.id === id); if (!s) return;
  const typeOf = x => (EXERCISES[x.key] || st.customExercises[x.key] || {}).t || (x.sets.some(z => z.b !== '' && z.b != null) ? 'wr' : 'hold');
  const removed = new Set(), w = JSON.parse(JSON.stringify(s.exercises)); // a working copy, so Cancel changes nothing
  const draw = () => '<h2>' + esc(s.workoutName) + '</h2><p class="muted">' + esc(prettyDate(s.date, { weekday: 'long', day: 'numeric', month: 'long' })) + '. Fix any number, or remove a set. It still counts.</p>' +
    w.map((x, i) => { const t = typeOf(x); return '<div class="exhead">' + esc(x.name) + '</div>' +
      '<div class="setedit" style="font-size:11px;font-weight:800;color:var(--ink-soft)"><span></span><span style="text-align:center">' + (t === 'wr' ? 'WEIGHT' : t === 'mins' ? 'MINUTES' : 'SECONDS') + '</span><span style="text-align:center">' + (t === 'wr' ? 'REPS' : '') + '</span><span></span></div>' +
      x.sets.map((z, j) => removed.has(i + ':' + j) ? '' : '<div class="setedit"><span class="n">' + (j + 1) + '</span><input type="text" inputmode="decimal" data-a="' + i + ':' + j + '" value="' + esc(z.a) + '" aria-label="Set ' + (j + 1) + ' ' + (t === 'wr' ? 'weight' : 'amount') + '">' +
        (t === 'wr' ? '<input type="text" inputmode="numeric" data-b="' + i + ':' + j + '" value="' + esc(z.b) + '" aria-label="Set ' + (j + 1) + ' reps">' : '<span></span>') +
        '<button type="button" data-rmset="' + i + ':' + j + '" aria-label="Remove set ' + (j + 1) + '">×</button></div>').join(''); }).join('') +
    '<button type="button" class="btn" data-o="save">Save changes</button><button type="button" class="btn alt" data-close>Cancel</button>';
  const sheet = openSheet(draw(), ev => {
    const b = ev.target.closest('[data-rmset]');
    if (b) { keepTyped(); removed.add(b.dataset.rmset); const sh = sheet.querySelector('.sheet'), y = sh.scrollTop; sh.innerHTML = draw(); sh.scrollTop = y; return; }
    if (!ev.target.closest('[data-o]')) return;
    keepTyped();
    w.forEach((x, i) => { x.sets = x.sets.filter((z, j) => !removed.has(i + ':' + j) && String(z.a).trim() !== ''); });
    s.exercises = w.filter(x => x.sets.length);
    const n = s.exercises.reduce((a, x) => a + x.sets.length, 0);
    st.moments.forEach(m => { if (m.ref === id) m.text = s.workoutName + (n ? ' · ' + n + (n === 1 ? ' set' : ' sets') : ''); });
    save(); closeSheet(); render(root);
  });
  // carry what's been typed across redraws
  function keepTyped() {
    sheet.querySelectorAll('[data-a]').forEach(inp => { const [i, j] = inp.dataset.a.split(':').map(Number); w[i].sets[j].a = inp.value.trim(); });
    sheet.querySelectorAll('[data-b]').forEach(inp => { const [i, j] = inp.dataset.b.split(':').map(Number); w[i].sets[j].b = inp.value.trim(); });
  }
}

function render(root) {
  const st = get(), t = today();
  const [y, mo] = month;
  const first = new Date(y, mo, 1), days = new Date(y, mo + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday first
  const byDay = {};
  st.moments.forEach(m => { (byDay[m.date] = byDay[m.date] || new Set()).add(m.area); });
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span></span>';
  for (let d = 1; d <= days; d++) {
    const key = dateKey(new Date(y, mo, d));
    const areas = byDay[key] ? Array.from(byDay[key]).slice(0, 4) : [];
    cells += '<button type="button" class="d' + (key === t ? ' today' : '') + '" data-day="' + key + '" aria-pressed="' + (key === selected) + '"' + (key > t ? ' disabled' : '') + ' aria-label="' + esc(prettyDate(key, { weekday: 'long', day: 'numeric', month: 'long' })) + (areas.length ? ', has moments' : '') + '">' + d +
      '<span class="dots">' + areas.map(a => '<i style="background:' + AREAS[a].colour + '"></i>').join('') + '</span></button>';
  }
  const moments = st.moments.filter(m => m.date === selected).sort((a, b) => a.ts - b.ts);
  const wx = st.weather.filter(w => w.date === selected);
  const nextDisabled = new Date(y, mo + 1, 1) > new Date();
  root.innerHTML =
    '<div class="monthbar"><button type="button" data-month="-1" aria-label="Previous month">‹</button><h1 style="font-size:22px">' + first.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) + '</h1><button type="button" data-month="1" aria-label="Next month"' + (nextDisabled ? ' disabled style="opacity:.35"' : '') + '>›</button></div>' +
    '<div class="cal"><div class="dow"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div><div class="grid">' + cells + '</div></div>' +
    '<div class="top"><h2>' + esc(prettyDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })) + '</h2><span class="muted" style="font-size:12px;font-weight:700">late logs count the same</span></div>' +
    (wx.length ? '<div class="wx-dots" style="gap:6px;align-items:center">' + wx.flatMap(w => w.types).map(n => '<i style="background:' + (weatherByName(n) || [0, 0, '#ccc'])[2] + ';width:14px;height:14px"></i>').join('') + '<span class="muted" style="font-size:13px;font-weight:700;margin-left:4px">' + esc(Array.from(new Set(wx.flatMap(w => w.types))).join(', ')) + '</span></div>' : '') +
    (moments.length
      ? moments.map(m => '<div class="item"><i style="background:' + (AREAS[m.area] || AREAS.mind).colour + '"></i>' + (m.ref && st.sessions.some(x => x.id === m.ref) ? '<button type="button" class="tap" data-sess="' + m.ref + '">' + esc(m.text) + (m.bright ? ' ✦' : '') + ' <b style="color:var(--blue)">· sets ›</b></button>' : '<span>' + esc(m.text) + (m.bright ? ' ✦' : '') + '</span>') + '<button type="button" data-delm="' + m.id + '" aria-label="Remove this moment">×</button></div>').join('')
      : '<p class="empty">Nothing here yet. Add anything you remember. It counts just the same.</p>') +
    '<div class="lbl">Add to this day</div>' +
    '<div class="grid3">' + [['move', 'Move'], ['food', 'Food'], ['rest', 'Rest'], ['wins', 'Tiny win'], ['weather', 'Weather'], ['wins?heavy=1', 'Heavy day']].map(o => '<button type="button" class="btn alt" data-go="' + o[0] + '">' + o[1] + '</button>').join('') + '<button type="button" class="btn alt" data-goals>Your goals</button></div>' +
    nav('days');
}
