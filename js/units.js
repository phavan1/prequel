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
