// Everything you log lives here, on your phone only (IndexedDB), with a JSON backup you can export/import.
const DB_NAME = 'prequel', STORE = 'kv', KEY = 'state';
let state = null;
let db = null;
const listeners = new Set();

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

export function dateKey(d = new Date()) {
  const x = new Date(d);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}
export function today() { return dateKey(new Date()); }
export function addDays(key, n) { const [y, m, d] = key.split('-').map(Number); return dateKey(new Date(y, m - 1, d + n)); }
export function parseKey(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }

export const DEFAULT_TINY_WINS = ['Got out of bed', 'Drank water', 'Ate something', 'Showered', 'Opened the curtains', 'Stepped outside', 'Brushed teeth', 'Did one small tidy', 'Did something just for joy'];
export const DEFAULT_KIND_LINES = [
  'Hey, you. Glad you\'re here.',
  'Whatever today is, you don\'t have to carry it perfectly.',
  'Slow is still moving.',
  'You showed up. That counts.',
  'Be gentle with yourself today. I\'ll be gentle with you too.',
  'Small things add up. Look at your sky.',
  'Rest is part of the plan, not a break from it.',
  'You\'ve done hard things before.'
];
export const DEFAULT_COMFORT = [
  { id: 'c1', name: 'Chicken + dosas', time: '15 min' },
  { id: 'c2', name: 'Eggs in a tortilla', time: '8 min' },
  { id: 'c3', name: 'Banana + orange', time: '1 min' }
];

function fresh() {
  return {
    v: 1,
    created: Date.now(),
    moments: [],      // {id, date, ts, area, text, bright}
    weather: [],      // {id, date, ts, types:[name], strength}
    sessions: [],     // {id, date, ts, workoutId, workoutName, light, exercises:[{key, name, swap, sets:[{a,b}]}]}
    rests: [],        // {id, date, start, end, feel, words?}   date = the day you woke up
    doctorNotes: [],  // {id, date, ts, text}  notes for your doctor (v45), in the sleep diary
    activities: [],   // {id, date, ts, type, mins?, feel?, hl?, note?, f:{}}  Move's other activities (v48)
    cycleDays: [],    // {id, date, period, flow, feels:[]}  the optional Cycle tab (v46), private
    pendingSleep: null,
    mind: [],         // {id, text, remindOn, created, letGo}
    letters: [],      // {id, text, ts, weather, opened}
    foods: [],        // {id, date, ts, tags:[], note}
    heavy: {},        // date -> true
    comfort: DEFAULT_COMFORT.slice(),
    lifts: {},        // exercise key -> {a, b}
    units: {},        // exercise key -> 'kg' | 'plate'
    customExercises: {},
    customWorkouts: [],
    myFoods: [],      // {id, name, from, n:[12] per portion, per100?, unit, unitG, measures?, kind, uses}
    meals: [],        // {id, date, ts, name, foodId, n, unit, unitG, qty, sure, kind}
    weights: [],      // {id, date, ts, kg, where}
    goals: [],        // {id, kind:'linked'|'own', source, name, target, from, created, finished}
    goalLogs: [],     // {id, goalId, date, ts}  your own goals, logged by you
    workoutAdds: {},  // workout id -> [[key, sets, range]] kept additions
    subsAdded: {},    // exercise key -> [names]
    settings: { name: '', tinyWins: DEFAULT_TINY_WINS.slice(), kindLines: DEFAULT_KIND_LINES.slice() }
  };
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('no indexedDB')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function idbGet(key = KEY) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly'); const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
}
function idbPut(value, key = KEY) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}

