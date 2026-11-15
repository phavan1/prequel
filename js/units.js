// v71: kg or lb for weights (lifts, Bar +, body weight), one setting for the whole app.
// Everything is still SAVED in kg; only what you see and type is in your unit. So switching later never mixes
// numbers up, and a backup means the same thing on any phone.
// New people pick kg or lb when they first set up Move (the guess is picked for them). People already using
// Prequel get the guess quietly, and can change it in Settings any time.
// The guess reads two settings the phone already has, on the phone: the language-and-region code (like "en-US")
// and the time zone. It says lb only when BOTH point to the US (plenty of people elsewhere leave "English (US)" on).
import { get, save } from './store.js';
import { openSheet, closeSheet, toast } from './ui.js';

export const LB = 2.20462262;
const US_TZ = /^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Adak|Boise|Detroit|Juneau|Sitka|Nome|Yakutat|Metlakatla|Menominee|Indiana\/|Kentucky\/|North_Dakota\/)|Pacific\/Honolulu$|US\/)/;
export function guessUnit() {
  try {
    const lang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    return /-US$/i.test(lang) && US_TZ.test(tz) ? 'lb' : 'kg';
  } catch (e) { return 'kg'; }
}
export const wu = () => (get().weightUnit === 'lb' || get().weightUnit === 'kg') ? get().weightUnit : guessUnit();
export function setUnit(u) { get().weightUnit = u === 'lb' ? 'lb' : 'kg'; save(); }

// a machine's pin number is a plate, not a weight
export const isPlate = k => ((get().units || {})[k] || (k === 'legpress' ? 'plate' : 'kg')) === 'plate';

// numbers: kg (as saved) <-> your unit (as shown and typed). What was shown remembers where it came from,
// so a number you didn't change goes back exactly as it was (no 12.5 kg → 27.6 lb → 12.52 kg creep).
const memo = { kg: new Map(), lb: new Map() };
const isNum = s => /^\d*\.?\d+$|^\d+\.$/.test(s);
export function showNum(kg) {
  const s = String(kg == null ? '' : kg).trim(); if (!isNum(s)) return s;
  const n = parseFloat(s), u = wu();
  const out = u === 'lb' ? String(Math.round(n * LB * 10) / 10) : String(Math.round(n * 100) / 100);
  memo[u].set(out, s); return out;
}
export function toKg(shown) {
  const s = String(shown == null ? '' : shown).trim(); if (!isNum(s)) return s;
  const u = wu(); if (memo[u].has(s)) return memo[u].get(s);
  return u === 'kg' ? s : String(Math.round(parseFloat(s) / LB * 10000) / 10000);
}
// a set's weight: a number, "b+N" (N on each side of a bar) or a word (nn, bar, bw)
export const showA = a => { const s = String(a == null ? '' : a); return s.startsWith('b+') ? 'b+' + showNum(s.slice(2)) : showNum(s); };
export const kgA = a => { const s = String(a == null ? '' : a); return s.startsWith('b+') ? 'b+' + toKg(s.slice(2)) : toKg(s); };
export const withUnit = kg => showNum(kg) + ' ' + wu();
// body weight: typed in your unit, saved in kg (to 2 places, so 150 lb stays 150 lb)
export const bodyRange = () => wu() === 'lb' ? [44, 880] : [20, 400];
export const bodyToKg = v => wu() === 'lb' ? Math.round(v / LB * 100) / 100 : Math.round(v * 10) / 10;

// ---------- "Were your earlier numbers in pounds?" ----------
// For someone already using Prequel who is now in lb: what they typed before went into kg boxes, so 50 probably
// meant 50 lb. Asked once. Yes keeps every old number as they typed it (now read as lb); No leaves them as kg.
const numericA = a => { const s = String(a == null ? '' : a); const v = s.startsWith('b+') ? s.slice(2) : s; return isNum(v) && parseFloat(v) > 0; };
function eachWeight(st, fn) {
  (st.sessions || []).forEach(s => (s.exercises || []).forEach(x => { if (!isPlate(x.key)) (x.sets || []).forEach(z => { if (numericA(z.a)) fn(z); }); }));
  const a = st.active; if (a && a.log) Object.keys(a.log).forEach(j => { const it = a.items[j]; if (it && !isPlate(it[0])) a.log[j].forEach(z => { if (numericA(z.a)) fn(z); }); });
  Object.keys(st.lifts || {}).forEach(k => { const z = st.lifts[k]; if (z && !isPlate(k) && numericA(z.a)) fn(z); });
}
export function hasOldWeights(st = get()) { let n = 0; eachWeight(st, () => n++); return n + (st.weights || []).length; }
export const needsLbAsk = () => { const st = get(); return wu() === 'lb' && !st.lbAsked && hasOldWeights(st) > 0; };
export function oldWereLb() {
  const st = get(), conv = v => String(Math.round(parseFloat(v) / LB * 10000) / 10000);
  eachWeight(st, z => { const s = String(z.a); z.a = s.startsWith('b+') ? 'b+' + conv(s.slice(2)) : conv(s); });
  (st.weights || []).forEach(w => { w.kg = Math.round(w.kg / LB * 100) / 100; });
  memo.kg.clear(); memo.lb.clear();
}
export function askLb(done) {
  if (!needsLbAsk()) return false;
  const st = get();
  openSheet('<h2>Were your earlier numbers in pounds?</h2><p class="muted">Prequel now shows weights in lb. The weights you logged before were saved as kg. If you were really typing pounds, tap Yes and they stay exactly as you typed them.</p>' +
    '<button type="button" class="btn" data-lbold="yes">Yes, they were pounds</button><button type="button" class="btn alt" data-lbold="no">No, they were kg</button>', ev => {
    const b = ev.target.closest('[data-lbold]'); if (!b) return;
    if (b.dataset.lbold === 'yes') { oldWereLb(); toast('Done. Your numbers stay as you typed them.'); }
    st.lbAsked = true; save(); closeSheet(); if (done) done();
  });
  return true;
}

