// v121: "Today, try…". For each exercise, a suggested weight × reps for every set, from your own history.
//
// Layer 1, your playbook's rule (double progression): add reps until every set reaches the top of the range, then go
//   one step heavier and start again at the bottom. Within a session the weight stays; the jump waits for next time.
// Layer 2, what it learns from you:
//   • your strength per session as one number (estimated one-rep max, Epley: weight × (1 + reps / 30)), to notice a
//     dip or a long break and ease you back in instead of pushing on;
//   • your step size on each exercise (the smallest jump you've actually made), so 8 kg goes to 10 kg if that's how
//     you go up, or one pin on a machine;
//   • your usual drop from one set to the next (tiredness), so set 3 aims for what's realistic for you.
// It listens to today too: on a Yellow day it holds steady, on a Red day it goes a step lighter.
// Everything here is plain arithmetic on your own logs: no network, nothing stored beyond your workouts.
//
// Numbers in and out are in what you see (kg or lb; a machine's pin; kg each side for Bar +); move.js converts.

export const e1rm = (w, r) => w * (1 + r / 30);
const r2 = v => Math.round(v * 100) / 100;
export function range(txt) { const m = /(\d+)\s*-\s*(\d+)/.exec(String(txt || '')); return m ? [Number(m[1]), Number(m[2])] : null; }

// hist: oldest → newest, [{ date, sets: [{ w, r }] }] (w is null for body weight)
// the smallest jump you've made between sessions' first sets; else a sensible start
export function learnedStep(hist, fallback) {
  let best = null;
  for (let i = 1; i < hist.length; i++) {
    const a = hist[i - 1].sets[0], b = hist[i].sets[0]; if (!a || !b || a.w == null || b.w == null) continue;
    const d = r2(Math.abs(b.w - a.w)); if (d >= 0.25 && (best == null || d < best)) best = d;
  }
  return best || fallback;
}
// your usual drop in reps from one set to the next, when the weight stayed the same (0 to 3)
export function learnedDrop(hist) {
  const ds = [];
  hist.slice(-8).forEach(s => { for (let j = 1; j < s.sets.length; j++) { const a = s.sets[j - 1], b = s.sets[j]; if (a.w === b.w && a.r > 0 && b.r > 0) ds.push(a.r - b.r); } });
  if (!ds.length) return 1;
  const avg = ds.reduce((x, y) => x + y, 0) / ds.length;
  return Math.max(0, Math.min(3, Math.round(avg)));
}
const best = s => Math.max(...s.sets.map(x => x.w == null ? x.r : e1rm(x.w, x.r)));
const days = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);

// the first set's suggestion: { w, r, why, base } (base: last time's first set, for keeping a number exact)
export function plan({ hist, rng, step, light, date, bw }) {
  if (!hist || hist.length < 2) return null; // fewer than two times: "Last time" is enough
  const last = hist[hist.length - 1], first = last.sets[0]; if (!first || !(first.r > 0)) return null;
  const [lo, hi] = rng || [first.r, first.r + 2];
  const gap = date ? days(last.date, date) : 0;
  const keep = why => ({ w: first.w, r: first.r, why, base: first });
  // today first
  if (light === 'red') return bw ? { w: null, r: Math.max(1, first.r - 2), why: 'Red day: a few less', base: first }
    : { w: Math.max(0, r2(first.w - step)), r: Math.max(lo, Math.min(first.r, hi)), why: 'Red day: a step lighter', base: first };
  if (light === 'yellow') return keep('Yellow day: same as last time');
  // a long break: ease back in
  if (gap >= 42) return bw ? { w: null, r: Math.max(1, first.r - 2), why: 'It\'s been a while: ease back in', base: first }
    : { w: Math.max(0, r2(first.w - step)), r: lo, why: 'It\'s been ' + Math.floor(gap / 7) + ' weeks: a step lighter to start', base: first };
  if (gap >= 21) return keep('It\'s been ' + Math.floor(gap / 7) + ' weeks: same as last time to start');
  // a dip last time (under 93% of your recent best): same again before pushing on
  const prev = hist.slice(-4, -1).map(best);
  if (prev.length && best(last) < 0.93 * Math.max(...prev)) return keep('Last time was a lighter one: same again');
  // the playbook's rule
  if (last.sets.every(x => x.r >= hi) && !bw) return { w: r2(first.w + step), r: lo, why: 'Top of the range last time: a step heavier', base: first, up: true };
  if (first.r >= hi) return bw ? { w: null, r: first.r + 1, why: 'One more rep than last time', base: first } : { w: first.w, r: hi, why: 'Every set to ' + hi + ', then heavier', base: first };
  return { w: first.w, r: first.r + 1, why: 'One more rep than last time', base: first };
}

// the next set's suggestion, from how this session is going: { w, r, why, nextW } (nextW: a strong set at the top of
// the range means next time can go a step heavier)
// The weight stays (whatever you used on the last set); the reps follow your usual drop.
export function nextSet({ target, prev, drop, rng, step, bw }) {
  if (!prev || !(Number(prev.r) > 0)) return null;
  const hi = rng ? rng[1] : null, t = target ? target.r : prev.r, pr = Number(prev.r), w = prev.w;
  let r, why, nextW = null;
  if (pr >= t + 2) { r = Math.max(t, pr - drop); why = 'Strong set: keep it going'; }
  else if (pr < t - 1) { r = pr; why = '× ' + pr + ' is fine today'; }
  else { r = Math.max(1, pr - drop); why = drop ? 'Your usual drop on the next set' : 'Same again'; }
  if (hi && pr >= hi && !bw && w != null && step) nextW = r2(w + step);
  return { w, r: Math.max(1, r), why, nextW };
}
