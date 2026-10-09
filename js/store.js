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
    rests: [],        // {id, date, start, end, feel}   date = the day you woke up
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
function idbGet() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly'); const r = tx.objectStore(STORE).get(KEY);
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
}
function idbPut(value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}

export async function load() {
  let saved = null;
  try { db = await openDB(); saved = await idbGet(); } catch (e) { db = null; }
  if (!saved) { try { const raw = localStorage.getItem('prequel-state'); if (raw) saved = JSON.parse(raw); } catch (e) { /* private mode */ } }
  state = Object.assign(fresh(), saved || {});
  state.settings = Object.assign(fresh().settings, state.settings || {});
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
export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || !Array.isArray(data.moments)) throw new Error('That file doesn\'t look like a backup from this app.');
  delete data.exported;
  state = Object.assign(fresh(), data);
  state.settings = Object.assign(fresh().settings, data.settings || {});
  save();
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
