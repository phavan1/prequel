import { get, save, uid, addMoment, addDays, today } from '../store.js';
import { EXERCISES, WORKOUTS, REST_GUIDE } from '../data.js';
import { esc, nav, backLink, dateChip, logDate, prettyDate, him, pop, openSheet, closeSheet, toast, pick, reduceMotion } from '../ui.js';
import { dayDate } from '../pdf.js';

const CHEERS = ['Nice one.', 'Look at you go.', 'That one wobbled. Still counts.', 'Breathe. You did that.', 'Sweaty and proud.', 'One more in the bank.', 'Okay, that was strong.'];
const TYPES = [['wr', 'Weight × reps'], ['hold', 'Seconds'], ['mins', 'Minutes']];
const defRange = t => t === 'hold' ? '20-60s' : t === 'mins' ? '10 min' : '8-12';

// ---------- library: playbook + your own additions ----------
function EX() {
  const st = get(), out = {};
  Object.keys(EXERCISES).forEach(k => { out[k] = Object.assign({}, EXERCISES[k], { subs: EXERCISES[k].subs.concat(st.subsAdded[k] || []) }); });
  Object.keys(st.customExercises).forEach(k => { out[k] = Object.assign({ subs: [] }, st.customExercises[k], { subs: (st.customExercises[k].subs || []).concat(st.subsAdded[k] || []) }); });
  return out;
}
function workouts() {
  const st = get();
  return WORKOUTS.map(w => Object.assign({}, w, { items: w.items.concat(st.workoutAdds[w.id] || []) })).concat(st.customWorkouts);
}
const byId = id => workouts().find(w => w.id === id);
function newExercise(name, t) {
  const key = 'c' + uid();
  get().customExercises[key] = { n: name, t, m: 0, rest: t === 'wr' ? 'c' : null, subs: [] };
  return key;
}

// ---------- live state (the workout in progress is saved, so closing the app never loses it) ----------
let view = 'start', light = 'green', field = 'a', fresh = true, A = '', B = '', edit = -1, say = '', justLogged = false, timer = null, root = null;
const act = () => get().active;

export function mount(r, params) {
  root = r;
  if (act()) view = 'wk'; else view = 'start';
  if (view === 'wk') prefill();
  render();
  root.addEventListener('click', onClick);
  root.addEventListener('pointerdown', onKey);
  root.addEventListener('change', e => { if (e.target.id === 'yday') { /* informational only */ } });
  clearInterval(timer); timer = setInterval(tick, 1000);
}
export function unmount() { clearInterval(timer); }

function render() {
  root.classList.toggle('in-workout', view === 'wk');
  if (view === 'start') renderStart(); else renderWk();
}

// ---------- start: how's the body + what's next ----------
function suggestion() {
  const st = get(), d = logDate();
  const past = st.sessions.filter(s => s.date <= d).sort((a, b) => (a.date + a.ts).localeCompare(b.date + b.ts));
  const last = past[past.length - 1];
  const lastFB = [...past].reverse().find(s => s.workoutId === 'fbA' || s.workoutId === 'fbB');
  const nextFB = lastFB && lastFB.workoutId === 'fbA' ? 'B' : 'A';
  if (light === 'red') return { k: 'RED DAY', h: 'Not a lifting day', p: 'Rest is the plan today, and that is a good plan. If you want to move, an easy walk counts.', red: 'If it is chest pain, dizziness, feeling faint or a fever, please get it checked.', btns: [['rec', 'Recovery / Light']] };
  let s;
  if (!last) s = { k: 'A GOOD PLACE TO START', h: 'Full Body A', p: 'Your main general session. Two sets is plenty. Every session counts toward your 100.', btns: [['fbA', 'Start Full Body A']] };
  else if (last.date === addDays(d, -1) || last.date === d) s = { k: 'WHAT\'S NEXT', h: 'Lower A, or Pull', p: 'You trained ' + (last.date === d ? 'already today' : 'yesterday') + ' (' + esc(last.workoutName) + '), so let\'s use different muscles. Full Body ' + nextFB + ' waits until after a rest day.', btns: [['lA', 'Lower A'], ['pull', 'Pull']] };
  else s = { k: 'WHAT\'S NEXT', h: 'Full Body ' + nextFB, p: 'There\'s been a rest day since ' + esc(last.workoutName) + ' (' + esc(prettyDate(last.date)).toLowerCase() + '), so Full Body ' + nextFB + ' is next' + (lastFB ? ' in your sequence' : '') + '. Nothing resets because it\'s a new week.', btns: [['fb' + nextFB, 'Start Full Body ' + nextFB]] };
  if (light === 'yellow') { s.k = 'YELLOW DAY'; s.note = 'Keep it to 2 sets and skip the optional extras. Or do the 20-Minute Minimum.'; s.btns.push(['min20', '20-Minute Minimum']); }
  return s;
}
function renderStart() {
  const st = get(), s = suggestion();
  const L = [['green', 'Green', 'awake, normal', '#2E8B57'], ['yellow', 'Yellow', 'tired, a bit sore', '#E3B000'], ['red', 'Red', 'unwell, faint, pain', '#C2412D']];
  root.innerHTML =
    '<div class="top"><div class="lbl">Session ' + (st.sessions.length + 1) + ' · road to 100</div>' + dateChip() + '</div>' +
    '<button type="button" class="quickgo" data-quick="1"><b>Quick session</b><span>No plan needed. Just go.</span><i aria-hidden="true">›</i></button>' +
    '<h1>How\'s the body?</h1>' +
    '<div class="lights">' + L.map(l => '<button type="button" class="light" data-light="' + l[0] + '" aria-pressed="' + (light === l[0]) + '"><i style="background:' + l[3] + '"></i><b>' + l[1] + '</b><span>' + l[2] + '</span></button>').join('') + '</div>' +
    '<div class="card sug"><div class="k">' + s.k + '</div><h2>' + s.h + '</h2><p>' + s.p + '</p>' +
      (s.note ? '<div class="note-y">' + s.note + '</div>' : '') + (s.red ? '<div class="note-r">' + s.red + '</div>' : '') +
      '<div class="chips">' + s.btns.map((b, i) => '<button type="button" class="btn' + (i ? ' alt' : '') + '" data-start="' + b[0] + '">' + b[1] + '</button>').join('') + '</div></div>' +
    '<div class="lbl">Or pick yourself</div>' +
    '<div class="grid2">' + workouts().map(w => '<button type="button" class="wbtn" data-start="' + w.id + '"><b>' + esc(w.n) + '</b><span>' + esc(w.d) + '</span></button>').join('') +
      '<button type="button" class="wbtn new" data-newwk="1"><b>+ New workout</b><span>name it, pick exercises</span></button></div>' +
    '<button type="button" class="rowlink" data-manage="1" style="width:100%"><span>Change or remove your workouts, exercises and swaps</span><b>›</b></button>' +
    sessionsList() +
    nav('move');
}

