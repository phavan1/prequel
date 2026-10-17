// Move, for every kind of moving (v48). The gym is one activity among many; each sport logs a few things of its own.
// Effort, never results: no wins or losses. Everything except the activity itself is optional.
// Data: st.activities = [{id, date, ts, type, mins?, feel?, note?, hl?, f:{field: value}}]
//       st.moveSetup = {picked:[ids], custom:{id:{n, e, unit}}} (missing = not chosen yet: Move asks once)
//       st.actTimer = {type, start, date} while a "Start now" timer runs
import { get, save, uid, addMoment } from './store.js';

const km = { k: 'dist', l: 'Distance', u: 'km', num: 1 };
// field kinds: num (a number, with its unit), seg (pick one), text (in your own words)
export const CATALOG = [
  { id: 'gym', n: 'Gym', e: '🏋️', gym: 1 },
  { id: 'walk', n: 'Walk', e: '🚶', unit: 'walks', f: [km, { k: 'steps', l: 'Steps', u: 'steps', num: 1 }, { k: 'where', l: 'Where', seg: ['Outdoors', 'Treadmill'] }] },
  { id: 'run', n: 'Run', e: '🏃', unit: 'runs', f: [km, { k: 'where', l: 'Where', seg: ['Outdoors', 'Treadmill'] }], pace: 1 },
  { id: 'cycle', n: 'Cycling', e: '🚴', unit: 'rides', f: [km, { k: 'where', l: 'Where', seg: ['Outdoors', 'Indoor bike'] }] },
  { id: 'swim', n: 'Swimming', e: '🏊', unit: 'swims', f: [{ k: 'laps', l: 'Laps', u: 'laps', num: 1 }, { k: 'pool', l: 'Pool length', seg: ['25 m', '50 m'] }, { k: 'stroke', l: 'Stroke', seg: ['Freestyle', 'Breaststroke', 'Backstroke', 'Butterfly', 'Mixed'] }] },
  { id: 'badminton', n: 'Badminton', e: '🏸', unit: 'times', f: [{ k: 'kind', l: 'Played', seg: ['Singles', 'Doubles'] }, { k: 'games', l: 'Games played', u: 'games', num: 1 }] },
  { id: 'football', n: 'Football', e: '⚽', unit: 'times', f: [{ k: 'kind', l: 'What kind', seg: ['Match', 'Training', 'Kickabout'] }, { k: 'goals', l: 'Goals', u: 'goals', num: 1 }, { k: 'assists', l: 'Assists', u: 'assists', num: 1 }] },
  { id: 'cricket', n: 'Cricket', e: '🏏', unit: 'times', f: [{ k: 'kind', l: 'What kind', seg: ['Match', 'Nets'] }, { k: 'runs', l: 'Runs scored', u: 'runs', num: 1 }, { k: 'wickets', l: 'Wickets taken', u: 'wickets', num: 1 }] },
  { id: 'tennis', n: 'Tennis', e: '🎾', unit: 'times', f: [{ k: 'kind', l: 'Played', seg: ['Singles', 'Doubles'] }, { k: 'sets', l: 'Sets played', u: 'sets', num: 1 }] },
  { id: 'kickboxing', n: 'Kickboxing', e: '🥊', unit: 'times', f: [{ k: 'kind', l: 'What kind', seg: ['Pads', 'Bag work', 'Sparring', 'Class'] }, { k: 'rounds', l: 'Rounds', u: 'rounds', num: 1 }, { k: 'roundlen', l: 'Round length', seg: ['1 min', '2 min', '3 min'] }, { k: 'focus', l: 'Worked on', text: 'combos, kicks, footwork…' }] },
  { id: 'mma', n: 'MMA', e: '🥋', unit: 'times', f: [{ k: 'kind', l: 'What kind', seg: ['Striking', 'Grappling', 'Wrestling', 'Sparring', 'Class'] }, { k: 'rounds', l: 'Rounds', u: 'rounds', num: 1 }, { k: 'focus', l: 'Worked on', text: 'takedowns, guard, combos…' }] },
  { id: 'yoga', n: 'Yoga or stretching', e: '🧘', unit: 'times', f: [{ k: 'style', l: 'Style', seg: ['Gentle', 'Flow', 'Strong'] }, { k: 'focus', l: 'Focused on', text: 'back, hips, whole body…' }] },
  { id: 'dance', n: 'Dance', e: '💃', unit: 'times', f: [{ k: 'style', l: 'Style', text: 'in your own words' }] },
  { id: 'hike', n: 'Hiking', e: '🥾', unit: 'hikes', f: [km, { k: 'climb', l: 'Climbed', u: 'm', num: 1 }, { k: 'trail', l: 'Trail', text: 'its name' }] },
  { id: 'home', n: 'Home workout', e: '🏠', unit: 'times', f: [{ k: 'what', l: 'What you did', text: 'in your own words' }] }
];
export const FEELS_MOVE = ['Easy', 'Good', 'Tough'];
export const MINS = [15, 30, 45, 60, 90];

