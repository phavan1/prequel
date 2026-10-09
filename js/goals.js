// Your goals: ones the app counts for you, and ones of your own you log with a tap.
// They only count up. When one is reached it's celebrated and goes on the finished shelf. No next target appears.
import { get, save, uid, addMoment, today, dateKey } from './store.js';
import { esc, him, openSheet, closeSheet, toast, prettyDate } from './ui.js';

const tsOfDay = rests => { const m = {}; rests.forEach(r => { if (!m[r.date] || r.end < m[r.date]) m[r.date] = r.end || r.start; }); return Object.values(m); };
// a meal counts as home-cooked when the food it came from is marked home-cooked
const homeMeals = st => { const home = new Set((st.myFoods || []).filter(f => f.kind === 'home').map(f => f.id)); return (st.meals || []).filter(m => home.has(m.foodId) || m.kind === 'home').map(m => m.ts); };
export const SOURCES = {
  sessions: { label: 'Gym sessions', unit: 'sessions', items: st => st.sessions.map(s => s.ts) },
  cooked: { label: 'Home-cooked meals', unit: 'meals', items: st => st.foods.filter(f => f.tags.includes('Cooked it myself')).map(f => f.ts).concat(homeMeals(st)) },
  newfood: { label: 'New foods tried', unit: 'new foods', items: st => st.foods.filter(f => f.tags.includes('Tried something new')).map(f => f.ts).concat((st.myFoods || []).map(f => f.created || 0)) },
  breakfast: { label: 'Breakfasts', unit: 'breakfasts', items: st => st.foods.filter(f => f.tags.includes('Breakfast')).map(f => f.ts).concat((st.meals || []).filter(m => new Date(m.ts).getHours() < 11).map(m => m.ts)) },
  restdays: { label: 'Days of rest logged', unit: 'days', items: st => tsOfDay(st.rests) },
  wins: { label: 'Tiny wins (any)', unit: 'tiny wins', items: st => st.moments.filter(m => m.area === 'win').map(m => m.ts) },
  letters: { label: 'Letters to future me', unit: 'letters', items: st => st.letters.map(l => l.ts) },
  lanterns: { label: 'Lanterns let go', unit: 'lanterns', items: st => st.mind.filter(n => n.letGo).map(n => n.letGo) }
};
// any one of your tiny wins can be a goal too ("Stepped outside" 30 times)
function source(key) {
  if (SOURCES[key]) return SOURCES[key];
  if (key.startsWith('win:')) { const w = key.slice(4); return { label: w, unit: 'times', items: st => st.moments.filter(m => m.area === 'win' && m.text === w).map(m => m.ts) }; }
  return { label: '?', unit: '', items: () => [] };
}
const SUGGEST = [['sessions', 100], ['cooked', 50], ['newfood', 25], ['restdays', 100]];

export function ensureGoals() {
  const st = get();
  if (!Array.isArray(st.goals)) st.goals = [];
  if (!Array.isArray(st.goalLogs)) st.goalLogs = [];
  // people who were using the app before goals existed keep the four they already had
  if (!st.goalsSeeded) {
    if (st.moments.length) SUGGEST.forEach(([k, n]) => st.goals.push({ id: uid(), kind: 'linked', source: k, name: SOURCES[k].label, target: n, from: 0, created: Date.now(), finished: null }));
    st.goalsSeeded = true; save();
  }
  return st.goals;
}
export function count(g) {
  const st = get();
  if (g.kind === 'own') return st.goalLogs.filter(l => l.goalId === g.id).length;
  return source(g.source).items(st).filter(ts => ts >= (g.from || 0)).length;
}
export const unitOf = g => g.kind === 'own' ? 'times' : source(g.source).unit;

// celebrate anything newly reached, one at a time
export function checkFinished() {
  const st = get(); ensureGoals();
  const done = st.goals.find(g => !g.finished && !g.paused && count(g) >= g.target);
  if (!done) return;
  done.finished = Date.now(); save();
  openSheet('<div class="done" style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">' + him('cheer', 'pop', 'Your character jumping with joy') +
    '<div class="big">You did it.</div><p class="say" style="margin:0">' + esc(done.name) + ': ' + done.target + ' ' + esc(unitOf(done)) + '.</p>' +
    '<p class="muted">It\'s on your finished shelf now, for good. No next target. Just this.</p><button type="button" class="btn wide" data-close>Lovely</button></div>', null);
}

