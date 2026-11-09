import { get } from '../store.js';
import { EXERCISES, AREAS } from '../data.js';
import { esc, nav, him, prettyDate } from '../ui.js';
import { ensureGoals, count, unitOf, checkFinished, openNewGoal, openEditGoal, openLog } from '../goals.js';
import { ribbon, nightsChart, noticing } from '../charts.js';
import { previewCard } from './journey.js';
import { defaultYm, monthWord, phraseOf } from './wall.js';
import { recapData } from '../recap.js';
import { on, goalShown, skyOn, quiltOn } from '../features.js';
import { dateKey } from '../store.js';


export function mount(root) {
  ensureGoals();
  render(root);
  checkFinished();
  root.addEventListener('click', e => {
    const t = e.target; let b;
    if (t.closest('[data-newgoal]')) { openNewGoal(() => render(root)); return; }
    if (t.closest('[data-loggoal]')) { openLog(null, () => render(root)); return; }
    if ((b = t.closest('[data-goal]'))) { openEditGoal(b.dataset.goal, () => render(root)); return; }
    if ((b = t.closest('[data-wx]'))) { b.closest('.chartwrap').querySelector('.readout').textContent = b.dataset.wx; return; }
  });
}

function render(root) {
  const st = get();
  const COL = { sessions: '#1F55D0', cooked: '#E5893D', newfood: '#3E9E6E', breakfast: '#E5893D', restdays: '#D9A400', wins: '#D6698C', letters: '#3E9E6E', lanterns: '#3E9E6E' };
  const colourOf = g => g.kind === 'own' ? AREAS.goal.colour : (COL[g.source] || AREAS.win.colour);
  const goal = g => { const n = count(g); return '<button type="button" class="goal" data-goal="' + g.id + '"><span class="lbl" style="text-transform:none;letter-spacing:0">' + esc(g.name) + '</span>' + (n ? '<span class="n">' + n + '<small> / ' + g.target + '</small></span><span class="bar"><i style="width:' + Math.max(3, Math.min(100, n / g.target * 100)) + '%;background:' + colourOf(g) + '"></i></span>' : '<span class="fresh">Ready when you are<small>counting up to ' + g.target + '</small></span>') + '</button>'; };
  const G = st.goals.filter(goalShown); // v101: goals from areas you've switched off (or all, with Goals off) are hidden, not deleted
  const active = G.filter(g => !g.finished && !g.paused), resting = G.filter(g => !g.finished && g.paused), finished = G.filter(g => g.finished).sort((a, b) => b.finished - a.finished);
  const ownActive = active.some(g => g.kind === 'own');
  const notice = on('weather') ? noticing(st) : null; // v101
  const wins = st.moments.filter(m => m.area === 'win').length;
  const lanterns = st.mind.filter(n => n.letGo).length;


  root.innerHTML =
    '<a class="gear" href="#/settings" aria-label="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></a>' +
    '<div class="hero">' + him('skate', 'breathe', 'Your character skating, feeling himself') + '<div class="txt"><h1>How far you\'ve come</h1><p class="say">Everything here only goes up.</p></div></div>' +
    '<div class="dcols me3"><div class="dcol ca">' + // v92: on a laptop, Me spreads into two columns (on a phone these wrappers do nothing)
    (on('goals') ? '<div class="lbl">Your goals</div>' : '') +
    (!on('goals') ? '' : '<div class="grid2">' + active.map(g => goal(g)).join('') + '<button type="button" class="goal newgoal" data-newgoal><b>+ New goal</b><span>count up to anything</span></button></div>') +
    (ownActive ? '<button type="button" class="btn alt wide" data-loggoal>Log one of your own goals</button>' : '') +
    (resting.length ? '<div class="lbl">Resting for now</div><div class="trophies">' + resting.map(g => { const n = count(g); return '<button type="button" class="trophy resting" data-goal="' + g.id + '"><span class="star">☾</span><span>' + esc(g.name) + '<small>' + (n ? n + ' so far, kept safe' : 'kept safe for later') + ' · tap to pick it back up</small></span></button>'; }).join('') + '</div>' : '') +
    (finished.length ? '<div class="lbl">The finished shelf</div><div class="trophies">' + finished.map(g => '<button type="button" class="trophy" data-goal="' + g.id + '"><span class="star">★</span><span>' + esc(g.name) + '<small>' + g.target + ' ' + esc(unitOf(g)) + ' · ' + esc(prettyDate(dateKey(new Date(g.finished)))) + '</small></span></button>').join('') + '</div>' : '') +
    (on('move') ? previewCard() : '') + '</div><div class="dcol cb">' + // v67: Your moving journey, a scene card right after your goals (v66 had it under Looking back)
    // v79: Your wall as a mini poster, in the poster's own comic style, so it stands out on Me
    // v91: two posters on your wall: the month to plan in front, last month's recap peeking out behind (only when
    // last month has something in it), and a button for each
    (() => { if (!on('wall')) return '';
      const k = defaultYm(), t = new Date(), pk = dateKey(new Date(t.getFullYear(), t.getMonth() - 1, 1)).slice(0, 7), back = recapData(pk).any;
      return '<div class="wallstack' + (back ? ' two' : '') + '">' +
        (back ? '<a class="wallback" href="#/wall?from=me&back=' + pk + '" aria-label="Look back at ' + esc(monthWord(pk)) + '"><span class="wb-lab">LOOK WHAT YOU DID</span><span class="wb-mon">' + esc(monthWord(pk).toUpperCase()) + '</span></a>' : '') +
        '<div class="wallcard"><a class="wc-hit" href="#/wall?from=me&plan=1" aria-label="Your wall: plan ' + esc(monthWord(k)) + '"></a><span class="wc-tag">YOUR WALL</span><span class="wc-mon">' + esc(monthWord(k).toUpperCase()) + '</span><span class="wc-stk">' + esc(phraseOf(k)) + '</span>' +
          '<span class="wc-links"><a href="#/wall?from=me&plan=1" data-wplan>Plan ' + esc(monthWord(k)) + ' ›</a>' + (back ? '<a href="#/wall?from=me&back=' + pk + '" data-wlook>Look back at ' + esc(monthWord(pk)) + ' ›</a>' : '') + '</span></div></div>';
    })() +
    // v75: "How you've moved" is gone: Your moving journey (above) does that job, so 18 gym sessions isn't said three times
    // the little counts that live nowhere else, only above zero
    (() => { const c = [[on('wins') ? wins : 0, 'tiny wins'], [on('mind') ? lanterns : 0, 'lanterns let go'], [on('mind') ? st.letters.length : 0, st.letters.length === 1 ? 'letter' : 'letters']].filter(x => x[0] > 0); return c.length ? '<div class="grid' + (c.length === 1 ? '1' : c.length) + '">' + c.map(x => '<div class="count"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>').join('') + '</div>' : ''; })() +
    // v96: On repeat joins your sky and your quilt (things you've collected over time), so it can be found without a Days tab
    (() => { const L = [skyOn() && '<a class="rowlink" href="#/sky?from=me"><span>Your sky</span><b>›</b></a>', quiltOn() && '<a class="rowlink" href="#/quilt?from=me"><span>Your quilt</span><b>›</b></a>', '<a class="rowlink" href="#/repeat?from=me"><span>On repeat</span><b>›</b></a>'].filter(Boolean); return '<div class="grid' + L.length + ' collect">' + L.join('') + '</div>'; })() + // v101: the sky and quilt only while they have something
    '<a class="sharecta" href="#/share"><span><b>Share your story</b><small>Cards made from your sky, milestones and month</small></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg></a>' +
    '</div><div class="dcol cc">' +
    // v101: Looking back only shows what's switched on
    (on('weather') || on('rest') ? '<div class="lbl">Looking back</div>' : '') +
    (on('weather') ? '<div class="card"><b>Your weather ribbon</b><p class="muted" style="font-size:13px;margin:0">Every day you checked in, as a stripe. No good or bad, just weather.</p>' + ribbon(st.weather) + '</div>' : '') +
    (on('rest') ? '<div class="card"><b>Your last two weeks of nights</b><p class="muted" style="font-size:13px;margin:0">One row a day, from 6pm the evening before to 6pm that day. Your real pattern, no score.</p>' + nightsChart(st.rests) + '</div>' : '') +
    (notice ? '<div class="lookback" style="background:#DFF0DC">' + esc(notice) + '</div>' : '') +
    '</div></div>' +
    nav('me');
}