// one activity's definition, including your own ("c…" ids), which can carry one number of their own
export function actDef(id) {
  const c = CATALOG.find(a => a.id === id); if (c) return c;
  const own = ((get().moveSetup || {}).custom || {})[id];
  if (!own) return { id, n: 'Activity', e: '✨', unit: 'times', f: [] };
  return { id, n: own.n, e: own.e || '✨', unit: 'times', own: 1, f: own.unit ? [{ k: 'num', l: own.unit[0].toUpperCase() + own.unit.slice(1), u: own.unit, num: 1 }] : [] };
}
export const picked = () => ((get().moveSetup || {}).picked || []);
export const logsOf = type => (get().activities || []).filter(a => a.type === type);

// what a milestone can count, per activity: times, total time, days, and each number the sport logs
export function measures(id) {
  if (id === 'gym') return [['sessions', 'Sessions', 'sessions'], ['sets', 'Sets done', 'sets'], ['days', 'Days at the gym', 'days']];
  const d = actDef(id);
  return [['times', 'Times', d.unit === 'times' ? 'times' : d.unit], ['hours', 'Total time', 'hours'], ['days', 'Days active', 'days']]
    .concat(d.f.filter(x => x.num).map(x => [x.k, x.l, x.u]));
}
// the running total for a milestone (goals.js asks for this), counting only from `from` onwards
export function measureTotal(id, m, from) {
  const st = get(), r1 = v => Math.round(v * 10) / 10;
  if (id === 'gym') {
    const s = st.sessions.filter(x => x.ts >= (from || 0));
    if (m === 'sets') return s.reduce((n, x) => n + x.exercises.reduce((a, e) => a + e.sets.length, 0), 0);
    if (m === 'days') return new Set(s.map(x => x.date)).size;
    return s.length;
  }
  const L = logsOf(id).filter(a => a.ts >= (from || 0));
  if (m === 'times') return L.length;
  if (m === 'days') return new Set(L.map(a => a.date)).size;
  if (m === 'hours') return r1(L.reduce((n, a) => n + (a.mins || 0), 0) / 60);
  return r1(L.reduce((n, a) => n + (Number((a.f || {})[m]) || 0), 0));
}

// save one activity: a star in the sky, the day lit in Days
export function logActivity(type, date, data) {
  const st = get(); st.activities = st.activities || [];
  const a = Object.assign({ id: uid(), date, ts: Date.now(), type }, data);
  st.activities.push(a);
  const d = actDef(type);
  addMoment('move', d.n + (a.mins ? ' · ' + a.mins + ' min' : ''), date, { ref: a.id, bright: logsOf(type).length === 1 ? 1 : 0 });
  save(); return a;
}

// change a saved log (v50): its details are replaced, and its star's words follow
export function updateActivity(id, data) {
  const st = get(), a = (st.activities || []).find(x => x.id === id); if (!a) return;
  ['mins', 'feel', 'hl', 'note', 'f'].forEach(k => { delete a[k]; }); Object.assign(a, data);
  st.moments.forEach(m => { if (m.ref === id) m.text = actDef(a.type).n + (a.mins ? ' · ' + a.mins + ' min' : ''); });
  save();
}
// remove a log or a gym session (v50), with its star
export function removeEntry(list, id) {
  const st = get(); st[list] = (st[list] || []).filter(x => x.id !== id); st.moments = st.moments.filter(m => m.ref !== id); save();
}

// a short line about one log, e.g. "45 min · Doubles · 6 games"
export function summary(a) {
  const d = actDef(a.type), p = [];
  if (a.mins) p.push(a.mins + ' min');
  d.f.forEach(x => { const v = (a.f || {})[x.k]; if (v == null || v === '') return; p.push(x.num ? v + ' ' + x.u : v); });
  if (d.pace && a.mins && Number((a.f || {}).dist) > 0) { const pm = a.mins / Number(a.f.dist); p.push(Math.floor(pm) + ':' + String(Math.round((pm % 1) * 60)).padStart(2, '0') + ' per km'); }
  if (a.type === 'swim' && Number((a.f || {}).laps) > 0 && a.f.pool) p.push(Number(a.f.laps) * parseInt(a.f.pool, 10) + ' m');
  if (a.feel) p.push(a.feel.toLowerCase());
  return p.join(' · ');
}