// once at start-up: someone already using Prequel keeps the guessed unit for good (so a phone setting changing
// later never flips it), and anyone with no weights saved yet never needs the question above
export function settleUnits() {
  const st = get(); let ch = false;
  if (!st.weightUnit && (st.moveSetup || (st.sessions || []).length || (st.weights || []).length)) { st.weightUnit = guessUnit(); ch = true; }
  if (!st.lbAsked && !hasOldWeights(st)) { st.lbAsked = true; ch = true; }
  if (ch) save();
}

// ---------- v115: km or miles for distances ----------
// Same idea as kg / lb: everything is still SAVED in km (and a hike's climb in metres); only what you see and type is
// in your unit. Miles also turns a climb into feet. Swimming pools stay in metres (25 m and 50 m are how pools come).
// The guess is miles only where the weight guess is lb (the US). Someone who logged distances before this keeps km.
export const MI = 0.621371192, FT = 3.2808399;
const DIST = { dist: ['km', 'mi', MI, 100], climb: ['m', 'ft', FT, 1] }; // saved unit, the other unit, per saved unit, rounding
export const du = () => (get().distUnit === 'mi' || get().distUnit === 'km') ? get().distUnit : (guessUnit() === 'lb' ? 'mi' : 'km');
export function setDistUnit(u) {
  const st = get(), to = u === 'mi' ? 'mi' : 'km', from = du(); st.distUnit = to;
  // a milestone counting distance or climb was set in what you saw, so it follows: 100 km becomes 62.1 mi (and back to exactly 100)
  if (from !== to) (st.goals || []).forEach(g => { const m = g.kind === 'linked' && /^act:[^:]+:(dist|climb)$/.exec(g.source || ''); if (!m) return;
    const f = DIST[m[1]][2];
    if (to === 'mi') { g.metricTarget = g.target; g.target = Math.round(g.target * f * 10) / 10; }
    else { g.target = g.metricTarget != null ? g.metricTarget : Math.round(g.target / f * 10) / 10; delete g.metricTarget; } });
  save();
}
export const isDist = k => !!DIST[k];
export const distLabel = (k, fallback) => DIST[k] ? DIST[k][du() === 'mi' ? 1 : 0] : fallback;
const dmemo = new Map();
// a saved number (km or m) as you see it
export function distShow(k, saved) {
  if (!DIST[k] || saved == null || saved === '' || isNaN(Number(saved))) return saved;
  if (du() === 'km') return String(Math.round(Number(saved) * DIST[k][3]) / DIST[k][3]);
  const out = String(Math.round(Number(saved) * DIST[k][2] * DIST[k][3]) / DIST[k][3]); dmemo.set(k + '|' + out, Number(saved)); return out;
}
// what you typed (in your unit) as it's saved; a number you didn't change goes back exactly as it was
export function distSave(k, n) {
  if (!DIST[k] || du() === 'km') return Math.round(n * 100) / 100;
  const back = dmemo.get(k + '|' + String(n)); if (back != null) return back;
  return Math.round(n / DIST[k][2] * 1000) / 1000;
}
// a total, rounded for reading
export const distNum = (k, saved) => DIST[k] && du() === 'mi' ? Math.round(saved * DIST[k][2] * 10) / 10 : Math.round(saved * 10) / 10;
// the Slow ride's metres as km or mi, one decimal
export const rideDist = m => (du() === 'mi' ? (m / 1000 * MI) : m / 1000).toFixed(1) + ' ' + du();
// once at start-up: anyone who already logged a distance (or a distance milestone) keeps km, whatever the guess
export function settleDist() {
  const st = get(); if (st.distUnit) return;
  const has = (st.activities || []).some(a => a.f && (a.f.dist || a.f.climb)) || (st.goals || []).some(g => /^act:[^:]+:(dist|climb)$/.test(g.source || '')) || ((st.games || {}).road || {}).m > 0;
  if (has) { st.distUnit = 'km'; save(); }
}
