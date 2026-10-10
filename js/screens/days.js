import { get, save, today, dateKey, parseKey, removeById } from '../store.js';
import { weatherByName, EXERCISES } from '../data.js';
import { esc, nav, prettyDate, timeOf, hm, openSheet, closeSheet } from '../ui.js';
import { openLog, ensureGoals } from '../goals.js';
import { totalOf, qtyLabel } from '../nutrition.js';

// Days: one calendar, filtered by a tab. Icons and words carry the meaning, never colour alone.
const ICON = {
  all: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  move: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
  food: '<path d="M4 12h16a8 8 0 0 1-16 0zM9 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4"/>',
  rest: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  win: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  weather: '<path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z"/>',
  goal: '<path d="M6 21V4M6 4l11 4-11 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>'
};
const svg = (k, cls) => '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>';
const OPTIONAL = [['win', 'Tiny wins'], ['weather', 'Weather']];
let month = null, selected = null, tab = 'all', open = null;

// what happened on a day, per category
function dayData(d) {
  const st = get();
  const move = st.moments.filter(m => m.date === d && m.area === 'move');
  const meals = (st.meals || []).filter(m => m.date === d), oldFood = st.foods.filter(f => f.date === d);
  const rests = st.rests.filter(r => r.date === d), restNotes = st.moments.filter(m => m.date === d && m.area === 'rest' && !m.ref);
  const wins = st.moments.filter(m => m.date === d && m.area === 'win');
  const wx = st.weather.filter(w => w.date === d);
  const goals = {}; (st.goalLogs || []).filter(l => l.date === d).forEach(l => { (goals[l.goalId] = goals[l.goalId] || []).push(l); });
  return { move, meals, oldFood, rests, restNotes, wins, wx, goals };
}
function has(D, k) {
  if (k === 'move') return D.move.length > 0;
  if (k === 'food') return D.meals.length + D.oldFood.length > 0;
  if (k === 'rest') return D.rests.length + D.restNotes.length > 0;
  if (k === 'win') return D.wins.length > 0;
  if (k === 'weather') return D.wx.length > 0;
  if (k.startsWith('g:')) return !!D.goals[k.slice(2)];
  // all: how many kinds of things happened that day
  return ['move', 'food', 'rest', 'win', 'weather'].filter(x => has(D, x)).length + Object.keys(D.goals).length;
}

export function mount(root, params) {
  ensureGoals();
  if (params.args && params.args[0]) selected = params.args[0];
  if (!selected) selected = today();
  if (!month) { const d = parseKey(selected); month = [d.getFullYear(), d.getMonth()]; }
  render(root);
  root.addEventListener('click', e => {
    const t = e.target; let b;
    if ((b = t.closest('[data-tab]'))) { tab = b.dataset.tab; render(root); return; }
    if (t.closest('[data-addtab]')) { tabSheet(root); return; }
    if ((b = t.closest('[data-day]'))) { selected = b.dataset.day; open = null; render(root); return; }
    if ((b = t.closest('[data-month]'))) { const n = Number(b.dataset.month); const d = new Date(month[0], month[1] + n, 1); month = [d.getFullYear(), d.getMonth()]; render(root); return; }
    if ((b = t.closest('[data-open]'))) { open = open === b.dataset.open ? null : b.dataset.open; render(root); return; }
    if ((b = t.closest('[data-del]'))) { confirmDelete(root, b.dataset.del); return; }
    if ((b = t.closest('[data-sess]'))) { editSession(root, b.dataset.sess); return; }
    if (t.closest('[data-add]')) { addSheet(root); }
  });
}