// ---------- the workout ----------
const item = () => act().items[act().i];
const nameOf = i => act().swap[i] || (EX()[act().items[i][0]] || { n: '?' }).n;
const top = range => { const m = /(\d+)-(\d+)/.exec(range); return m ? Number(m[2]) : null; };
const baseSets = it => Number(String(it[1]).split('-')[0]);
const maxSets = it => Number(String(it[1]).split('-').pop());
const unitOf = k => get().units[k] || (k === 'legpress' ? 'plate' : 'kg');
function prefill() {
  const a = act(); if (!a) return;
  const k = item()[0], L = a.log[a.i] || [];
  const src = L.length ? L[L.length - 1] : (get().lifts[k] || { a: '', b: '' });
  A = src.a || ''; B = src.b || ''; field = 'a'; fresh = true; edit = -1;
}
function startWorkout(id) {
  const base = byId(id); if (!base) return;
  get().active = { id: base.id, n: base.n, items: base.items.map(x => x.slice()), i: 0, log: {}, swap: {}, hinted: {}, light, date: logDate(), started: Date.now(), lastAt: 0 };
  save(); view = 'wk'; prefill();
  say = id === 'min20' ? 'Three exercises. Then we decide together.' : id === 'rec' ? 'Gentle today. Nothing to prove.' : 'Let\'s go. ' + nameOf(0) + ' first.';
  render(); window.scrollTo(0, 0);
}
const ordinal = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
// "Last time" for this workout: the order you really went in, so you know where you got to (shown, never rearranged)
function lastOrderLine(a) {
  const prev = get().sessions.filter(s => s.workoutId === a.id && s.exercises.length && s.date <= a.date).sort((x, y) => (x.date + x.ts).localeCompare(y.date + y.ts)).pop();
  if (!prev) return '';
  return '<p class="lastorder"><b>Last time · ' + esc(prettyDate(prev.date)) + '</b> ' + prev.exercises.map(x => esc(x.swap || x.name)).join(' → ') + '</p>';
}
function fmtSet(x, e, k) {
  if (e.t === 'hold') return x.a + ' s';
  if (e.t === 'mins') return x.a + ' min';
  return (unitOf(k) === 'plate' ? 'P' + x.a : x.a + 'kg') + ' × ' + x.b + (e.each ? ' each' : '');
}
function setsHtml() {
  const a = act(), it = item(), L = a.log[a.i] || [], e = EX()[it[0]];
  let h = '';
  L.forEach((x, j) => { h += '<button type="button" class="set' + (j === edit ? ' editing' : '') + (j === L.length - 1 && justLogged ? ' new' : '') + '" data-set="' + j + '"><span class="n">' + (j + 1) + '</span>' + esc(fmtSet(x, e, it[0])) + '</button>'; });
  for (let j = L.length; j < baseSets(it); j++) h += '<span class="set slot">Set ' + (j + 1) + '</span>';
  if (maxSets(it) > baseSets(it) && L.length < maxSets(it) && a.light !== 'yellow') h += '<span class="set slot opt">3rd · optional</span>';
  if (edit >= 0) h += '<button type="button" class="set rm" data-rm="1">Remove set ' + (edit + 1) + '</button>';
  return h;
}
function renderWk() {
  const a = act(), it = item(), k = it[0], e = EX()[k] || { n: '?', t: 'wr', subs: [] };
  const setsLabel = String(it[1]) === '1' ? '' : (baseSets(it) === maxSets(it) ? baseSets(it) + ' sets' : '2 sets + opt. 3rd');
  const restTxt = e.rest ? 'rest ' + REST_GUIDE[e.rest] : '';
  const one = e.t !== 'wr';
  let fields;
  if (one) {
    fields = '<div class="fields one"><button type="button" class="field" data-f="a" aria-pressed="true"><span class="l">' + (e.t === 'hold' ? 'SECONDS' : 'MINUTES') + '</span><span class="v' + (fresh ? ' fresh' : '') + '">' + esc(A) + '</span></button></div>';
  } else {
    const u = unitOf(k);
    fields = '<div class="fields">' +
      '<button type="button" class="field" data-f="a" aria-pressed="' + (field === 'a') + '"><span class="l">' + (u === 'plate' ? 'PLATE #' : 'WEIGHT · KG') + (e.m ? '<span class="unit" data-unit="1"><span class="' + (u === 'kg' ? 'on' : '') + '">kg</span><span class="' + (u === 'plate' ? 'on' : '') + '">plate</span></span>' : '') + '</span><span class="v' + (fresh && field === 'a' ? ' fresh' : '') + '">' + esc(A) + '</span>' + (u === 'kg' ? '<span class="nudge"><span data-n="-2.5">−2.5</span><span data-n="2.5">+2.5</span></span>' : '<span class="nudge"><span data-n="-1">−1</span><span data-n="1">+1</span></span>') + '</button>' +
      '<button type="button" class="field" data-f="b" aria-pressed="' + (field === 'b') + '"><span class="l">REPS' + (e.each ? ' · EACH SIDE' : '') + '</span><span class="v' + (fresh && field === 'b' ? ' fresh' : '') + '">' + esc(B) + '</span></button></div>';
  }
  const nextLabel = (!one && field === 'a') ? 'Next →' : (edit >= 0 ? 'Save set ' + (edit + 1) + ' ✓' : 'Log ✓');
  const banner = a.id === 'min20' ? '<div class="banner min">If you feel better after these three, continue. If not, leave. The session still counts.</div>' : (a.light === 'yellow' ? '<div class="banner yellow">Yellow day · 2 sets is plenty, optional extras skipped.</div>' : '');
  const pose = a.items.some(x => x[0] === 'legpress') && k === 'legpress' ? 'legday' : 'cheer';
  root.innerHTML =
    '<div class="wk">' +
    '<div class="wkhead"><button type="button" class="back" data-leave="1" style="border:0;background:transparent;color:var(--blue)">‹ Move</button><h1>' + esc(a.n) + (a.date !== today() ? '<br><small class="muted" style="font-size:11px">for ' + esc(prettyDate(a.date)) + '</small>' : '') + '</h1><button type="button" class="fin" data-finish="1">Finish</button></div>' + banner +
    '<div class="hscroll exs" id="exs">' + a.items.map((x, j) => { const done = (a.log[j] || []).length >= Math.min(2, baseSets(x)), n = (a.order || []).indexOf(j); return '<button type="button" data-ex="' + j + '" aria-pressed="' + (j === a.i) + '">' + (n >= 0 ? '<span class="ord' + (done ? ' done' : '') + '" aria-label="done ' + ordinal(n + 1) + '">' + (n + 1) + '</span>' : '') + esc(nameOf(j)) + (a.hinted[j] ? ' ↑' : '') + '</button>'; }).join('') + '<button type="button" class="addex" data-addex="1">+ Add</button></div>' +
    lastOrderLine(a) +
    '<div class="strip">' + him(pose, 'breathe', 'Your character, training with you').replace('class="him', 'id="him" class="him') + '<div class="say">' + esc(say) + '</div><span class="pill" id="since">' + (a.lastAt ? 'Since last set 0:00' : 'No sets yet') + '</span></div>' +
    '<div class="info"><div class="t"><b>' + esc(nameOf(a.i)) + (a.swap[a.i] ? ' <span style="font-weight:700;color:var(--ink-soft);font-size:12px">for ' + esc(e.n.toLowerCase()) + '</span>' : '') + '</b>' + [setsLabel, it[2], restTxt].filter(Boolean).map(esc).join(' · ') + '</div>' + '<button type="button" class="busy" data-busy="1">Machine busy?</button></div>' +
    '<div class="hscroll" id="sets">' + setsHtml() + '</div>' +
    fields +
    '<div class="pad"><div class="keys">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map(kk => '<button type="button" class="key" data-k="' + kk + '" aria-label="' + (kk === 'del' ? 'Delete' : kk === '.' ? 'Decimal point' : kk) + '">' + (kk === 'del' ? '⌫' : kk) + '</button>').join('') + '</div>' +
    '<div class="acts"><button type="button" class="same" data-same="1">' + (edit >= 0 ? 'Cancel' : 'Same again') + '</button><button type="button" class="next" data-next="1">' + nextLabel + '</button></div></div>' +
    '</div>';
  justLogged = false;
  const sets = root.querySelector('#sets'); if (edit < 0) sets.scrollLeft = sets.scrollWidth;
  const exs = root.querySelector('#exs'), cur = exs.querySelector('[aria-pressed="true"]'); if (cur) exs.scrollLeft = cur.offsetLeft - 16;
  tick();
}
function tick() {
  const a = act(), el = root && root.querySelector('#since'); if (!el || !a || !a.lastAt) return;
  const sec = Math.floor((Date.now() - a.lastAt) / 1000);
  el.textContent = 'Since last set ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
function press(kk) {
  const e = EX()[item()[0]], f = field; let v = fresh ? '' : (f === 'a' ? A : B);
  if (kk === 'del') v = (fresh ? (f === 'a' ? A : B) : v).slice(0, -1);
  else if (kk === '.') { if (f === 'a' && e.t === 'wr' && unitOf(item()[0]) === 'kg' && !v.includes('.')) v = (v || '0') + '.'; else return; }
  else if (v.length < (f === 'a' ? 5 : 3)) v = v === '0' ? kk : v + kk;
  if (f === 'a') A = v; else B = v;
  fresh = false; renderWk();
}
function commit() {
  const a = act(), it = item(), e = EX()[it[0]];
  if (!A || (e.t === 'wr' && !B)) { toast(e.t === 'wr' ? 'Type the weight and reps first' : 'Type a number first'); return; }
  const set = { a: A, b: e.t === 'wr' ? B : '' };
  const L = (a.log[a.i] = a.log[a.i] || []);
  if (edit >= 0) { L[edit] = set; say = 'Fixed. Set ' + (edit + 1) + ' is right now.'; save(); prefill(); renderWk(); return; }
  L.push(set); a.lastAt = Date.now(); justLogged = true;
  // the order you actually did things in: an exercise joins it with its first set (v42)
  a.order = a.order || []; if (!a.order.includes(a.i)) a.order.push(a.i);
  say = pick(CHEERS);
  const t = top(it[2]);
  if (e.t === 'wr' && t && L.length >= 2 && !a.hinted[a.i] && L.every(x => Number(x.b) >= t)) { a.hinted[a.i] = true; say = 'Top of the range on every set. Next time, maybe a little heavier.'; }
  if ((L.length >= maxSets(it) || (a.light === 'yellow' && L.length >= baseSets(it))) && a.i < a.items.length - 1) say += ' On to ' + nameOf(a.i + 1).toLowerCase() + ' when you\'re ready.';
  field = 'a'; fresh = true; save(); renderWk();
  if (!reduceMotion) pop(root.querySelector('#him'));
}

function finish() {
  const st = get(), a = act();
  const ord = a.order || [], at = j => { const n = ord.indexOf(j); return n < 0 ? 999 + j : n; };
  const exercises = a.items.map((x, j) => ({ j, key: x[0], name: nameOf(j), swap: a.swap[j] || null, sets: a.log[j] || [] })).filter(x => x.sets.length)
    .sort((x, y) => at(x.j) - at(y.j)).map(({ j, ...x }) => x); // saved in the order you really did them
  const sets = exercises.reduce((n, x) => n + x.sets.length, 0);
  // a new heaviest lift makes the star brighter
  const EXL = EX();
  let pb = false;
  exercises.forEach(x => {
    if ((EXL[x.key] || {}).t !== 'wr' || x.swap) return;
    const prevMax = Math.max(0, ...st.sessions.flatMap(s => s.exercises.filter(y => y.key === x.key && !y.swap).flatMap(y => y.sets.map(z => Number(z.a) || 0))));
    const nowMax = Math.max(...x.sets.map(z => Number(z.a) || 0));
    if (prevMax > 0 && nowMax > prevMax) pb = true;
    st.lifts[x.key] = x.sets[x.sets.length - 1];
  });
  const first = st.sessions.length === 0;
  const session = { id: uid(), date: a.date, ts: Date.now(), workoutId: a.id, workoutName: a.n, light: a.light, exercises };
  st.sessions.push(session);
  addMoment('move', a.n + (sets ? ' · ' + sets + (sets === 1 ? ' set' : ' sets') : ''), a.date, { ref: session.id, bright: pb || first ? 1 : 0 });
  st.active = null; save();
  const n = st.sessions.length;
  openSheet('<div class="done" style="display:flex;flex-direction:column;align-items:center;gap:8px">' + him('cheer', 'pop', 'Your character jumping with joy') +
    '<div class="big">Session ' + n + ' done.</div>' +
    '<p class="muted">' + (sets ? exercises.length + (exercises.length === 1 ? ' exercise, ' : ' exercises, ') + sets + (sets === 1 ? ' set' : ' sets') + '. ' : 'You showed up. It counts. ') + (pb ? 'A new heaviest lift, so your star shines brighter.' : 'A star just went up in your sky.') + '</p>' +
    '<p class="muted" style="font-size:13px">' + n + ' of 100.' + (n >= 100 ? ' You made it. And it keeps going.' : '') + '</p>' +
    '<button type="button" class="btn wide" data-close>Back to Move</button></div>', null);
  view = 'start'; render();
}

// ---------- events ----------
function onKey(e) {
  const b = e.target.closest('[data-k]'); if (!b) return;
  e.preventDefault(); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 90); press(b.dataset.k);
}
function onClick(e) {
  const t = e.target, a = act();
  let b;
  if ((b = t.closest('[data-light]'))) { light = b.dataset.light; renderStart(); return; }
  if ((b = t.closest('[data-start]'))) { startWorkout(b.dataset.start); return; }
  if (t.closest('[data-newwk]')) { openNewWk(); return; }
  if (t.closest('[data-quick]')) { openQuick(); return; }
  if ((b = t.closest('[data-sess]'))) { sessionSheet(b.dataset.sess); return; }
  if (t.closest('[data-allsess]')) { allSessions(); return; }
  if (t.closest('[data-manage]')) { openManage(); return; }
  if (!a) return;
  if (t.closest('[data-leave]')) {
    openSheet('<h2>Leave this workout?</h2><p class="muted">Your sets so far are kept. You can come back to it from Move, or finish it now so it counts.</p>' +
      '<button type="button" class="btn" data-o="keep">Keep it open for later</button><button type="button" class="btn alt" data-o="finish">Finish and count it</button><button type="button" class="btn danger" data-o="discard">Discard it</button><button type="button" class="btn ghost" data-close>Stay here</button>', (ev) => {
      const o = ev.target.closest('[data-o]'); if (!o) return;
      if (o.dataset.o === 'keep') { closeSheet(); location.hash = '#/home'; }
      if (o.dataset.o === 'finish') { closeSheet(); finish(); }
      if (o.dataset.o === 'discard') { get().active = null; save(); closeSheet(); view = 'start'; render(); }
    });
    return;
  }
  if (t.closest('[data-finish]')) { finish(); return; }
  if ((b = t.closest('[data-ex]'))) { a.i = Number(b.dataset.ex); save(); prefill(); const k = item()[0], last = get().lifts[k]; say = (a.log[a.i] || []).length ? 'Back to ' + nameOf(a.i).toLowerCase() + '.' : last ? 'Last time: ' + fmtSet(last, EX()[k], k) + '. Same again?' : 'First time with this one. Go easy.'; renderWk(); return; }
  if (t.closest('[data-addex]')) { openAddEx(); return; }
  if (t.closest('[data-busy]')) { openBusy(); return; }
  if (t.closest('[data-unit]')) { const k = item()[0]; get().units[k] = unitOf(k) === 'kg' ? 'plate' : 'kg'; save(); A = ''; fresh = true; field = 'a'; renderWk(); return; }
  if ((b = t.closest('[data-n]'))) { const v = Math.max(0, (parseFloat(A) || 0) + Number(b.dataset.n)); A = String(Math.round(v * 100) / 100); fresh = false; field = 'a'; renderWk(); return; }
  if ((b = t.closest('[data-f]'))) { field = b.dataset.f; fresh = true; renderWk(); return; }
  if (t.closest('[data-rm]')) { a.log[a.i].splice(edit, 1); say = 'Gone. No harm done.'; save(); prefill(); renderWk(); return; }
  if ((b = t.closest('[data-set]'))) {
    const j = Number(b.dataset.set);
    if (edit === j) prefill(); else { const x = a.log[a.i][j]; edit = j; A = x.a; B = x.b; field = 'a'; fresh = true; say = 'Fixing set ' + (j + 1) + '. Type the right numbers.'; }
    renderWk(); return;
  }
  if (t.closest('[data-next]')) { const one = EX()[item()[0]].t !== 'wr'; if (!one && field === 'a') { field = 'b'; fresh = true; renderWk(); } else commit(); return; }
  if (t.closest('[data-same]')) {
    if (edit >= 0) { prefill(); say = 'Left it as it was.'; renderWk(); return; }
    const L = a.log[a.i] || [], k = item()[0];
    const src = L.length ? L[L.length - 1] : get().lifts[k];
    if (!src) { toast('Log your first set, then this repeats it'); return; }
    A = src.a; B = src.b; commit(); return;
  }
}