export async function load() {
  let saved = null;
  try { db = await openDB(); saved = await idbGet(); } catch (e) { db = null; }
  if (!saved) { try { const raw = localStorage.getItem('prequel-state'); if (raw) saved = JSON.parse(raw); } catch (e) { /* private mode */ } }
  state = Object.assign(fresh(), saved || {});
  state.settings = Object.assign(fresh().settings, state.settings || {});
  await loadUndo();
  // ask the browser to keep this data even when the phone is low on space
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* not supported */ }
  return state;
}

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const snapshot = JSON.parse(JSON.stringify(state));
    try { if (db) await idbPut(snapshot); else localStorage.setItem('prequel-state', JSON.stringify(snapshot)); }
    catch (e) { try { localStorage.setItem('prequel-state', JSON.stringify(snapshot)); } catch (e2) { /* nothing more we can do */ } }
  }, 150);
  listeners.forEach(fn => fn(state));
}
// write straight away (after a restore or an undo, so closing the app that instant loses nothing)
export async function saveNow() {
  clearTimeout(saveTimer);
  const snapshot = JSON.parse(JSON.stringify(state));
  try { if (db) await idbPut(snapshot); else localStorage.setItem('prequel-state', JSON.stringify(snapshot)); }
  catch (e) { try { localStorage.setItem('prequel-state', JSON.stringify(snapshot)); } catch (e2) { /* nothing more we can do */ } }
  listeners.forEach(fn => fn(state));
}
export function get() { return state; }
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ---------- logging helpers ----------
export function addMoment(area, text, date, extra = {}) {
  const m = Object.assign({ id: uid(), date: date || today(), ts: Date.now(), area, text, bright: 0 }, extra);
  state.moments.push(m); save(); return m;
}
export function removeById(listName, id) {
  state[listName] = state[listName].filter(x => x.id !== id);
  if (listName !== 'moments') state.moments = state.moments.filter(m => m.ref !== id);
  save();
}

// ---------- backup ----------
export function exportJSON() { return JSON.stringify(Object.assign({ exported: new Date().toISOString() }, state), null, 1); }

// Checking a backup before it's used. Missing parts are fine (older backups don't have newer fields, and get them
// filled in). A part that's there but the wrong shape means the whole file is refused: no half-restores.
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const RECORDS = ['moments', 'weather', 'sessions', 'rests', 'doctorNotes', 'cycleDays', 'activities', 'mind', 'letters', 'foods', 'comfort', 'customWorkouts', 'myFoods', 'meals', 'weights', 'goals', 'goalLogs'];
const DATED = ['moments', 'weather', 'sessions', 'rests', 'doctorNotes', 'cycleDays', 'activities', 'foods', 'meals', 'weights', 'goalLogs'];
const MAPS = ['heavy', 'lifts', 'units', 'customExercises', 'workoutAdds', 'subsAdded', 'settings', 'sky', 'games'];
export const BACKUP_PROBLEMS = {
  unreadable: 'That file couldn\'t be read, so Prequel can\'t use it. Nothing was changed.',
  notours: 'That doesn\'t look like a Prequel backup. Nothing was changed.',
  damaged: 'This backup looks damaged in places, so Prequel didn\'t use it. Your app is exactly as it was.'
};
export function checkBackup(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { return { problem: 'unreadable' }; }
  if (!isObj(d) || !Array.isArray(d.moments)) return { problem: 'notours' };
  const bad = where => ({ problem: 'damaged', where });
  for (const k of RECORDS) if (k in d && !(Array.isArray(d[k]) && d[k].every(isObj))) return bad(k);
  for (const k of DATED) if (Array.isArray(d[k]) && !d[k].every(x => typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date))) return bad(k);
  for (const k of MAPS) if (k in d && !isObj(d[k])) return bad(k);
  if ('quiltSeen' in d && !Array.isArray(d.quiltSeen)) return bad('quiltSeen');
  if ('active' in d && d.active !== null && !isObj(d.active)) return bad('active');
  if ('pendingSleep' in d && d.pendingSleep !== null && typeof d.pendingSleep !== 'number') return bad('pendingSleep');
  if (Array.isArray(d.sessions) && !d.sessions.every(s => !('exercises' in s) || (Array.isArray(s.exercises) && s.exercises.every(x => isObj(x) && (!('sets' in x) || Array.isArray(x.sets)))))) return bad('sessions');
  if (isObj(d.settings) && ['tinyWins', 'kindLines', 'dayTabs'].some(k => k in d.settings && !Array.isArray(d.settings[k]))) return bad('settings');
  return { data: d };
}
// does this hold anything you logged? (a brand-new app doesn't, so there's nothing to keep a copy of)
export function hasData(s = state) { return RECORDS.some(k => k !== 'comfort' && Array.isArray(s[k]) && s[k].length); }