// ---------- making and changing goals ----------
export function openNewGoal(onDone) {
  const st = get();
  const d = { kind: 'own', source: null, name: '', target: '', from: 'all' };
  const sources = Object.keys(SOURCES).concat(st.settings.tinyWins.map(w => 'win:' + w));
  const draw = msg => '<h2>A new goal</h2><p class="muted">Something to count up to. It never resets, and there\'s no deadline.</p>' +
    '<div class="seg" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button type="button" data-k="own" aria-pressed="' + (d.kind === 'own') + '">Something of my own</button><button type="button" data-k="linked" aria-pressed="' + (d.kind === 'linked') + '">Something the app counts</button></div>' +
    (d.kind === 'own'
      ? '<label class="field-label" for="gName">WHAT IS IT?</label><input id="gName" type="text" placeholder="e.g. Swimming, Reading, Calling home" autocomplete="off" value="' + esc(d.name) + '"><p class="muted" style="font-size:13px;margin:0">You log it yourself with one tap from Home. Each one is a star in your sky.</p>'
      : '<div class="lbl">Count this</div><div class="chips">' + sources.map(k => '<button type="button" class="chip small" data-src="' + esc(k) + '" aria-pressed="' + (d.source === k) + '">' + esc(source(k).label) + '</button>').join('') + '</div>' +
        (d.source ? '<div class="lbl">Starting from</div><div class="chips"><button type="button" class="chip small" data-from="all" aria-pressed="' + (d.from === 'all') + '">Count what\'s already logged (' + source(d.source).items(st).length + ')</button><button type="button" class="chip small" data-from="now" aria-pressed="' + (d.from === 'now') + '">Start at 0 from now</button></div>' : '')) +
    '<label class="field-label" for="gTarget">HOW MANY?</label><input id="gTarget" type="text" inputmode="numeric" placeholder="e.g. 20" value="' + esc(d.target) + '">' +
    '<div class="err">' + (msg || '') + '</div><button type="button" class="btn" data-save>Save goal</button><button type="button" class="btn alt" data-close>Cancel</button>';
  const keep = () => { const n = document.getElementById('gName'), t = document.getElementById('gTarget'); if (n) d.name = n.value; if (t) d.target = t.value; };
  const redraw = msg => { keep(); const sh = document.querySelector('#sheet .sheet'), y = sh.scrollTop; sh.innerHTML = draw(msg); sh.scrollTop = y; };
  openSheet(draw(), ev => {
    const t = ev.target; let b;
    if ((b = t.closest('[data-k]'))) { d.kind = b.dataset.k; redraw(); return; }
    if ((b = t.closest('[data-src]'))) { d.source = b.dataset.src; if (!d.target) { const s = SUGGEST.find(x => x[0] === d.source); if (s) d.target = String(s[1]); } redraw(); return; }
    if ((b = t.closest('[data-from]'))) { d.from = b.dataset.from; redraw(); return; }
    if (t.closest('[data-save]')) {
      keep();
      const target = parseInt(d.target, 10);
      if (d.kind === 'own' && !d.name.trim()) { redraw('Give it a name first.'); return; }
      if (d.kind === 'linked' && !d.source) { redraw('Pick what to count.'); return; }
      if (!(target > 0)) { redraw('Pick a number to count up to.'); return; }
      st.goals.push({ id: uid(), kind: d.kind, source: d.kind === 'linked' ? d.source : null, name: d.kind === 'own' ? d.name.trim() : source(d.source).label, target, from: d.kind === 'linked' && d.from === 'now' ? Date.now() : 0, created: Date.now(), finished: null });
      save(); closeSheet(); toast('Saved. No rush.'); if (onDone) onDone(); checkFinished();
    }
  });
}