// ---------- sheets: busy machine, add exercise, new workout ----------
function openBusy() {
  const a = act(), e = EX()[item()[0]], cur = a.swap[a.i];
  openSheet('<h2>' + esc(e.n) + ' busy?</h2><p class="muted">Swap the movement, not the whole workout. Your sets log under the swap.</p>' +
    [e.n].concat(e.subs).map((n, j) => '<button type="button" class="opt' + ((j === 0 && !cur) || n === cur ? ' cur' : '') + '" data-sub="' + (j === 0 ? '' : esc(n)) + '">' + (j === 0 ? esc(n) + ' (original)' : esc(n)) + '</button>').join('') +
    '<div class="lbl" style="margin-top:6px">Something else</div><div class="addrow"><label class="sr" for="subIn">Your own swap</label><input id="subIn" type="text" placeholder="e.g. Pec deck" autocomplete="off" enterkeyhint="done"><button type="button" class="btn" data-subadd="1">Use it</button></div>' +
    '<button type="button" class="btn alt" data-close>Cancel</button>', (ev) => {
    const t = ev.target;
    if (t.closest('[data-subadd]')) {
      const v = (document.getElementById('subIn').value || '').trim(); if (!v) return;
      const k = item()[0], st = get(); st.subsAdded[k] = st.subsAdded[k] || []; if (!e.subs.includes(v)) st.subsAdded[k].push(v);
      a.swap[a.i] = v; say = 'Swapped to ' + v.toLowerCase() + '. Saved it for next time.'; save(); closeSheet(); renderWk(); return;
    }
    const b = t.closest('[data-sub]');
    if (b) { const n = b.dataset.sub; if (n) a.swap[a.i] = n; else delete a.swap[a.i]; say = n ? 'Swapped to ' + n.toLowerCase() + '. Same muscles, no stress.' : 'Back to the original.'; save(); closeSheet(); renderWk(); }
  });
}
let addType = 'wr';
function openAddEx() {
  const a = act(), lib = EX(), inWk = new Set(a.items.map(x => x[0]));
  const keys = Object.keys(lib).filter(k => !inWk.has(k));
  const draw = () => '<h2>Add an exercise</h2><p class="muted">Pick one, or make your own. It joins today\'s ' + esc(a.n) + '.</p>' +
    exChips(keys, k => 'data-pickex="' + k + '"') +
    '<div class="lbl" style="margin-top:6px">Make your own</div>' +
    '<label class="sr" for="exIn">Exercise name</label><input id="exIn" type="text" placeholder="e.g. Cable fly" autocomplete="off" enterkeyhint="done">' +
    '<div class="chips" id="typePicks">' + TYPES.map(tp => '<button type="button" class="chip small" data-type="' + tp[0] + '" aria-pressed="' + (tp[0] === addType) + '">' + tp[1] + '</button>').join('') + '</div>' +
    (a.quick ? '' : '<label class="keep"><input type="checkbox" id="keepIt" checked> Keep it in ' + esc(a.n) + ' for next time</label>') +
    '<div class="err" id="exErr"></div>' +
    '<button type="button" class="btn" data-makeex="1">Add it</button><button type="button" class="btn alt" data-close>Cancel</button>';
  openSheet(draw(), (ev) => {
    const t = ev.target; let b;
    if ((b = t.closest('[data-pickex]'))) { addToWorkout(b.dataset.pickex); return; }
    if ((b = t.closest('[data-type]'))) { addType = b.dataset.type; document.querySelectorAll('#typePicks [data-type]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
    if (t.closest('[data-makeex]')) { const v = (document.getElementById('exIn').value || '').trim(); if (!v) { document.getElementById('exErr').textContent = 'Give it a name first.'; return; } addToWorkout(newExercise(v, addType)); }
  });
}
function addToWorkout(key) {
  const a = act(), st = get(), lib = EX();
  const it = [key, lib[key].t === 'mins' ? '1' : '2', defRange(lib[key].t)];
  a.items.push(it);
  const keep = document.getElementById('keepIt') && document.getElementById('keepIt').checked;
  if (keep) {
    const custom = st.customWorkouts.find(w => w.id === a.id);
    if (custom) custom.items.push(it.slice());
    else { st.workoutAdds[a.id] = st.workoutAdds[a.id] || []; st.workoutAdds[a.id].push(it.slice()); }
  }
  a.i = a.items.length - 1; save(); prefill();
  say = 'Added ' + lib[key].n.toLowerCase() + (keep ? ', and it\'s saved in ' + a.n + ' now.' : ' for today.');
  closeSheet(); renderWk();
}
function openNewWk(existing) {
  const draft = existing ? { name: existing.n, picked: existing.items.map(x => x[0]) } : { name: '', picked: [] };
  const draw = msg => {
    const lib = EX();
    return '<h2>' + (existing ? 'Change workout' : 'New workout') + '</h2><p class="muted">Name it however feels like you. Tap exercises in the order you like to do them.</p>' +
      '<label class="field-label" for="wkName">NAME</label><input id="wkName" type="text" placeholder="e.g. Legs + lazy cardio" autocomplete="off" value="' + esc(draft.name) + '" enterkeyhint="done">' +
      '<div class="lbl">Exercises' + (draft.picked.length ? ' · ' + draft.picked.length + ' picked' : '') + '</div>' +
      '<div class="chips">' + Object.keys(lib).map(k => { const n = draft.picked.indexOf(k); return '<button type="button" class="chip small" data-draft="' + k + '" aria-pressed="' + (n >= 0) + '">' + (n >= 0 ? (n + 1) + ' · ' : '') + esc(lib[k].n) + '</button>'; }).join('') + '</div>' +
      '<div class="lbl">Not in the list?</div><div class="addrow"><label class="sr" for="newEx">New exercise name</label><input id="newEx" type="text" placeholder="Type an exercise" autocomplete="off" enterkeyhint="done"><button type="button" class="btn alt" data-draftadd="1">Add</button></div>' +
      '<div class="err">' + (msg || '') + '</div>' +
      '<button type="button" class="btn" data-savewk="1">Save workout</button><button type="button" class="btn alt" data-close>Cancel</button>';
  };
  const redraw = msg => { const sh = document.querySelector('#sheet .sheet'); const y = sh.scrollTop; draft.name = document.getElementById('wkName').value; sh.innerHTML = draw(msg); sh.scrollTop = y; };
  openSheet(draw(), (ev) => {
    const t = ev.target; let b;
    if ((b = t.closest('[data-draft]'))) { const k = b.dataset.draft, n = draft.picked.indexOf(k); if (n >= 0) draft.picked.splice(n, 1); else draft.picked.push(k); redraw(); return; }
    if (t.closest('[data-draftadd]')) { const v = (document.getElementById('newEx').value || '').trim(); if (!v) return; draft.picked.push(newExercise(v, 'wr')); save(); redraw(); return; }
    if (t.closest('[data-savewk]')) {
      draft.name = document.getElementById('wkName').value.trim();
      if (!draft.name) { redraw('Give it a name first.'); return; }
      if (!draft.picked.length) { redraw('Pick at least one exercise.'); return; }
      const lib = EX(), old = existing ? existing.items : [];
      const w = { id: existing ? existing.id : 'u' + uid(), n: draft.name, d: draft.picked.length + (draft.picked.length === 1 ? ' exercise' : ' exercises') + ' · yours', items: draft.picked.map(k => (old.find(x => x[0] === k) || [k, lib[k].t === 'mins' ? '1' : '2', defRange(lib[k].t)]).slice()) };
      const list = get().customWorkouts, at = list.findIndex(x => x.id === w.id);
      if (at >= 0) list[at] = w; else list.push(w);
      save(); closeSheet(); renderStart(); toast('Saved ' + draft.name);
    }
  });
}

// ---------- your sessions: every workout, in words you can copy into anything ----------
const ordered = () => get().sessions.slice().sort((x, y) => (x.date + x.ts).localeCompare(y.date + y.ts));
const setCount = s => s.exercises.reduce((n, x) => n + x.sets.length, 0);
const subline = s => { const c = s.exercises.length, n = setCount(s); return c + (c === 1 ? ' exercise' : ' exercises') + (n ? ' · ' + n + (n === 1 ? ' set' : ' sets') : ' · no numbers'); };
function sessionRow(s, n) {
  return '<button type="button" class="sessrow" data-sess="' + s.id + '"><span class="num">' + n + '</span><span class="tx"><b>' + esc(s.workoutName) + '</b><small>' + esc(dayDate(s.date)) + ' · ' + esc(subline(s)) + '</small></span><i aria-hidden="true">›</i></button>';
}
function sessionsList() {
  const all = ordered(); if (!all.length) return '';
  const recent = all.slice(-4).reverse();
  return '<div class="lbl">Your sessions</div><div class="sesslist">' + recent.map(s => sessionRow(s, all.indexOf(s) + 1)).join('') +
    (all.length > 4 ? '<button type="button" class="rowlink" data-allsess style="width:100%"><span>All your sessions</span><b>›</b></button>' : '') + '</div>';
}
function allSessions() {
  const all = ordered();
  openSheet('<h2>All your sessions</h2><p class="muted" style="margin:0">Tap one to see it, or copy it into another app.</p><div class="sesslist all">' +
    all.slice().reverse().map(s => sessionRow(s, all.indexOf(s) + 1)).join('') + '</div><button type="button" class="btn ghost" data-close>Done</button>', ev => {
    const b = ev.target.closest('[data-sess]'); if (b) sessionSheet(b.dataset.sess);
  });
}
// one set, the way you'd write it down
function setWords(x, e, k) {
  const t = (e && e.t) || (x.b === '' || x.b == null ? 'hold' : 'wr');
  if (t === 'hold') return x.a + ' sec';
  if (t === 'mins') return x.a + ' min';
  const w = unitOf(k) === 'plate' ? 'plate ' + x.a : (Number(x.a) ? x.a + ' kg' : 'body weight');
  return w + ' × ' + x.b + (e && e.each ? ' each side' : '');
}
// the copyable text: a title, the date, then each exercise in the order you did it, sets on one line
export function sessionText(s, n) {
  const lib = EX(), c = s.exercises.length, sets = setCount(s);
  const lines = ['✦ Session ' + n + ' · ' + s.workoutName, dayDate(s.date) + ' · ' + c + (c === 1 ? ' exercise' : ' exercises') + (sets ? ' · ' + sets + (sets === 1 ? ' set' : ' sets') : '') + (s.light === 'yellow' ? ' · yellow day' : s.light === 'red' ? ' · gentle day' : ''), ''];
  s.exercises.forEach((x, i) => {
    lines.push((i + 1) + '. ' + (x.swap ? x.swap + ' (instead of ' + x.name.toLowerCase() + ')' : x.name));
    lines.push('   ' + (x.sets.length ? x.sets.map(z => setWords(z, lib[x.key], x.key)).join('  ·  ') : 'done ✓'));
  });
  lines.push('', '— logged with Prequel');
  return lines.join('\n');
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* older phones: fall back below */ }
  const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
  document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove(); return ok;
}
function sessionSheet(id) {
  const all = ordered(), s = all.find(x => x.id === id); if (!s) return;
  const text = sessionText(s, all.indexOf(s) + 1);
  openSheet('<h2>Session ' + (all.indexOf(s) + 1) + '</h2><p class="muted" style="margin:0">' + esc(s.workoutName) + ' · ' + esc(dayDate(s.date)) + '. Exercises are in the order you did them.</p>' +
    '<pre class="sesstext">' + esc(text) + '</pre>' +
    '<button type="button" class="btn" data-copy>Copy</button><button type="button" class="btn ghost" data-close>Done</button>', async ev => {
    if (!ev.target.closest('[data-copy]')) return;
    toast((await copyText(text)) ? 'Copied. Paste it anywhere.' : 'Couldn\'t copy. Press and hold the text to copy it.');
  });
}

// ---------- quick session: no planning. Track sets and reps as you go, or just tick what you did ----------
// your most recent exercises first, so the ones you actually do are right there
function recentKeys() {
  const lib = EX(), out = [];
  get().sessions.slice().sort((a, b) => (b.date + b.ts).localeCompare(a.date + a.ts)).forEach(s => s.exercises.forEach(x => { if (lib[x.key] && !out.includes(x.key)) out.push(x.key); }));
  return out.slice(0, 8);
}
function exChips(keys, attr, on) {
  const lib = EX(), rec = recentKeys().filter(k => keys.includes(k)), rest = keys.filter(k => !rec.includes(k));
  const chip = k => { const n = on ? on.indexOf(k) : -1; return '<button type="button" class="chip small" ' + attr(k) + (on ? ' aria-pressed="' + (n >= 0) + '"' : '') + '>' + (n >= 0 ? '✓ ' : '') + esc(lib[k].n) + '</button>'; };
  return (rec.length ? '<div class="lbl">Recent</div><div class="chips">' + rec.map(chip).join('') + '</div>' : '') +
    (rest.length ? '<div class="lbl">' + (rec.length ? 'Everything else' : 'Exercises') + '</div><div class="chips">' + rest.map(chip).join('') + '</div>' : '');
}
function lastSession() {
  const d = logDate();
  return get().sessions.filter(s => s.date <= d && s.exercises.length).sort((a, b) => (a.date + a.ts).localeCompare(b.date + b.ts)).pop() || null;
}
function openQuick() {
  const st = get(), was = st.quickMode, prev = lastSession(), lib = EX();
  const opt = (k, title, sub) => '<button type="button" class="opt' + (was === k ? ' cur' : '') + '" data-q="' + k + '">' + title + (was === k ? ' <span class="lastpick">last time</span>' : '') + '<small style="display:block;font-weight:700;opacity:.7">' + sub + '</small></button>';
  const names = prev ? prev.exercises.map(x => x.name).slice(0, 3).join(', ') + (prev.exercises.length > 3 ? '…' : '') : '';
  openSheet('<h2>Quick session</h2><p class="muted">How do you want to track it today?</p>' +
    opt('reps', 'Track sets and reps', 'pick exercises as you go') + opt('tick', 'Track without reps', 'just tick what you did') +
    (prev ? '<div class="lbl">Or</div><button type="button" class="opt" data-q="same">Same as last time<small style="display:block;font-weight:700;opacity:.7">' + esc(prev.workoutName) + ' · ' + esc(names) + '</small></button>' : '') +
    '<button type="button" class="btn ghost" data-close>Not now</button>', ev => {
    const b = ev.target.closest('[data-q]'); if (!b) return;
    const q = b.dataset.q;
    if (q === 'reps') { st.quickMode = 'reps'; save(); openFirstPick(); return; }
    if (q === 'tick') { st.quickMode = 'tick'; save(); openTick([]); return; }
    // same as last time: the same exercises (and swaps), tracked the same way as last time
    const keys = prev.exercises.map(x => x.key).filter(k => lib[k]);
    if (!keys.length) { toast('Those exercises aren\'t around any more. Pick fresh?'); return; }
    if (prev.noReps) { openTick(keys); return; }
    const base = byId(prev.workoutId), swap = {};
    const items = keys.map((k, j) => { const x = prev.exercises.find(y => y.key === k); if (x && x.swap) swap[j] = x.swap; return ((base && base.items.find(it => it[0] === k)) || [k, lib[k].t === 'mins' ? '1' : '2', defRange(lib[k].t)]).slice(); });
    closeSheet(); beginQuick(base ? prev.workoutId : 'quick', base ? prev.workoutName : 'Quick session', items, swap, 'Same as last time. ' + nameOf0(items[0][0], swap[0]) + ' first.');
  });
}
const nameOf0 = (k, sw) => sw || (EX()[k] || { n: '?' }).n;
function beginQuick(id, name, items, swap, line) {
  get().active = { id, n: name, items, i: 0, log: {}, swap: swap || {}, hinted: {}, light, date: logDate(), started: Date.now(), lastAt: 0, quick: id === 'quick' ? 1 : 0 };
  save(); view = 'wk'; prefill(); say = line; render(); window.scrollTo(0, 0);
}
// with numbers: pick just the first exercise, then add the rest as you go
function openFirstPick() {
  const lib = EX();
  openSheet('<h2>What\'s first?</h2><p class="muted">Just the first one. Add the next whenever you\'re ready.</p>' + exChips(Object.keys(lib), k => 'data-first="' + k + '"') +
    '<div class="lbl">Not in the list?</div><div class="addrow"><label class="sr" for="qNew">New exercise name</label><input id="qNew" type="text" placeholder="Type an exercise" autocomplete="off" enterkeyhint="done"><button type="button" class="btn alt" data-firstnew="1">Add</button></div>' +
    '<button type="button" class="btn ghost" data-close>Cancel</button>', ev => {
    let b, k = null;
    if ((b = ev.target.closest('[data-first]'))) k = b.dataset.first;
    if (ev.target.closest('[data-firstnew]')) { const v = (document.getElementById('qNew').value || '').trim(); if (!v) return; k = newExercise(v, 'wr'); }
    if (!k) return;
    const L = EX(), it = [k, L[k].t === 'mins' ? '1' : '2', defRange(L[k].t)];
    closeSheet(); beginQuick('quick', 'Quick session', [it], {}, 'No plan, no problem. ' + L[k].n + ' first.');
  });
}
// without reps: tick everything you did, and it's logged
function openTick(pre) {
  const picked = pre.slice();
  const draw = msg => '<h2>What did you do?</h2><p class="muted">Tick everything you did. No numbers needed.</p>' +
    exChips(Object.keys(EX()), k => 'data-tick="' + k + '"', picked) +
    '<div class="lbl">Not in the list?</div><div class="addrow"><label class="sr" for="tkNew">New exercise name</label><input id="tkNew" type="text" placeholder="Type an exercise" autocomplete="off" enterkeyhint="done"><button type="button" class="btn alt" data-ticknew="1">Add</button></div>' +
    '<div class="err">' + (msg || '') + '</div>' +
    '<button type="button" class="btn" data-ticklog="1">' + (picked.length ? 'Log it · ' + picked.length + (picked.length === 1 ? ' exercise' : ' exercises') : 'Log it') + '</button><button type="button" class="btn ghost" data-close>Cancel</button>';
  const redraw = msg => { const sh = document.querySelector('#sheet .sheet'), y = sh.scrollTop; sh.innerHTML = draw(msg); sh.scrollTop = y; };
  openSheet(draw(), ev => {
    const t = ev.target; let b;
    if ((b = t.closest('[data-tick]'))) { const k = b.dataset.tick, n = picked.indexOf(k); if (n >= 0) picked.splice(n, 1); else picked.push(k); redraw(); return; }
    if (t.closest('[data-ticknew]')) { const v = (document.getElementById('tkNew').value || '').trim(); if (!v) return; picked.push(newExercise(v, 'wr')); save(); redraw(); return; }
    if (t.closest('[data-ticklog]')) { if (!picked.length) { redraw('Tick at least one, or add your own.'); return; } logTicked(picked); }
  });
}
function logTicked(keys) {
  const st = get(), lib = EX(), d = logDate();
  const exercises = keys.map(k => ({ key: k, name: lib[k].n, swap: null, sets: [] }));
  const first = st.sessions.length === 0;
  const session = { id: uid(), date: d, ts: Date.now(), workoutId: 'quick', workoutName: 'Quick session', light, exercises, noReps: 1 };
  st.sessions.push(session);
  const c = exercises.length + (exercises.length === 1 ? ' exercise' : ' exercises');
  addMoment('move', 'Quick session · ' + c, d, { ref: session.id, bright: first ? 1 : 0 });
  save();
  const n = st.sessions.length;
  openSheet('<div class="done" style="display:flex;flex-direction:column;align-items:center;gap:8px">' + him('cheer', 'pop', 'Your character jumping with joy') +
    '<div class="big">Session ' + n + ' done.</div>' +
    '<p class="muted">' + c + ', no numbers needed. A star just went up in your sky.</p>' +
    '<p class="muted" style="font-size:13px">' + n + ' of 100.' + (n >= 100 ? ' You made it. And it keeps going.' : '') + '</p>' +
    '<button type="button" class="btn wide" data-close>Back to Move</button></div>', null);
  view = 'start'; render();
}

// ---------- you're in control: change or remove anything you've added ----------
function openManage() {
  const st = get(), lib = EX();
  const wkName = id => (byId(id) || { n: '?' }).n;
  const row = (label, sub, btns) => '<div class="mgrow"><span>' + esc(label) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' + btns + '</div>';
  const x = (attr) => '<button type="button" class="x" ' + attr + '>Remove</button>';
  const adds = [];
  Object.keys(st.workoutAdds).forEach(wid => (st.workoutAdds[wid] || []).forEach((it, j) => adds.push([wid, j, it])));
  const swaps = [];
  Object.keys(st.subsAdded).forEach(k => (st.subsAdded[k] || []).forEach((n, j) => swaps.push([k, j, n])));
  const exKeys = Object.keys(st.customExercises);
  const empty = '<p class="muted" style="font-size:13px;margin:0">Nothing here yet.</p>';
  openSheet('<h2>Your workouts and exercises</h2><p class="muted">Change or remove anything you\'ve added. Your past sessions stay exactly as they were. Tap Remove twice to be sure.</p>' +
    '<div class="lbl">Workouts you made</div>' + (st.customWorkouts.length ? st.customWorkouts.map(w => row(w.n, w.items.length + (w.items.length === 1 ? ' exercise' : ' exercises'), '<button type="button" data-m="editwk" data-id="' + w.id + '">Change</button>' + x('data-m="delwk" data-id="' + w.id + '"'))).join('') : empty) +
    '<div class="lbl">Added to playbook workouts</div>' + (adds.length ? adds.map(([wid, j, it]) => row((lib[it[0]] || { n: '?' }).n, 'in ' + wkName(wid), x('data-m="deladd" data-id="' + wid + '" data-j="' + j + '"'))).join('') : empty) +
    '<div class="lbl">Exercises you made</div>' + (exKeys.length ? exKeys.map(k => row(st.customExercises[k].n, TYPES.find(t => t[0] === st.customExercises[k].t)[1], '<button type="button" data-m="renex" data-id="' + k + '">Rename</button>' + x('data-m="delex" data-id="' + k + '"'))).join('') : empty) +
    '<div class="lbl">Swaps you added</div>' + (swaps.length ? swaps.map(([k, j, n]) => row(n, 'for ' + (lib[k] || { n: '?' }).n.toLowerCase(), x('data-m="delswap" data-id="' + k + '" data-j="' + j + '"'))).join('') : empty) +
    '<button type="button" class="btn alt" data-close>Done</button>', ev => {
    const b = ev.target.closest('[data-m]'); if (!b) return;
    const m = b.dataset.m, id = b.dataset.id, j = Number(b.dataset.j);
    if (m === 'editwk') { openNewWk(st.customWorkouts.find(w => w.id === id)); return; }
    if (m === 'renex') { renameEx(id); return; }
    // removing asks twice, right on the button
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Sure?'; return; }
    if (m === 'delwk') st.customWorkouts = st.customWorkouts.filter(w => w.id !== id);
    if (m === 'deladd') { st.workoutAdds[id].splice(j, 1); if (!st.workoutAdds[id].length) delete st.workoutAdds[id]; }
    if (m === 'delswap') { st.subsAdded[id].splice(j, 1); if (!st.subsAdded[id].length) delete st.subsAdded[id]; }
    if (m === 'delex') {
      if (act() && act().items.some(it => it[0] === id)) { toast('It\'s in your open workout. Finish that first.'); return; }
      delete st.customExercises[id]; delete st.subsAdded[id]; delete st.lifts[id]; delete st.units[id];
      st.customWorkouts.forEach(w => { w.items = w.items.filter(it => it[0] !== id); });
      st.customWorkouts = st.customWorkouts.filter(w => w.items.length);
      Object.keys(st.workoutAdds).forEach(wid => { st.workoutAdds[wid] = st.workoutAdds[wid].filter(it => it[0] !== id); if (!st.workoutAdds[wid].length) delete st.workoutAdds[wid]; });
    }
    save(); renderStart(); openManage(); toast('Removed.');
  });
}
function renameEx(k) {
  const e = get().customExercises[k];
  openSheet('<h2>Rename exercise</h2><label class="sr" for="renIn">Exercise name</label><input id="renIn" type="text" value="' + esc(e.n) + '" autocomplete="off" enterkeyhint="done"><button type="button" class="btn" data-o="1">Save</button><button type="button" class="btn alt" data-back="1">Back</button>', ev => {
    if (ev.target.closest('[data-back]')) { openManage(); return; }
    if (!ev.target.closest('[data-o]')) return;
    const v = document.getElementById('renIn').value.trim(); if (!v) return;
    e.n = v; save(); renderStart(); openManage(); toast('Renamed.');
  });
}
