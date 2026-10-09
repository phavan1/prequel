import { get } from '../store.js';
import { EXERCISES, AREAS } from '../data.js';
import { esc, nav, him, prettyDate } from '../ui.js';
import { ensureGoals, count, unitOf, checkFinished, openNewGoal, openEditGoal, openLog } from '../goals.js';
import { hill, wireHills, ribbon, restClock, noticing } from '../charts.js';
import { dateKey } from '../store.js';

let hillKey = 'all';

export function mount(root) {
  ensureGoals();
  render(root);
  checkFinished();
  wireHills(root);
  root.addEventListener('click', e => {
    const t = e.target; let b;
    if (t.closest('[data-newgoal]')) { openNewGoal(() => render(root)); return; }
    if (t.closest('[data-loggoal]')) { openLog(null, () => render(root)); return; }
    if ((b = t.closest('[data-goal]'))) { openEditGoal(b.dataset.goal, () => render(root)); return; }
    if ((b = t.closest('[data-hill]'))) { hillKey = b.dataset.hill; render(root); return; }
    if ((b = t.closest('[data-wx]'))) { b.closest('.chartwrap').querySelector('.readout').textContent = b.dataset.wx; return; }
  });
}

function render(root) {
  const st = get();
  const COL = { sessions: '#1F55D0', cooked: '#E5893D', newfood: '#3E9E6E', breakfast: '#E5893D', restdays: '#D9A400', wins: '#D6698C', letters: '#3E9E6E', lanterns: '#3E9E6E' };
  const colourOf = g => g.kind === 'own' ? AREAS.goal.colour : (COL[g.source] || AREAS.win.colour);
  const goal = g => { const n = count(g); return '<button type="button" class="goal" data-goal="' + g.id + '"><span class="lbl" style="text-transform:none;letter-spacing:0">' + esc(g.name) + '</span>' + (n ? '<span class="n">' + n + '<small> / ' + g.target + '</small></span><span class="bar"><i style="width:' + Math.max(3, Math.min(100, n / g.target * 100)) + '%;background:' + colourOf(g) + '"></i></span>' : '<span class="fresh">Ready when you are<small>counting up to ' + g.target + '</small></span>') + '</button>'; };
  const active = st.goals.filter(g => !g.finished && !g.paused), resting = st.goals.filter(g => !g.finished && g.paused), finished = st.goals.filter(g => g.finished).sort((a, b) => b.finished - a.finished);
  const ownActive = active.some(g => g.kind === 'own');
  const HILLS = { all: ['Everything', st.moments.map(m => m.date), '#D6698C', 'moments'], move: ['Gym', st.sessions.map(x => x.date), '#1F55D0', 'sessions'], cooked: ['Cooked', st.foods.filter(f => f.tags.includes('Cooked it myself')).map(f => f.date).concat((st.meals || []).filter(m => (st.myFoods || []).some(f => f.id === m.foodId && f.kind === 'home')).map(m => m.date)), '#E5893D', 'meals'], rest: ['Rest days', Array.from(new Set(st.rests.map(r => r.date))), '#D9A400', 'days'] };
  const H = HILLS[hillKey] || HILLS.all;
  const notice = noticing(st);
  const wins = st.moments.filter(m => m.area === 'win').length;
  const lanterns = st.mind.filter(n => n.letGo).length;

  // look-backs: your heaviest ever, and fun totals. Never compared week to week.
  const best = {};
  let lifted = 0;
  st.sessions.forEach(s => s.exercises.forEach(x => {
    if (x.swap || !EXERCISES[x.key] || EXERCISES[x.key].t !== 'wr') return;
    x.sets.forEach(z => {
      const w = Number(z.a) || 0, r = Number(z.b) || 0;
      if ((st.units[x.key] || (x.key === 'legpress' ? 'plate' : 'kg')) === 'kg') lifted += w * r;
      if (!best[x.key] || w > best[x.key]) best[x.key] = w;
    });
  }));
  const bestList = Object.entries(best).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const elephants = lifted / 4000;
  const looks = [];
  bestList.forEach(([k, w]) => looks.push(['#E4ECFF', 'The heaviest you\'ve ever done on ' + EXERCISES[k].n.toLowerCase() + ': ' + w + ((st.units[k] || (k === 'legpress' ? 'plate' : 'kg')) === 'kg' ? ' kg' : ' (plate ' + w + ')')]));
  if (lifted > 0) looks.push(['#FFF1C4', elephants >= 1 ? 'All together you\'ve lifted about ' + (elephants >= 2 ? Math.floor(elephants) + ' elephants' : 'one whole elephant') + '.' : 'All together you\'ve lifted ' + Math.round(lifted).toLocaleString() + ' kg so far. An elephant is about 4,000.']);

  root.innerHTML =
    '<a class="gear" href="#/settings" aria-label="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></a>' +
    '<div class="hero">' + him('skate', 'breathe', 'Your character skating, feeling himself') + '<div class="txt"><h1>How far you\'ve come</h1><p class="say">Everything here only goes up.</p></div></div>' +
    '<div class="lbl">Your goals</div>' +
    '<div class="grid2">' + active.map(g => goal(g)).join('') + '<button type="button" class="goal newgoal" data-newgoal><b>+ New goal</b><span>count up to anything</span></button></div>' +
    (ownActive ? '<button type="button" class="btn alt wide" data-loggoal>Log one of your own goals</button>' : '') +
    (resting.length ? '<div class="lbl">Resting for now</div><div class="trophies">' + resting.map(g => { const n = count(g); return '<button type="button" class="trophy resting" data-goal="' + g.id + '"><span class="star">☾</span><span>' + esc(g.name) + '<small>' + (n ? n + ' so far, kept safe' : 'kept safe for later') + ' · tap to pick it back up</small></span></button>'; }).join('') + '</div>' : '') +
    (finished.length ? '<div class="lbl">The finished shelf</div><div class="trophies">' + finished.map(g => '<button type="button" class="trophy" data-goal="' + g.id + '"><span class="star">★</span><span>' + esc(g.name) + '<small>' + g.target + ' ' + esc(unitOf(g)) + ' · ' + esc(prettyDate(dateKey(new Date(g.finished)))) + '</small></span></button>').join('') + '</div>' : '') +
    // only the counts that have something in them
    (() => { const c = [[wins, 'tiny wins'], [lanterns, 'lanterns let go'], [st.letters.length, st.letters.length === 1 ? 'letter' : 'letters']].filter(x => x[0] > 0); return c.length ? '<div class="grid' + (c.length === 1 ? '1' : c.length) + '">' + c.map(x => '<div class="count"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>').join('') + '</div>' : ''; })() +
    '<div class="grid2"><a class="rowlink" href="#/sky"><span>Your sky</span><b>›</b></a><a class="rowlink" href="#/quilt"><span>Your quilt</span><b>›</b></a></div>' +
    '<div class="lbl">Looking back</div>' +
    '<div class="card"><b>Your hill</b><p class="muted" style="font-size:13px;margin:0">It only ever climbs. A break is just a flat bit of the path.</p>' +
      '<div class="chips">' + Object.keys(HILLS).map(k => '<button type="button" class="chip small" data-hill="' + k + '" aria-pressed="' + (k === hillKey) + '">' + HILLS[k][0] + '</button>').join('') + '</div>' + hill(H[1], H[2], H[3]) + '</div>' +
    '<div class="card"><b>Your weather ribbon</b><p class="muted" style="font-size:13px;margin:0">Every day you checked in, as a stripe. No good or bad, just weather.</p>' + ribbon(st.weather) + '</div>' +
    '<div class="card"><b>When you rest</b><p class="muted" style="font-size:13px;margin:0">All your rests on one clock. Your real pattern, no score.</p>' + restClock(st.rests) + '</div>' +
    (notice ? '<div class="lookback" style="background:#DFF0DC">' + esc(notice) + '</div>' : '') +
    (looks.length ? looks.map(l => '<div class="lookback" style="background:' + l[0] + '">' + esc(l[1]) + '</div>').join('') : '') +
    nav('me');
}
