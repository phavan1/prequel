// v122: the readiness suggestion. On Move, a card above Green / Yellow / Red: "Looks like a Green day" or "Maybe a
// Yellow day", with the reasons. It only ever suggests Green or Yellow (Red is unwell or in pain: only you know that),
// and it never changes your choice; "Make it Yellow" is one tap.
//
// How it works: a small logistic regression, kept with your data (st.readyModel) and in your backups.
//   chance of a tough session = σ(b + Σ wᵢ·xᵢ), Yellow at 50% or more
// using five things Prequel already knows, each turned into a number around −1…1 (missing ones are left out, never
// counted as zero):
//   sleep  last 24 hours (naps count) against your usual night   (less → tougher)
//   wake   how you last woke up (groggy, okay, rested)             (groggy → tougher)
//   load   days you moved in the last 4, against your usual        (more → tougher)
//   rest   a rest day since you last trained                       (rested → easier)
//   soft   yesterday was a soft day                                (→ tougher)
// v123: what it predicts, exactly: "Will today's normal (Green) session feel unusually hard?"
// It starts from sensible weights and learns (one small step of gradient descent) only from sessions that test that:
//   • trained on Green, and it had at least one real signal at the start (an informed prediction);
//   • the label comes from you first ("How did it feel compared to usual?" on Session done: Harder = hard, Usual or
//     Easier = not), else from your lifts against "Today, try…" (well under plan, or stopping well short = hard; at or
//     above plan = not); anything in between teaches nothing.
// Yellow and Red sessions are recorded but never trained on: the plan was changed, so whether Green would have been
// too much can't be known. Your light choice is context, never an outcome. It only learns from the factors it had.
// Every session is kept in a small private record (st.readyLog) with the model version and what the untrained starting
// model would have said, so we can check later whether learning actually helps. Settings → More → "Forget what Move
// learned" clears the model and the record.
import { get, save, today, addDays, dateKey } from './store.js';
import { feelFamily, feelLabel } from './data.js';

