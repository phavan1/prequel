import { get, save, uid, addMoment, addDays, today } from '../store.js';
import { EXERCISES, WORKOUTS, REST_GUIDE, feelFamily, feelLabel } from '../data.js';
import { esc, nav, backLink, dateChip, logDate, prettyDate, him, pop, openSheet, closeSheet, toast, pick, reduceMotion } from '../ui.js';
import { dayDate } from '../pdf.js';
import { hubHtml, hubClick, hubTick, milestoneOf, milestoneSheet } from './movehub.js';
import { editSession } from './days.js';
import { removeEntry } from '../activities.js';
import { count as goalCount, unitOf as goalUnit } from '../goals.js';

const CHEERS = ['Nice one.', 'Look at you go.', 'That one wobbled. Still counts.', 'Breathe. You did that.', 'Sweaty and proud.', 'One more in the bank.', 'Okay, that was strong.'];
const TYPES = [['wr', 'Weight × reps'], ['bw', 'Body weight × reps'], ['hold', 'Seconds'], ['mins', 'Minutes']];
const defRange = t => t === 'hold' ? '20-60s' : t === 'mins' ? '10 min' : '8-12';
// a weight that isn't a number (v43): you didn't note it, it was just the bar, or your own body weight
export const SPECIAL = { nn: 'Not noted', bar: 'Bar only', bw: 'Body weight' };
// v59: "Bar +": a bar you don't know the weight of, plus the kg you loaded on EACH side. Saved as "b+2.5".
export const isBP = a => String(a == null ? '' : a).startsWith('b+');
export const bpKg = a => isBP(a) ? String(a).slice(2) : '';

// ---------- library: playbook + your own additions ----------
function EX() {
  const st = get(), out = {};
  Object.keys(EXERCISES).forEach(k => { out[k] = Object.assign({}, EXERCISES[k], { subs: EXERCISES[k].subs.concat(st.subsAdded[k] || []) }); });
  Object.keys(st.customExercises).forEach(k => { out[k] = Object.assign({ subs: [] }, st.customExercises[k], { subs: (st.customExercises[k].subs || []).concat(st.subsAdded[k] || []) }); });
  // a playbook exercise you do with your body weight only (v43): reps, no weight box
  Object.keys(st.measure || {}).forEach(k => { if (out[k] && out[k].t === 'wr' && st.measure[k] === 'bw') out[k] = Object.assign({}, out[k], { t: 'bw' }); });
  return out;
}
function workouts() {
  const st = get();
  return WORKOUTS.map(w => Object.assign({}, w, { items: w.items.concat(st.workoutAdds[w.id] || []) })).concat(st.customWorkouts);
}
const byId = id => workouts().find(w => w.id === id);
function newExercise(name, t) {
  const key = 'c' + uid();
  get().customExercises[key] = { n: name, t, m: 0, rest: t === 'wr' || t === 'bw' ? 'c' : null, subs: [] };
  return key;
}

// ---------- live state (the workout in progress is saved, so closing the app never loses it) ----------
let hintGone = false, view = 'hub', light = 'green', field = 'a', fresh = true, A = '', B = '', edit = -1, say = '', justLogged = false, timer = null, root = null;
const act = () => get().active;