export function openEditGoal(id, onDone) {
  const st = get(), g = st.goals.find(x => x.id === id); if (!g) return;
  openSheet('<h2>' + esc(g.name) + '</h2><p class="muted">' + count(g) + ' ' + esc(unitOf(g)) + (g.finished ? ' · finished ' + esc(prettyDate(dateKey(new Date(g.finished)))) : ' so far') + '</p>' +
    (g.finished
      ? '<button type="button" class="btn" data-o="again">Start a fresh one, same goal</button>'
      : '<label class="field-label" for="eName">NAME</label><input id="eName" type="text" value="' + esc(g.name) + '" autocomplete="off"><label class="field-label" for="eTarget">COUNT UP TO</label><input id="eTarget" type="text" inputmode="numeric" value="' + g.target + '"><button type="button" class="btn" data-o="save">Save</button>' +
        '<button type="button" class="btn alt" data-o="pause">' + (g.paused ? 'Pick it back up' : 'Rest it for now') + '</button>' +
        '<p class="muted" style="font-size:12px;margin:0">' + (g.paused ? 'Everything you did is still here. It carries on from where you left it.' : 'Resting keeps every bit of progress. It just steps out of the way until you want it again.') + '</p>') +
    '<button type="button" class="btn danger" data-o="del">Remove this goal</button><button type="button" class="btn alt" data-close>Cancel</button>', ev => {
    const o = ev.target.closest('[data-o]'); if (!o) return;
    if (o.dataset.o === 'del') {
      if (!o.dataset.armed) { o.dataset.armed = '1'; o.textContent = 'Sure? Its stars stay in your sky. Tap again'; return; }
      st.goals = st.goals.filter(x => x.id !== id); save(); closeSheet(); toast('Removed.'); if (onDone) onDone(); return;
    }
    if (o.dataset.o === 'pause') { g.paused = g.paused ? null : Date.now(); save(); closeSheet(); toast(g.paused ? 'Resting. It\'ll be here when you want it.' : 'Welcome back to ' + g.name + '.'); if (onDone) onDone(); return; }
    if (o.dataset.o === 'again') {
      const fresh = Object.assign({}, g, { id: uid(), created: Date.now(), finished: null, from: g.kind === 'linked' ? Date.now() : 0 });
      if (g.kind === 'own') fresh.again = g.id; // own logs belong to the old one, so this starts at 0
      st.goals.push(fresh); save(); closeSheet(); toast('A fresh one. No rush.'); if (onDone) onDone(); return;
    }
    const name = document.getElementById('eName').value.trim(), target = parseInt(document.getElementById('eTarget').value, 10);
    if (name) g.name = name; if (target > 0) g.target = target;
    save(); closeSheet(); if (onDone) onDone(); checkFinished();
  });
}

// ---------- logging your own goals: one tap ----------
export function openLog(date, onDone) {
  const st = get(); ensureGoals();
  let day = date || today();
  const own = () => st.goals.filter(g => g.kind === 'own' && !g.finished && !g.paused);
  const draw = () => '<h2>Your goals</h2>' +
    '<label class="datechip' + (day !== today() ? ' past' : '') + '"><span>Logging for</span><b>' + esc(prettyDate(day)) + '</b><input type="date" id="gDay" max="' + today() + '" value="' + day + '" aria-label="Day you are logging for"></label>' +
    (own().length
      ? own().map(g => '<div class="mgrow"><span>' + esc(g.name) + '<small>' + count(g) + ' of ' + g.target + '</small></span><button type="button" data-plus="' + g.id + '" style="min-width:64px;background:var(--blue);color:#fff;border-color:var(--blue)">+1</button></div>').join('')
      : '<p class="empty">No goals of your own yet. Swimming, reading, calling home: anything you want to count.</p>') +
    '<button type="button" class="btn alt" data-new>+ A new goal</button><button type="button" class="btn ghost" data-close>Done</button>';
  const sheet = openSheet(draw(), ev => {
    const t = ev.target; let b;
    if (t.closest('[data-new]')) { openNewGoal(onDone); return; }
    if ((b = t.closest('[data-plus]'))) {
      const g = st.goals.find(x => x.id === b.dataset.plus); if (!g) return;
      const log = { id: uid(), goalId: g.id, date: day, ts: Date.now() };
      st.goalLogs.push(log);
      addMoment('goal', g.name, day, { ref: log.id, bright: count(g) === 1 ? 1 : 0 });
      toast(g.name + ': ' + count(g) + '. A star just went up.');
      if (onDone) onDone();
      if (count(g) >= g.target) { checkFinished(); return; }
      sheet.querySelector('.sheet').innerHTML = draw();
    }
  });
  sheet.addEventListener('change', e => { if (e.target.id === 'gDay') { day = e.target.value || today(); sheet.querySelector('.sheet').innerHTML = draw(); } });
}