// A safety copy: before a restore replaces everything, the app's data from just before is kept on this phone
// for 7 days (outside the main data, so it's never inside a backup), and Settings offers to put it back.
const UNDO_KEY = 'undo', UNDO_DAYS = 7;
let undoAt = null;
async function readUndo() {
  if (db) return idbGet(UNDO_KEY);
  const raw = localStorage.getItem('prequel-undo'); return raw ? JSON.parse(raw) : null;
}
async function writeUndo(v) {
  if (db) return v ? idbPut(v, UNDO_KEY) : idbPut(null, UNDO_KEY);
  if (v) localStorage.setItem('prequel-undo', JSON.stringify(v)); else localStorage.removeItem('prequel-undo');
}
async function loadUndo() {
  try {
    const u = await readUndo();
    if (u && u.at && Date.now() - u.at < UNDO_DAYS * 864e5) undoAt = u.at;
    else { undoAt = null; if (u) await writeUndo(null); }
  } catch (e) { undoAt = null; }
}
export function undoInfo() { return undoAt && Date.now() - undoAt < UNDO_DAYS * 864e5 ? { at: undoAt, until: undoAt + UNDO_DAYS * 864e5 } : null; }

// replace everything with a checked backup. Keeps the safety copy first; if it can't, says so ('nocopy')
// unless told to go ahead anyway.
export async function restoreBackup(data, { withoutCopy = false } = {}) {
  if (hasData()) {
    const at = Date.now();
    try { await writeUndo({ at, state: JSON.parse(JSON.stringify(state)) }); undoAt = at; }
    catch (e) { if (!withoutCopy) return 'nocopy'; }
  }
  const d = JSON.parse(JSON.stringify(data)); delete d.exported;
  const seen = state.newsSeen; // which updates this phone has shown belongs to the app here, not to the backup
  state = Object.assign(fresh(), d);
  state.settings = Object.assign(fresh().settings, d.settings || {});
  if (seen != null) state.newsSeen = seen;
  await saveNow();
  return 'ok';
}
// put back the data from before the last restore
export async function undoRestore() {
  let u = null; try { u = await readUndo(); } catch (e) { /* unreadable */ }
  if (!u || !u.state) { undoAt = null; return false; }
  const seen = state.newsSeen;
  state = Object.assign(fresh(), u.state);
  state.settings = Object.assign(fresh().settings, u.state.settings || {});
  if (seen != null) state.newsSeen = seen;
  await saveNow();
  try { await writeUndo(null); } catch (e) { /* it expires anyway */ }
  undoAt = null; return true;
}
// kept for anything that still restores from plain text in one step
export async function importJSON(text) {
  const r = checkBackup(text);
  if (r.problem) throw new Error(BACKUP_PROBLEMS[r.problem]);
  return restoreBackup(r.data, { withoutCopy: true });
}
// start fresh: everything back to how it was on day one
export function reset() { state = fresh(); save(); }
// a gentle nudge to save a backup roughly once a month, once there's something worth keeping
export function backupDue() {
  if (!state || state.moments.length < 5) return false;
  const since = state.lastBackup || state.created || Date.now();
  return Date.now() - since > 30 * 864e5;
}
export async function isPersisted() { try { return navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false; } catch (e) { return false; } }