export function mount(r, params) {
  root = r;
  if (act()) view = 'wk'; else view = 'hub'; // v48: Move opens on the hub; Gym is one tile
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
  if (view === 'hub') renderHub(); else if (view === 'start') renderStart(); else renderWk();
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
  if (!last) s = { k: 'A GOOD PLACE TO START', h: 'Full Body A', p: 'Your main general session. Two sets is plenty. Every session counts.', btns: [['fbA', 'Start Full Body A']] };
  else if (last.date === addDays(d, -1) || last.date === d) s = { k: 'WHAT\'S NEXT', h: 'Lower A, or Pull', p: 'You trained ' + (last.date === d ? 'already today' : 'yesterday') + ' (' + esc(last.workoutName) + '), so let\'s use different muscles. Full Body ' + nextFB + ' waits until after a rest day.', btns: [['lA', 'Lower A'], ['pull', 'Pull']] };
  else s = { k: 'WHAT\'S NEXT', h: 'Full Body ' + nextFB, p: 'There\'s been a rest day since ' + esc(last.workoutName) + ' (' + esc(prettyDate(last.date)).toLowerCase() + '), so Full Body ' + nextFB + ' is next' + (lastFB ? ' in your sequence' : '') + '. Nothing resets because it\'s a new week.', btns: [['fb' + nextFB, 'Start Full Body ' + nextFB]] };
  if (light === 'yellow') { s.k = 'YELLOW DAY'; s.note = 'Keep it to 2 sets and skip the optional extras. Or do the 20-Minute Minimum.'; s.btns.push(['min20', '20-Minute Minimum']); }
  return s;
}
// a gentle nudge toward Yellow (v45), only from what you told Rest: how you last woke up, and all your rest in the
// last 24 hours (naps count, so split sleep isn't punished). Never a verdict: you still pick the light.
function restHint() {
  if (hintGone || light !== 'green' || logDate() !== today()) return '';
  const now = Date.now(), since = now - 24 * 3600000;
  const recent = get().rests.filter(r => r.end > since && r.end <= now);
  if (!recent.length) return '';
  const last = recent.reduce((a, b) => b.end > a.end ? b : a);
  const hours = recent.reduce((n, r) => n + (r.end - Math.max(r.start, since)), 0) / 3600000;
  const why = last.feel && feelFamily(last.feel) === 'groggy' ? 'You woke up ' + feelLabel(last.feel).toLowerCase() + '.' : hours < 5 ? 'Not much rest in the last day.' : '';
  return why ? '<button type="button" class="resthint" data-light="yellow"><span aria-hidden="true">🌙</span><span>' + why + ' Yellow might be kinder today. Lighter still counts.</span></button>' : '';
}
// "How's the body?" lives on the hub (v48), so it covers every activity
const L = [['green', 'Green', 'awake, normal', '#2E8B57'], ['yellow', 'Yellow', 'tired, a bit sore', '#E3B000'], ['red', 'Red', 'unwell, faint, pain', '#C2412D']];
const lightsHtml = () => '<div class="lights">' + L.map(l => '<button type="button" class="light" data-light="' + l[0] + '" aria-pressed="' + (light === l[0]) + '"><i style="background:' + l[3] + '"></i><b>' + l[1] + '</b><span>' + l[2] + '</span></button>').join('') + '</div>' + restHint() +
  (light === 'red' ? '<div class="note-r">Rest is the plan today, and that is a good plan. If it is chest pain, dizziness, feeling faint or a fever, please get it checked.</div>' : light === 'yellow' ? '<div class="note-y">Go gently today. A lighter version of anything still counts.</div>' : '');
