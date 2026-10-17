// Cycle (v46): an optional, private period tracker. Switched on from Days → ＋ → More tabs; nobody is asked anything.
// It lives only in Days and the backup: no stars in the sky, nothing on share cards.
// Data: st.cycleDays = [{id, date, period:1|0, flow:0-3, feels:[]}], one per day that has anything on it.
import { get, save, uid, parseKey, addDays } from './store.js';

// flow as droplets, never the word "heavy"
export const FLOW = [[1, 'Light'], [2, 'Medium'], [3, 'A lot']];
export const CYCLE_FEELS = ['Cramps', 'Headache', 'Tired', 'Low mood', 'Bloated', 'Tender'];

export const cycleOn = () => (get().settings.dayTabs || []).includes('cycle');
export const cycleDay = d => (get().cycleDays || []).find(x => x.date === d) || null;

// change one day; a day with nothing left on it is removed
export function setCycleDay(d, fn) {
  const st = get(); st.cycleDays = st.cycleDays || [];
  let x = cycleDay(d);
  if (!x) { x = { id: uid(), date: d, period: 0, flow: 0, feels: [] }; st.cycleDays.push(x); }
  fn(x);
  if (!x.period) x.flow = 0;
  if (!x.period && !x.feels.length) st.cycleDays = st.cycleDays.filter(y => y !== x);
  save();
}

const gap = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
// the first day of each period: a period day with no period day in the 2 days before it
export function starts() {
  const days = (get().cycleDays || []).filter(x => x.period).map(x => x.date).sort();
  return days.filter((d, i) => i === 0 || gap(days[i - 1], d) > 2);
}

// a gentle estimate once there are two starts: the middle of the gaps between them (odd ones under 15 or over 60 days are left out)
export function estimate() {
  const s = starts(); if (s.length < 2) return null;
  const gaps = s.slice(1).map((d, i) => gap(s[i], d)).filter(g => g >= 15 && g <= 60).sort((a, b) => a - b);
  if (!gaps.length) return null;
  const len = gaps[Math.floor(gaps.length / 2)];
  return { len, next: addDays(s[s.length - 1], len), last: s[s.length - 1] };
}

// which day of the cycle a date is (day 1 = the day a period started), only up to 60 days in
export function cycleDayNumber(d) {
  const s = starts().filter(x => x <= d).pop(); if (!s) return null;
  const n = gap(s, d) + 1; return n <= 60 ? n : null;
}