// the + at the end of the tabs: a new goal of your own (it gets a tab straight away, and shows on Me too),
// goals that are resting, and the optional tabs
function tabSheet(root) {
  const st = get(), s = st.settings; s.dayTabs = s.dayTabs || [];
  const resting = (st.goals || []).filter(g => g.kind === 'own' && g.paused && !g.finished);
  const sheet = openSheet('<h2>Add to your calendar</h2>' +
    '<div class="card newgoalcard"><b>A new goal of your own</b><p class="muted" style="font-size:13px;margin:0">Swimming, reading, calling home: anything. It gets its own tab here and shows on Me too.</p>' +
      '<label class="sr" for="ngName">Goal name</label><input id="ngName" type="text" placeholder="What is it?" autocomplete="off">' +
      '<div class="addrow"><label class="sr" for="ngTarget">Count up to</label><input id="ngTarget" type="text" inputmode="numeric" placeholder="Count up to, e.g. 20"><button type="button" class="btn" data-ng>Add</button></div><div class="err" id="ngErr"></div></div>' +
    (resting.length ? '<div class="lbl">Resting goals</div>' + resting.map(g => '<button type="button" class="mgrow" data-wake="' + g.id + '" style="width:100%;text-align:left"><span>' + esc(g.name) + '<small>kept safe</small></span><b style="color:var(--blue)">Pick back up</b></button>').join('') : '') +
    '<div class="lbl">More tabs</div>' +
    OPTIONAL.map(o => '<button type="button" class="mgrow" data-opt="' + o[0] + '" style="width:100%;text-align:left"><span>' + o[1] + '</span><b style="color:var(--blue)">' + (s.dayTabs.includes(o[0]) ? 'Shown ✓' : 'Add') + '</b></button>').join('') +
    '<button type="button" class="btn ghost" data-close>Done</button>', ev => {
    const t = ev.target; let b;
    if (t.closest('[data-ng]')) {
      const name = sheet.querySelector('#ngName').value.trim(), target = parseInt(sheet.querySelector('#ngTarget').value, 10);
      if (!name) { sheet.querySelector('#ngErr').textContent = 'Give it a name first.'; return; }
      if (!(target > 0)) { sheet.querySelector('#ngErr').textContent = 'Pick a number to count up to.'; return; }
      const g = { id: 'g' + Date.now().toString(36), kind: 'own', source: null, name, target, from: 0, created: Date.now(), finished: null };
      st.goals.push(g); save(); tab = 'g:' + g.id; closeSheet(); render(root); return;
    }
    if ((b = t.closest('[data-wake]'))) { const g = st.goals.find(x => x.id === b.dataset.wake); if (g) { g.paused = null; save(); tab = 'g:' + g.id; } closeSheet(); render(root); return; }
    if (!(b = t.closest('[data-opt]'))) return;
    const k = b.dataset.opt; s.dayTabs = s.dayTabs.includes(k) ? s.dayTabs.filter(x => x !== k) : s.dayTabs.concat(k);
    if (!s.dayTabs.includes(tab) && OPTIONAL.some(o => o[0] === tab)) tab = 'all';
    save(); closeSheet(); render(root); tabSheet(root);
  });
}

function addSheet(root) {
  const go = g => { closeSheet(); location.hash = '#/' + g + (selected === today() ? '' : (g.includes('?') ? '&' : '?') + 'd=' + selected); };
  openSheet('<h2>Add to ' + esc(prettyDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })) + '</h2>' +
    '<div class="addgrid">' + [['move', 'Move', 'move'], ['food', 'Food', 'food'], ['rest', 'Rest', 'rest'], ['wins', 'Tiny win', 'win'], ['weather', 'Weather', 'weather'], ['goals', 'Your goals', 'goal']].map(o => '<button type="button" data-g="' + o[0] + '">' + svg(o[2]) + '<span>' + o[1] + '</span></button>').join('') + '</div>' +
    '<button type="button" class="btn ghost" data-close>Cancel</button>', ev => {
    const b = ev.target.closest('[data-g]'); if (!b) return;
    if (b.dataset.g === 'goals') { closeSheet(); openLog(selected, () => render(root)); return; }
    go(b.dataset.g);
  });
}