function renderHub() { root.innerHTML = hubHtml(lightsHtml()) + nav('move'); }
function renderStart() {
  const st = get(), s = suggestion(), ms = milestoneOf('gym');
  const lt = L.find(l => l[0] === light);
  root.innerHTML =
    '<div class="top"><button type="button" class="back" data-hub style="border:0;background:transparent;color:var(--blue);padding:0">‹ Move</button>' + dateChip() + '</div>' +
    '<div class="gymhead"><span class="lbl">Session ' + (st.sessions.length + 1) + '</span><button type="button" class="lnk" data-gymmile>' + (ms ? goalCount(ms) + ' of ' + ms.target + ' ' + esc(goalUnit(ms)) + ' ›' : 'Set a milestone ›') + '</button></div>' +
    '<p class="todaylight"><i style="background:' + lt[3] + '"></i>' + lt[1] + ' day <button type="button" class="lnk" data-hub>change</button></p>' +
    '<button type="button" class="quickgo" data-quick="1"><b>Quick session</b><span>No plan needed. Just go.</span><i aria-hidden="true">›</i></button>' +
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
// "Last time" for one exercise (v57): read from your saved workouts, so fixing an old workout in Days fixes it here too.
// The newest session on or before this workout's day that has it (a swap matches by what you swapped to).
function lastTime(i) {
  const a = act(), k = a.items[i][0], sw = a.swap[i] || null;
  const list = get().sessions.filter(s => s.date <= a.date && Array.isArray(s.exercises))
    .sort((x, y) => x.date.localeCompare(y.date) || (Number(x.ts) || 0) - (Number(y.ts) || 0));
  for (let n = list.length - 1; n >= 0; n--) {
    const x = list[n].exercises.find(y => (sw ? y.swap === sw : y.key === k && !y.swap) && (y.sets || []).length);
    if (x) return { date: list[n].date, sets: x.sets };
  }
  return null;
}
function lastWords(i) {
  const L = lastTime(i), k = act().items[i][0], e = EX()[k] || {};
  if (!L) return '';
  const sets = L.sets.map(x => fmtSet(x, e, k));
  return sets.join(', ') + ' (' + prettyDate(L.date, { weekday: 'short', day: 'numeric', month: 'short' }) + ')';
}
const hello = i => { const w = lastWords(i); return w ? 'Last time: ' + w + '. Same again?' : 'First time with this one. Go easy.'; };
// a set starts from the set you just did; the first set of an exercise starts empty (v57), with last time as a hint
function prefill() {
  const a = act(); if (!a) return;
  const k = item()[0], L = a.log[a.i] || [];
  const src = L.length ? L[L.length - 1] : { a: '', b: '' };
  A = src.a || ''; B = src.b || ''; field = 'a'; fresh = true; edit = -1;
  if (!L.length) { const g = (lastTime(a.i) || { sets: [] }).sets[0]; if (g && isBP(g.a)) A = 'b+'; } // last time was Bar +: open in Bar +, still empty
  if ((EX()[k] || {}).t === 'bw') { A = 'bw'; field = 'b'; }
}
function startWorkout(id) {
  const base = byId(id); if (!base) return;
  get().active = { id: base.id, n: base.n, items: base.items.map(x => x.slice()), i: 0, log: {}, swap: {}, hinted: {}, light, date: logDate(), started: Date.now(), lastAt: 0 };
  save(); view = 'wk'; prefill();
  say = id === 'min20' ? 'Three exercises. Then we decide together.' : id === 'rec' ? 'Gentle today. Nothing to prove.' : 'Let\'s go. ' + nameOf(0) + ' first.' + (lastWords(0) ? ' Last time: ' + lastWords(0) + '.' : '');
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
  if (SPECIAL[x.a]) return SPECIAL[x.a] + ' × ' + x.b + (e.each ? ' each' : '');
  if (isBP(x.a)) return 'bar + ' + bpKg(x.a) + 'kg each side × ' + x.b;
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
  // an empty box on the first set shows last time's first set, faintly; nothing is saved until you type it or tap Same again (v57)
  const lt = !(a.log[a.i] || []).length && edit < 0 ? lastTime(a.i) : null, g0 = lt && lt.sets[0];
  const ghost = (v, f) => (v !== '' && !(f === 'a' && v === 'b+')) || !g0 || g0[f] === '' || g0[f] == null ? '' : '<span class="v ghost">last ' + esc(f === 'a' ? (SPECIAL[g0.a] ? SPECIAL[g0.a].toLowerCase() : isBP(g0.a) ? (v === 'b+' ? bpKg(g0.a) : 'bar+' + bpKg(g0.a)) : g0.a) : g0.b) + '</span>';
  let fields;
  if (e.t === 'bw') {
    fields = '<div class="fields one"><button type="button" class="field" data-f="b" aria-pressed="true"><span class="l">REPS · BODY WEIGHT' + (e.each ? ' · EACH SIDE' : '') + '</span><span class="v' + (fresh ? ' fresh' : '') + '">' + esc(B) + '</span>' + ghost(B, 'b') + '</button></div>';
  } else if (one) {
    fields = '<div class="fields one"><button type="button" class="field" data-f="a" aria-pressed="true"><span class="l">' + (e.t === 'hold' ? 'SECONDS' : 'MINUTES') + '</span><span class="v' + (fresh ? ' fresh' : '') + '">' + esc(A) + '</span></button></div>';
  } else {
    const u = unitOf(k);
    fields = '<div class="fields">' +
      '<button type="button" class="field" data-f="a" aria-pressed="' + (field === 'a') + '"><span class="l">' + (u === 'plate' ? 'PLATE #' : isBP(A) ? 'BAR + · KG EACH SIDE' : 'WEIGHT · KG') + (e.m && !isBP(A) ? '<span class="unit" data-unit="1"><span class="' + (u === 'kg' ? 'on' : '') + '">kg</span><span class="' + (u === 'plate' ? 'on' : '') + '">plate</span></span>' : '') + '</span><span class="v' + (fresh && field === 'a' ? ' fresh' : '') + (SPECIAL[A] ? ' word' : '') + '">' + (isBP(A) ? esc(bpKg(A)) : esc(SPECIAL[A] || A)) + '</span>' + ghost(A, 'a') + (SPECIAL[A] ? '' : isBP(A) ? '<span class="nudge"><span data-n="-1.25">−1.25</span><span data-n="1.25">+1.25</span></span>' : u === 'kg' ? '<span class="nudge"><span data-n="-2.5">−2.5</span><span data-n="2.5">+2.5</span></span>' : '<span class="nudge"><span data-n="-1">−1</span><span data-n="1">+1</span></span>') + '</button>' +
      '<button type="button" class="field" data-f="b" aria-pressed="' + (field === 'b') + '"><span class="l">REPS' + (e.each ? ' · EACH SIDE' : '') + '</span><span class="v' + (fresh && field === 'b' ? ' fresh' : '') + '">' + esc(B) + '</span>' + ghost(B, 'b') + '</button></div>' +
      // when the weight isn't a number
      '<div class="wsp">' + Object.keys(SPECIAL).map(v => '<button type="button" data-wsp="' + v + '" aria-pressed="' + (A === v) + '">' + SPECIAL[v] + '</button>').join('') +
        (u === 'kg' ? '<button type="button" data-bp="1" aria-pressed="' + isBP(A) + '">Bar +</button>' : '') + '</div>'; // v64: Bar + on every weight exercise in kg (chest press can be done on a bar); only plates (a machine's pin) hide it
  }
  const nextLabel = (!one && field === 'a') ? 'Next →' : (edit >= 0 ? 'Save set ' + (edit + 1) + ' ✓' : 'Log ✓');
  const banner = a.id === 'min20' ? '<div class="banner min">If you feel better after these three, continue. If not, leave. The session still counts.</div>' : (a.light === 'yellow' ? '<div class="banner yellow">Yellow day · 2 sets is plenty, optional extras skipped.</div>' : '');
  const pose = 'talking'; // v60: his head and shoulders, talking to you (Phavan didn't like the jumping one here)
  root.innerHTML =
    '<div class="wk">' +
    '<div class="wkhead"><button type="button" class="back" data-leave="1" style="border:0;background:transparent;color:var(--blue)">‹ Move</button><h1>' + esc(a.n) + (a.date !== today() ? '<br><small class="muted" style="font-size:11px">for ' + esc(prettyDate(a.date)) + '</small>' : '') + '</h1><button type="button" class="fin" data-finish="1">Finish</button></div>' + banner +
    '<div class="hscroll exs" id="exs">' + a.items.map((x, j) => { const done = (a.log[j] || []).length >= Math.min(2, baseSets(x)), n = (a.order || []).indexOf(j); return '<button type="button" data-ex="' + j + '" aria-pressed="' + (j === a.i) + '">' + (n >= 0 ? '<span class="ord' + (done ? ' done' : '') + '" aria-label="done ' + ordinal(n + 1) + '">' + (n + 1) + '</span>' : '') + esc(nameOf(j)) + (a.hinted[j] ? ' ↑' : '') + '</button>'; }).join('') + '<button type="button" class="addex" data-addex="1">+ Add</button></div>' +
    lastOrderLine(a) +
    '<div class="strip">' + him(pose, 'breathe', 'Your character, talking you through it').replace('class="him', 'id="him" class="him') + '<div class="say">' + esc(say) + '</div><span class="pill" id="since">' + (a.lastAt ? 'Since last set 0:00' : 'No sets yet') + '</span></div>' +
    '<div class="info"><div class="t"><b>' + esc(nameOf(a.i)) + (a.swap[a.i] ? ' <span style="font-weight:700;color:var(--ink-soft);font-size:12px">for ' + esc(e.n.toLowerCase()) + '</span>' : '') + '</b>' + [setsLabel, it[2], restTxt].filter(Boolean).map(esc).join(' · ') + '</div>' + '<div class="infobtns"><button type="button" class="busy" data-busy="1">Machine busy?</button><button type="button" class="busy more" data-exmenu="1" aria-label="More for ' + esc(nameOf(a.i)) + '">⋯</button></div></div>' +
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
  if (view === 'hub' && root) hubTick(root);
  const a = act(), el = root && root.querySelector('#since'); if (!el || !a || !a.lastAt) return;
  const sec = Math.floor((Date.now() - a.lastAt) / 1000);
  el.textContent = 'Since last set ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
function press(kk) {
  const e = EX()[item()[0]], f = field;
  if (f === 'a' && isBP(A)) { // the kg on each side of the bar
    let v = bpKg(A);
    if (kk === 'del') v = v.slice(0, -1); else if (kk === '.') { if (!v.includes('.')) v = (v || '0') + '.'; } else if (v.length < 4) v = v === '0' ? kk : v + kk;
    A = 'b+' + v; fresh = false; renderWk(); return;
  }
  let v = fresh || (f === 'a' && SPECIAL[A]) ? '' : (f === 'a' ? A : B);
  if (kk === 'del') v = (fresh ? (f === 'a' ? A : B) : v).slice(0, -1);
  else if (kk === '.') { if (f === 'a' && e.t === 'wr' && unitOf(item()[0]) === 'kg' && !v.includes('.')) v = (v || '0') + '.'; else return; }
  else if (v.length < (f === 'a' ? 5 : 3)) v = v === '0' ? kk : v + kk;
  if (f === 'a') A = v; else B = v;
  fresh = false; renderWk();
}
function commit() {
  const a = act(), it = item(), e = EX()[it[0]];
  if (e.t === 'bw') A = 'bw';
  const reps = e.t === 'wr' || e.t === 'bw';
  if (A === 'b+') { field = 'a'; renderWk(); toast('Type the kg on each side of the bar'); return; }
  if (!A || (reps && !B)) { toast(e.t === 'wr' ? 'Type the weight and reps first' : e.t === 'bw' ? 'Type the reps first' : 'Type a number first'); return; }
  const set = { a: A, b: reps ? B : '' };
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
  // how long it took (v66): from starting to your last set, plus a few minutes to cool down. Only when logged live,
  // on the day, and only if it's believable (5 min to 4 h); otherwise left out rather than made up
  if (a.started && a.lastAt && a.date === today()) { const m = Math.round((Math.min(Date.now(), a.lastAt + 3 * 60000) - a.started) / 60000); if (m >= 5 && m <= 240) session.mins = m; }
  st.sessions.push(session);
  addMoment('move', a.n + (sets ? ' · ' + sets + (sets === 1 ? ' set' : ' sets') : ''), a.date, { ref: session.id, bright: pb || first ? 1 : 0 });
  st.active = null; save();
  const n = st.sessions.length;
  openSheet('<div class="done" style="display:flex;flex-direction:column;align-items:center;gap:8px">' + him('quietyes', 'pop', 'Your character, quietly proud, towel over his shoulder') +
    '<div class="big">Session ' + n + ' done.</div>' +
    '<p class="muted">' + (sets ? exercises.length + (exercises.length === 1 ? ' exercise, ' : ' exercises, ') + sets + (sets === 1 ? ' set' : ' sets') + '. ' : 'You showed up. It counts. ') + (pb ? 'A new heaviest lift, so your star shines brighter.' : 'A star just went up in your sky.') + '</p>' +
    '<p class="muted" style="font-size:13px">' + n + ' of 100.' + (n >= 100 ? ' You made it. And it keeps going.' : '') + '</p>' +
    '<button type="button" class="btn wide" data-copydone>Copy this workout</button><button type="button" class="btn alt wide" data-close>Back to Move</button></div>', copyDone(session));
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
  if ((b = t.closest('[data-light]'))) { light = b.dataset.light; hintGone = true; render(); return; }
  if (view === 'hub' && hubClick(e, root, render, () => { view = 'start'; render(); window.scrollTo(0, 0); }, sessionSheet)) return;
  if (t.closest('[data-hub]')) { view = 'hub'; render(); window.scrollTo(0, 0); return; }
  if (t.closest('[data-gymmile]')) { milestoneSheet('gym', render); return; }
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
  if ((b = t.closest('[data-ex]'))) { a.i = Number(b.dataset.ex); save(); prefill(); say = (a.log[a.i] || []).length ? 'Back to ' + nameOf(a.i).toLowerCase() + '.' : hello(a.i); renderWk(); return; }
  if (t.closest('[data-addex]')) { openAddEx(); return; }
  if (t.closest('[data-busy]')) { openBusy(); return; }
  if (t.closest('[data-exmenu]')) { openExMenu(); return; }
  if ((b = t.closest('[data-wsp]'))) { A = b.dataset.wsp; field = 'b'; fresh = true; renderWk(); return; }
  if (t.closest('[data-bp]')) { A = isBP(A) ? '' : 'b+'; field = 'a'; fresh = false; renderWk(); return; }
  if (t.closest('[data-unit]')) { const k = item()[0]; get().units[k] = unitOf(k) === 'kg' ? 'plate' : 'kg'; save(); A = ''; fresh = true; field = 'a'; renderWk(); return; }
  if ((b = t.closest('[data-n]')) && isBP(A)) { const v = Math.max(0, (parseFloat(bpKg(A)) || 0) + Number(b.dataset.n)); A = 'b+' + Math.round(v * 100) / 100; fresh = false; field = 'a'; renderWk(); return; }
  if ((b = t.closest('[data-n]'))) { const g = A === '' && !(a.log[a.i] || []).length ? ((lastTime(a.i) || { sets: [] }).sets[0] || {}) : {}; const v = Math.max(0, (parseFloat(A) || parseFloat(g.a) || 0) + Number(b.dataset.n)); A = String(Math.round(v * 100) / 100); fresh = false; field = 'a'; renderWk(); return; }
  if ((b = t.closest('[data-f]'))) { field = b.dataset.f; fresh = true; renderWk(); return; }
  if (t.closest('[data-rm]')) { a.log[a.i].splice(edit, 1); say = 'Gone. No harm done.'; save(); prefill(); renderWk(); return; }
  if ((b = t.closest('[data-set]'))) {
    const j = Number(b.dataset.set);
    if (edit === j) prefill(); else { const x = a.log[a.i][j]; edit = j; A = x.a; B = x.b; field = 'a'; fresh = true; say = 'Fixing set ' + (j + 1) + '. Type the right numbers.'; }
    renderWk(); return;
  }
  if (t.closest('[data-next]')) {
    // the first set's faint "last …" hint: Next or Log on an empty box takes it, as if you'd typed it (v59, Phavan)
    const ex = EX()[item()[0]], g0 = !(a.log[a.i] || []).length && edit < 0 ? ((lastTime(a.i) || { sets: [] }).sets[0] || null) : null;
    if (g0) { if (field === 'a' && (A === '' || (A === 'b+' && isBP(g0.a))) && ex.t !== 'bw' && g0.a !== '' && g0.a != null) A = String(g0.a); if ((field === 'b' || ex.t === 'bw') && B === '' && ex.t !== 'hold' && ex.t !== 'mins' && g0.b !== '' && g0.b != null) B = String(g0.b); }
    const one = ex.t !== 'wr'; if (!one && field === 'a') { field = 'b'; fresh = true; renderWk(); } else commit(); return;
  }
  if (t.closest('[data-same]')) {
    if (edit >= 0) { prefill(); say = 'Left it as it was.'; renderWk(); return; }
    const L = a.log[a.i] || [], last = lastTime(a.i);
    const src = L.length ? L[L.length - 1] : last && last.sets[0]; // first set: the first set from last time
    if (!src) { toast('Type your first set, then this repeats it'); return; }
    A = src.a; B = src.b; commit(); return;
  }
}

// ---------- ⋯ for the exercise you're on (v43): how you measure it, fix the order, remove it ----------
function keptIn(a, k) {
  const st = get(), cw = st.customWorkouts.find(w => w.id === a.id);
  if (cw && cw.items.some(it => it[0] === k)) return 'custom';
  if ((st.workoutAdds[a.id] || []).some(it => it[0] === k)) return 'add';
  return null;
}
function openExMenu() {
  const a = act(), i = a.i, k = item()[0], st = get(), e = EX()[k] || {};
  const base = EXERCISES[k] || st.customExercises[k] || {}, canMeasure = base.t === 'wr' || base.t === 'bw';
  const sets = (a.log[i] || []).length, kept = keptIn(a, k);
  const draw = armed => '<h2>' + esc(nameOf(i)) + '</h2>' +
    (canMeasure ? '<div class="lbl">How you measure it</div><div class="seg" id="measSeg"><button type="button" data-meas="wr" aria-pressed="' + (e.t === 'wr') + '">Weight × reps</button><button type="button" data-meas="bw" aria-pressed="' + (e.t === 'bw') + '">Body weight × reps</button></div>' : '') +
    ((a.order || []).length >= 2 ? '<button type="button" class="rowlink" data-fixorder style="width:100%"><span>Fix the order you did things in</span><b>›</b></button>' : '') +
    '<div class="lbl">Added it by mistake?</div>' +
    '<button type="button" class="btn danger" data-rmtoday>' + (armed === 'today' ? 'Sure? ' + (sets ? 'Its ' + sets + (sets === 1 ? ' set goes' : ' sets go') + ' too' : 'Tap again') : 'Remove from today') + '</button>' +
    (kept ? '<button type="button" class="btn alt" data-rmboth>' + (armed === 'both' ? 'Sure? Tap again' : 'Remove from today and from ' + esc(a.n) + ' for next time') + '</button>' : '') +
    '<button type="button" class="btn ghost" data-close>Close</button>';
  let armed = '';
  const sheet = openSheet(draw(''), ev => {
    const t = ev.target; let b;
    if ((b = t.closest('[data-meas]'))) { setMeasure(k, b.dataset.meas); return; }
    if (t.closest('[data-fixorder]')) { orderSheet(); return; }
    if (t.closest('[data-rmtoday]')) { if (armed !== 'today') { armed = 'today'; sheet.querySelector('.sheet').innerHTML = draw(armed); return; } removeFromToday(i, false); return; }
    if (t.closest('[data-rmboth]')) { if (armed !== 'both') { armed = 'both'; sheet.querySelector('.sheet').innerHTML = draw(armed); return; } removeFromToday(i, true); }
  });
}
function removeFromToday(i, alsoSaved) {
  const st = get(), a = act(), k = a.items[i][0], name = nameOf(i);
  if (alsoSaved) {
    const cw = st.customWorkouts.find(w => w.id === a.id);
    if (cw) cw.items = cw.items.filter(it => it[0] !== k);
    if (st.workoutAdds[a.id]) { st.workoutAdds[a.id] = st.workoutAdds[a.id].filter(it => it[0] !== k); if (!st.workoutAdds[a.id].length) delete st.workoutAdds[a.id]; }
  }
  // everything about the workout is kept by position, so shift what comes after it
  const shift = o => { const out = {}; Object.keys(o || {}).forEach(x => { const n = Number(x); if (n < i) out[n] = o[x]; else if (n > i) out[n - 1] = o[x]; }); return out; };
  a.items.splice(i, 1); a.log = shift(a.log); a.swap = shift(a.swap); a.hinted = shift(a.hinted);
  a.order = (a.order || []).filter(n => n !== i).map(n => n > i ? n - 1 : n);
  closeSheet();
  if (!a.items.length) { st.active = null; save(); view = 'start'; render(); toast('That was the only one, so the workout is cleared.'); return; }
  a.i = Math.min(i, a.items.length - 1); save(); prefill();
  say = 'Took ' + name.toLowerCase() + ' out' + (alsoSaved ? ', today and for next time.' : ' for today.'); renderWk();
}
// switch between weight × reps and body weight × reps; offer to fix past 0 kg sets
function setMeasure(k, t) {
  const st = get();
  if (st.customExercises[k]) st.customExercises[k].t = t;
  else { st.measure = st.measure || {}; if (t === 'bw') st.measure[k] = 'bw'; else delete st.measure[k]; }
  save(); closeSheet(); prefill(); renderWk();
  if (t !== 'bw') { toast('Back to weight × reps.'); return; }
  const zero = z => z.a !== '' && z.a != null && !SPECIAL[z.a] && Number(z.a) === 0;
  const a = act(), live = Object.keys(a.log).filter(j => a.items[j] && a.items[j][0] === k).reduce((n, j) => n + a.log[j].filter(zero).length, 0);
  const past = st.sessions.reduce((n, s) => n + s.exercises.filter(x => x.key === k && !x.swap).reduce((m, x) => m + x.sets.filter(zero).length, 0), 0);
  const total = live + past, name = (EX()[k] || { n: 'this' }).n;
  if (!total) { toast(name + ' is body weight × reps now.'); return; }
  openSheet('<h2>Fix the old 0 kg sets?</h2><p class="muted">You have ' + total + (total === 1 ? ' set' : ' sets') + ' of ' + esc(name.toLowerCase()) + ' logged as 0 kg. Mark ' + (total === 1 ? 'it' : 'them') + ' as body weight?</p>' +
    '<button type="button" class="btn" data-o="yes">Yes, mark ' + (total === 1 ? 'it' : 'them') + ' as body weight</button><button type="button" class="btn ghost" data-o="no">No, leave ' + (total === 1 ? 'it' : 'them') + '</button>', ev => {
    const o = ev.target.closest('[data-o]'); if (!o) return;
    if (o.dataset.o === 'yes') {
      st.sessions.forEach(s => s.exercises.forEach(x => { if (x.key === k && !x.swap) x.sets.forEach(z => { if (zero(z)) z.a = 'bw'; }); }));
      Object.keys(a.log).forEach(j => { if (a.items[j] && a.items[j][0] === k) a.log[j].forEach(z => { if (zero(z)) z.a = 'bw'; }); });
      if (st.lifts[k] && zero(st.lifts[k])) st.lifts[k].a = 'bw';
      save(); toast('Done. They say body weight now.');
    }
    closeSheet(); prefill(); renderWk();
  });
}
// fix the order you did things in: arrows up and down
function orderSheet() {
  const a = act();
  const draw = () => '<h2>The order you did things in</h2><p class="muted" style="margin:0">Move them into the real order. Your plan stays as it is.</p>' +
    '<div class="ordlist">' + a.order.map((j, n) => '<div class="ordrow"><span class="ordnum">' + (n + 1) + '</span><span class="nm">' + esc(nameOf(j)) + '</span>' +
      '<button type="button" data-up="' + n + '" aria-label="Move ' + esc(nameOf(j)) + ' earlier"' + (n === 0 ? ' disabled' : '') + '>↑</button><button type="button" data-down="' + n + '" aria-label="Move ' + esc(nameOf(j)) + ' later"' + (n === a.order.length - 1 ? ' disabled' : '') + '>↓</button></div>').join('') + '</div>' +
    '<button type="button" class="btn" data-close>Done</button>';
  const sheet = openSheet(draw(), ev => {
    const b = ev.target.closest('[data-up],[data-down]'); if (!b || b.disabled) return;
    const n = Number(b.dataset.up != null ? b.dataset.up : b.dataset.down), m = b.dataset.up != null ? n - 1 : n + 1;
    [a.order[n], a.order[m]] = [a.order[m], a.order[n]]; save();
    sheet.querySelector('.sheet').innerHTML = draw(); renderWk();
  });
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

// "Copy this workout" right on the Session done sheet (v43): the moment you'd paste it into your other app
const copyDone = session => async ev => {
  if (!ev.target.closest('[data-copydone]')) return;
  const n = ordered().indexOf(session) + 1;
  toast((await copyText(sessionText(session, n))) ? 'Copied. Paste it anywhere.' : 'Couldn\'t copy. Find it under Your sessions on Move.');
};

// ---------- your sessions: every workout, in words you can copy into anything ----------
const ordered = () => get().sessions.slice().sort((x, y) => (x.date + x.ts).localeCompare(y.date + y.ts));
const setCount = s => s.exercises.reduce((n, x) => n + x.sets.length, 0);
const subline = s => { const c = s.exercises.length, n = setCount(s); return c + (c === 1 ? ' exercise' : ' exercises') + (n ? ' · ' + n + (n === 1 ? ' set' : ' sets') : ' · no numbers'); };
function sessionRow(s, n) {
  return '<button type="button" class="sessrow" data-sess="' + s.id + '"><span class="num">' + n + '</span><span class="tx"><b>' + esc(s.workoutName) + '</b><small>' + esc(dayDate(s.date)) + ' · ' + esc(subline(s)) + '</small></span><i aria-hidden="true">›</i></button>';
}
function sessionsList() {
  const all = ordered(); if (!all.length) return '';
  const last = all[all.length - 1];
  return '<div class="lbl">Your last workout</div><div class="sesslist">' + sessionRow(last, all.length) +
    (all.length > 1 ? '<button type="button" class="rowlink" data-allsess style="width:100%"><span>All your sessions</span><b>›</b></button>' : '') + '</div>';
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
  if (x.a === 'nn') return 'weight not noted × ' + x.b + (e && e.each ? ' each side' : '');
  if (x.a === 'bar') return 'bar only × ' + x.b + (e && e.each ? ' each side' : '');
  if (isBP(x.a)) return 'bar + ' + bpKg(x.a) + ' kg each side × ' + x.b;
  if (x.a === 'bw' || (e && e.t === 'bw')) return 'body weight × ' + x.b + (e && e.each ? ' each side' : '');
  const w = unitOf(k) === 'plate' ? 'plate ' + x.a : (Number(x.a) ? x.a + ' kg' : 'body weight');
  return w + ' × ' + x.b + (e && e.each ? ' each side' : '');
}
// the copyable text: a title, the date, then each exercise in the order you did it, sets on one line
export function sessionText(s, n) {
  const lib = EX(), c = s.exercises.length, sets = setCount(s);
  const lines = ['✦ Session ' + n + ' · ' + s.workoutName, dayDate(s.date) + (s.mins ? ' · ' + s.mins + ' min' : '') + ' · ' + c + (c === 1 ? ' exercise' : ' exercises') + (sets ? ' · ' + sets + (sets === 1 ? ' set' : ' sets') : '') + (s.light === 'yellow' ? ' · yellow day' : s.light === 'red' ? ' · gentle day' : ''), ''];
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
    '<button type="button" class="btn" data-copy>Copy</button>' +
    // change or remove it right here (v50), no trip to Days
    '<div class="actbtns"><button type="button" class="btn alt" data-fixs>Fix this workout</button><button type="button" class="btn danger" data-rms>Remove</button></div>' +
    '<button type="button" class="btn ghost" data-close>Done</button>', async ev => {
    if (ev.target.closest('[data-fixs]')) { closeSheet(); editSession(root, id, render); return; }
    const rmb = ev.target.closest('[data-rms]');
    if (rmb) { if (!rmb.dataset.armed) { rmb.dataset.armed = '1'; rmb.textContent = 'Sure? Tap again'; return; } removeEntry('sessions', id); closeSheet(); toast('Removed.'); render(); return; }
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
  openSheet('<div class="done" style="display:flex;flex-direction:column;align-items:center;gap:8px">' + him('proudstar', 'pop', 'Your character holding up a paper star, beaming') +
    '<div class="big">Session ' + n + ' done.</div>' +
    '<p class="muted">' + c + ', no numbers needed. A star just went up in your sky.</p>' +
    '<p class="muted" style="font-size:13px">' + n + ' of 100.' + (n >= 100 ? ' You made it. And it keeps going.' : '') + '</p>' +
    '<button type="button" class="btn wide" data-copydone>Copy this workout</button><button type="button" class="btn alt wide" data-close>Back to Move</button></div>', copyDone(session));
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