const START = { b: -0.9, w: { sleep: -1.3, wake: -1.0, load: 0.8, rest: -0.6, soft: 0.9 } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sig = z => 1 / (1 + Math.exp(-z));
export function model() { const st = get(); const m = st.readyModel; return m && m.v === 1 && m.w ? m : { v: 1, b: START.b, w: Object.assign({}, START.w), n: 0 }; }
export const hasLearned = () => { const m = get().readyModel; return !!(m && m.n > 0); };
export function forget() { const st = get(); delete st.readyModel; delete st.readyLog; save(); }
export const MODEL_V = 2; // v122 was 1 (learned from your light choice); v123 learns only from Green sessions
const hrs = h => { const r = Math.round(h * 2) / 2; return (r % 1 ? Math.floor(r) + '½' : String(r)) + ' hrs'; };
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// what it knows right now: { x: { sleep, wake, load, rest, soft } (only the ones it has), say: words for each }
export function features(now = Date.now()) {
  const st = get(), d = dateKey(new Date(now)), x = {}, say = {};
  // sleep: the last 24 hours against your usual (the middle of your last 28 logged days; 7 hours until there are 5)
  const rests = st.rests || [], since = now - 24 * 3600000;
  const recent = rests.filter(r => r.end > since && r.end <= now);
  if (recent.length) {
    const h = recent.reduce((n, r) => n + (r.end - Math.max(r.start, since)), 0) / 3600000;
    const byDay = {}; rests.filter(r => r.end < since && r.end > now - 29 * 864e5).forEach(r => { const k = dateKey(new Date(r.end)); byDay[k] = (byDay[k] || 0) + (r.end - r.start) / 3600000; });
    const days = Object.values(byDay).sort((a, b) => a - b), usual = days.length >= 5 ? days[days.length >> 1] : 7;
    x.sleep = clamp((h - usual) / 2, -2, 1);
    say.sleep = h < usual - 0.75 ? ['Shorter night than usual (' + hrs(h) + (days.length >= 5 ? ', you usually get ' + hrs(usual).replace(' hrs', '') : '') + ')', 1] : h >= usual - 0.25 ? ['Good sleep (' + hrs(h) + ')', -1] : ['About your usual sleep (' + hrs(h) + ')', 0];
    const last = recent.reduce((a, b) => b.end > a.end ? b : a);
    if (last.feel) { const f = feelFamily(last.feel); x.wake = f === 'groggy' ? -1 : f === 'rested' ? 0.5 : last.feel === 'tired' ? -0.5 : 0;
      say.wake = [f === 'groggy' || last.feel === 'tired' ? 'You woke up ' + feelLabel(last.feel).toLowerCase() : f === 'rested' ? 'Woke up ' + feelLabel(last.feel).toLowerCase() : 'Woke up okay', x.wake < 0 ? 1 : x.wake > 0 ? -1 : 0]; }
  }
  // training: days you moved (gym or any activity), before today
  const moved = new Set((st.sessions || []).map(s => s.date).concat((st.activities || []).map(a => a.date)).filter(k => k < d));
  if (moved.size) {
    const last4 = [1, 2, 3, 4].filter(i => moved.has(addDays(d, -i))).length;
    const span = [...moved].filter(k => k >= addDays(d, -42)), weeks = Math.min(6, Math.max(1, Math.round((Date.parse(d) - Date.parse([...moved].sort()[0])) / 6048e5)));
    const usual4 = moved.size >= 4 ? clamp(span.length / weeks * 4 / 7, 0.5, 4) : 2;
    x.load = clamp((last4 - usual4) / 2, -1, 1.5);
    if (last4 >= 3 || last4 - usual4 >= 1) say.load = [last4 + ' sessions in the last 4 days', 1];
    const lastDay = [...moved].sort().pop(), gap = Math.round((Date.parse(d) - Date.parse(lastDay)) / 864e5);
    x.rest = gap >= 2 && gap <= 5 ? 1 : gap === 1 ? -0.5 : 0;
    say.rest = gap >= 2 && gap <= 5 ? ['Rested since ' + WD[new Date(lastDay + 'T12:00:00').getDay()], -1] : gap === 1 ? ['You moved yesterday', 1] : null;
  }
  // a soft day yesterday (only counted when it was one; not knowing isn't a reason)
  if ((st.heavy || {})[addDays(d, -1)]) { x.soft = 1; say.soft = ['Yesterday was a soft day', 1]; }
  return { x, say };
}

// the suggestion: null (nothing to go on) or { light: 'green' | 'yellow', chance, reasons: [..], partial }
export function suggest(now = Date.now()) {
  const { x, say } = features(now), keys = Object.keys(x); if (!keys.length) return null;
  const m = model(); let z = m.b; keys.forEach(k => { z += (m.w[k] || 0) * x[k]; });
  const p = sig(z), light = p >= 0.5 ? 'yellow' : 'green', dir = light === 'yellow' ? 1 : -1;
  // the reasons: what pushed hardest the way it went, in words
  const reasons = keys.map(k => ({ k, c: (m.w[k] || 0) * x[k] * dir, s: say[k] })).filter(r => r.s && r.s[1] === dir && r.c > 0.05).sort((a, b) => b.c - a.c).slice(0, 2).map(r => r.s[0]);
  if (!reasons.length) return null; // nothing worth saying: the card stays away
  return { light, chance: p, reasons, x, partial: !('sleep' in x) && !('wake' in x) };
}

// what it knew when a session started, to learn from later: { x, p } (null with nothing to go on)
export function snapshot(now = Date.now()) {
  const { x } = features(now), keys = Object.keys(x); if (!keys.length) return null;
  const m = model(); let z = m.b; keys.forEach(k => { z += (m.w[k] || 0) * x[k]; });
  return { x, p: sig(z) };
}
// after a gym session: learn from how it went. snap: { x, p } saved when the session started; outcome: 1 tough, 0 fine
export function learn(snap, outcome) {
  if (!snap || !snap.x || outcome == null || !Object.keys(snap.x).length) return;
  const st = get(), m = model(), err = outcome - snap.p, lr = 0.3;
  m.b = clamp(m.b + lr * err * 0.5, -3, 3);
  Object.keys(snap.x).forEach(k => { m.w[k] = clamp((m.w[k] || 0) + lr * err * snap.x[k], -3, 3); });
  m.n = (m.n || 0) + 1; st.readyModel = m;
}
// what a session says, for the one target (an unusually hard Green session): 1 hard, 0 not, null unclear
//   feel: your answer ('easier' | 'usual' | 'harder'), ratio: lifts against "Today, try…", early: stopped well short
export function outcome({ feel, ratio, early }) {
  if (feel) return feel === 'harder' ? 1 : 0;           // your answer comes first
  if (early || (ratio != null && ratio < 0.95)) return 1;
  if (ratio != null && ratio >= 0.98) return 0;
  return null;
}
const p0 = x => { let z = START.b; Object.keys(x).forEach(k => { z += (START.w[k] || 0) * x[k]; }); return sig(z); };
// the private record: one line per gym session, written at Finish, settled once (when the Session done sheet closes)
export function record(id, a, ratio, early) {
  const st = get(), L = st.readyLog || (st.readyLog = []), snap = a.ready || null;
  L.push({ id, date: a.date, v: MODEL_V, informed: !!(snap && snap.x && Object.keys(snap.x).length), p: snap ? Math.round(snap.p * 1000) / 1000 : null,
    p0: snap && snap.x ? Math.round(p0(snap.x) * 1000) / 1000 : null, x: snap ? snap.x : null, light: a.light, adjusted: a.light !== 'green',
    ratio: ratio == null ? null : Math.round(ratio * 1000) / 1000, early: !!early, feel: null, label: null, from: null, trained: false, settled: false });
  if (L.length > 300) L.splice(0, L.length - 300);
}
export function setFeel(id, feel) { const e = (get().readyLog || []).find(x => x.id === id); if (e && !e.settled) { e.feel = feel; save(); } }
// settle one session: decide its label and, only for an informed Green session, learn from it. Exactly once.
export function settle(id) {
  const st = get(), e = (st.readyLog || []).find(x => x.id === id); if (!e || e.settled) return;
  e.label = outcome({ feel: e.feel, ratio: e.ratio, early: e.early }); e.from = e.feel ? 'feel' : e.label != null ? 'lifts' : null;
  if (e.light === 'green' && e.informed && e.label != null) { learn({ x: e.x, p: e.p }, e.label); e.trained = true; }
  e.settled = true; save();
}
// anything left unsettled (the app was closed before the sheet was), except the one still on screen
export function settlePending(except) { (get().readyLog || []).filter(e => !e.settled && e.id !== except).forEach(e => settle(e.id)); }