function confirmDelete(root, key) {
  const st = get(), [list, id] = key.split(':');
  const item = (st[list] || []).find(x => x.id === id); if (!item) return;
  const label = item.text || item.name || (item.types ? item.types.join(' + ') : 'this');
  openSheet('<h2>Remove this?</h2><p class="muted">' + esc(label) + '</p><button type="button" class="btn danger" data-yes>Remove it</button><button type="button" class="btn alt" data-close>Keep it</button>', ev => {
    if (!ev.target.closest('[data-yes]')) return;
    if (list === 'moments') {
      if (item.ref) ['sessions', 'rests', 'foods', 'meals', 'weather', 'goalLogs', 'letters'].forEach(l => { if (st[l]) st[l] = st[l].filter(x => x.id !== item.ref); });
      st.moments = st.moments.filter(x => x.id !== id); save();
    } else removeById(list, id);
    closeSheet(); render(root);
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
  const goals = (st.goals || []).filter(g => g.kind === 'own' && !g.paused);
  const tabs = [['all', 'All', 'all'], ['move', 'Move', 'move'], ['food', 'Food', 'food'], ['rest', 'Rest', 'rest']]
    .concat(OPTIONAL.filter(o => (st.settings.dayTabs || []).includes(o[0])).map(o => [o[0], o[1], o[0]]))
    .concat(goals.map(g => ['g:' + g.id, g.name, 'goal']));
  if (!tabs.some(x => x[0] === tab)) tab = 'all';
  const [y, mo] = month;
  const first = new Date(y, mo, 1), nDays = new Date(y, mo + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  let cells = '', marked = 0;
  for (let i = 0; i < lead; i++) cells += '<span></span>';
  for (let d = 1; d <= nDays; d++) {
    const key = dateKey(new Date(y, mo, d)), D = dayData(key), v = has(D, tab);
    const lvl = tab === 'all' ? Math.min(3, v) : (v ? 3 : 0);
    if (lvl) marked++;
    cells += '<button type="button" class="d lv' + lvl + (key === t ? ' today' : '') + '" data-day="' + key + '" aria-pressed="' + (key === selected) + '"' + (key > t ? ' disabled' : '') +
      ' aria-label="' + esc(prettyDate(key, { weekday: 'long', day: 'numeric', month: 'long' })) + (lvl ? ', logged' : '') + '"><span class="n">' + d + '</span>' +
      (tab !== 'all' && lvl ? svg(tabs.find(x => x[0] === tab)[2], 'badge') : '') + '</button>';
  }
  const nextDisabled = new Date(y, mo + 1, 1) > new Date();
  const monthName = first.toLocaleDateString('en-AU', { month: 'long' });
  root.innerHTML =
    '<div class="tabsrow">' + tabs.map(x => '<button type="button" data-tab="' + esc(x[0]) + '" aria-pressed="' + (x[0] === tab) + '">' + svg(x[2]) + '<span>' + esc(x[1]) + '</span></button>').join('') +
      '<button type="button" data-addtab aria-label="Add a tab">' + svg('plus') + '</button></div>' +
    '<div class="cal2"><div class="monthbar"><button type="button" data-month="-1" aria-label="Previous month">‹</button><h2>' + first.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) + '</h2><button type="button" data-month="1" aria-label="Next month"' + (nextDisabled ? ' disabled' : '') + '>›</button></div>' +
      '<div class="dow"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div><div class="grid">' + cells + '</div></div>' +
    '<p class="calsum">' + summary(tab, marked, monthName, y, mo) + '</p>' +
    dayCard(selected) +
    nav('days');
}

// a kind line about the month: only counts that go up, no rates, no streaks
function summary(tab, marked, monthName, y, mo) {
  // never a zero: an empty month gets an invitation instead of a count
  const st = get(), inMonth = d => { const p = parseKey(d); return p.getFullYear() === y && p.getMonth() === mo; };
  const days = n => n + (n === 1 ? ' day' : ' days');
  if (tab === 'all') return marked ? 'Something logged on ' + days(marked) + ' in ' + monthName + '.' : 'A fresh page. Any day can be filled in, whenever.';
  if (tab === 'move') { const n = st.sessions.length; return marked ? days(marked) + ' of movement in ' + monthName + ' · ' + n + (n === 1 ? ' session' : ' sessions') + ' all-time' : (n ? n + (n === 1 ? ' session' : ' sessions') + ' so far, all-time. The next one lands here.' : 'Your first session will light up a day here.'); }
  if (tab === 'food') {
    const c = {}; (st.meals || []).filter(m => inMonth(m.date)).forEach(m => { c[m.name] = (c[m.name] || 0) + 1; });
    const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    return marked ? 'Food logged on ' + days(marked) + ' in ' + monthName + (top ? ' · most-eaten: ' + esc(top[0]) : '') : 'Food you log will show up here.';
  }
  if (tab === 'rest') return marked ? 'Rest logged on ' + days(marked) + ' in ' + monthName + '.' : 'Rests you log will show up here.';
  if (tab === 'win') { const n = st.moments.filter(m => m.area === 'win' && inMonth(m.date)).length; return n ? n + (n === 1 ? ' tiny win' : ' tiny wins') + ' in ' + monthName + '.' : 'Tiny wins will show up here.'; }
  if (tab === 'weather') { const c = {}; st.weather.filter(w => inMonth(w.date)).forEach(w => w.types.forEach(x => { c[x] = (c[x] || 0) + 1; })); const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return top ? 'Most common weather in ' + monthName + ': ' + esc(top[0].toLowerCase()) + '.' : 'Your weather will show up here.'; }
  const g = (st.goals || []).find(x => 'g:' + x.id === tab); if (!g) return '';
  const all = (st.goalLogs || []).filter(l => l.goalId === g.id), m = Math.round(all.filter(l => inMonth(l.date)).reduce((n, l) => n + (l.amt || 1), 0) * 10) / 10;
  if (!all.length) return esc(g.name) + ' starts whenever you\'re ready. Tap a day, then "Add to this day".';
  const tot = Math.round(all.reduce((n, l) => n + (l.amt || 1), 0) * 10) / 10, u = g.unit && g.unit !== 'times' ? ' ' + esc(g.unit) : '';
  if (!m) return esc(g.name) + ': ' + tot + u + ' so far, counting up to ' + g.target + '.';
  return esc(g.name) + ': ' + m + u + ' in ' + monthName + ' · ' + tot + ' of ' + g.target + ' so far';
}

// the chosen day: one short line per thing, tap a line to see and change the details
function dayCard(d) {
  const st = get(), D = dayData(d), rows = [];
  const row = (key, icon, title, sub, body) => rows.push('<div class="drow' + (open === key ? ' open' : '') + '"><button type="button" class="dhead" data-open="' + key + '">' + svg(icon) + '<span><b>' + title + '</b><small>' + sub + '</small></span><i>' + (open === key ? '−' : '+') + '</i></button>' + (open === key ? '<div class="dbody">' + body + '</div>' : '') + '</div>');
  const x = (key, label) => '<button type="button" class="x" data-del="' + key + '" aria-label="Remove ' + esc(label) + '">×</button>';
  if (D.move.length) {
    const sets = D.move.map(m => m.text).join(', ');
    row('move', 'move', D.move.length === 1 ? 'Moved' : D.move.length + ' workouts', esc(sets),
      D.move.map(m => '<div class="ditem"><span>' + esc(m.text) + (m.bright ? ' ✦' : '') + '</span>' + (m.ref && st.sessions.some(s => s.id === m.ref) ? '<button type="button" class="lnk" data-sess="' + m.ref + '">sets ›</button>' : '') + x('moments:' + m.id, m.text) + '</div>').join(''));
  }
  if (D.meals.length || D.oldFood.length) {
    let kc = 0, pr = 0, known = 0;
    D.meals.forEach(m => { const v = totalOf(m); if (v) { kc += v[0] || 0; pr += v[1] || 0; known++; } });
    const n = D.meals.length + D.oldFood.length;
    row('food', 'food', n + (n === 1 ? ' thing eaten' : ' things eaten'), known ? '~' + Math.round(kc).toLocaleString() + ' cal · ' + Math.round(pr) + ' g protein' : 'no numbers yet',
      D.meals.map(m => { const v = totalOf(m); return '<div class="ditem"><span>' + esc(m.name) + '<small>' + (m.sure ? '' : '~') + esc(qtyLabel(m)) + (v ? ' · ' + Math.round(v[0]) + ' cal' : '') + '</small></span>' + x('meals:' + m.id, m.name) + '</div>'; }).join('') +
      D.oldFood.map(f => '<div class="ditem"><span>' + esc(f.note || f.tags.join(', ')) + '<small>from before numbers</small></span>' + x('foods:' + f.id, f.note || 'this') + '</div>').join('') +
      '<a class="lnk" href="#/food' + (d === today() ? '' : '?d=' + d) + '">Open food for this day ›</a>');
  }
  if (D.rests.length || D.restNotes.length) {
    const mins = D.rests.reduce((a, r) => a + (r.end - r.start) / 60000, 0);
    row('rest', 'rest', mins ? 'Rested ' + hm(mins) : 'Rest', D.rests.length > 1 ? 'in ' + D.rests.length + ' parts' : (D.restNotes.length ? D.restNotes.length + ' night note' + (D.restNotes.length > 1 ? 's' : '') : ''),
      st.moments.filter(m => m.date === d && m.area === 'rest').map(m => '<div class="ditem"><span>' + esc(m.text) + '</span>' + x('moments:' + m.id, m.text) + '</div>').join(''));
  }
  if (D.wins.length) row('win', 'win', D.wins.length + (D.wins.length === 1 ? ' tiny win' : ' tiny wins'), esc(D.wins.map(m => m.text).join(', ')),
    D.wins.map(m => '<div class="ditem"><span>' + esc(m.text) + (m.bright ? ' ✦' : '') + '</span>' + x('moments:' + m.id, m.text) + '</div>').join(''));
  if (D.wx.length) row('weather', 'weather', 'Weather inside', esc(Array.from(new Set(D.wx.flatMap(w => w.types))).join(', ').toLowerCase()),
    D.wx.map(w => '<div class="ditem"><span>' + esc(w.types.join(' + ')) + '<small>' + esc(w.strength || '') + ' · ' + timeOf(w.ts) + '</small></span>' + x('weather:' + w.id, w.types.join(' + ')) + '</div>').join(''));
  Object.keys(D.goals).forEach(gid => {
    const g = (st.goals || []).find(z => z.id === gid); const L = D.goals[gid];
    row('g:' + gid, 'goal', g ? esc(g.name) : 'A goal', L.length + (L.length === 1 ? ' time' : ' times'),
      L.map(l => '<div class="ditem"><span>' + (g ? esc(g.name) : 'Goal') + (l.amt && g ? ' · ' + l.amt + ' ' + esc(g.unit || '') : '') + '<small>' + timeOf(l.ts) + '</small></span>' + x('goalLogs:' + l.id, g ? g.name : 'this') + '</div>').join(''));
  });
  return '<div class="daycard"><div class="top"><h2>' + esc(prettyDate(d, { weekday: 'long', day: 'numeric', month: 'long' })) + '</h2></div>' +
    (rows.length ? rows.join('') : '<p class="empty" style="margin:0">Nothing here yet. Add anything you remember; late logs count the same.</p>') +
    '<button type="button" class="btn alt wide" data-add>' + svg('plus') + ' Add to this day</button></div>';
}
