import { get } from '../store.js';
import { EXERCISES, AREAS } from '../data.js';
import { esc, nav, him, prettyDate } from '../ui.js';
import { ensureGoals, count, unitOf, checkFinished, openNewGoal, openEditGoal, openLog } from '../goals.js';
import { previewCard } from './journey.js';
import { defaultYm, monthWord, phraseOf } from './wall.js';
import { recapData } from '../recap.js';
import { on, goalShown, skyOn, quiltOn } from '../features.js';
import { dateKey } from '../store.js';
import { current } from '../music.js';
import { patches } from './quilt.js';
import { lookbackAny } from './lookback.js';


export function mount(root) {
  ensureGoals();
  render(root);
  checkFinished();
  root.addEventListener('click', e => {
    const t = e.target; let b;
    if (t.closest('[data-newgoal]')) { openNewGoal(() => render(root)); return; }
    if (t.closest('[data-loggoal]')) { openLog(null, () => render(root)); return; }
    if ((b = t.closest('[data-goal]'))) { openEditGoal(b.dataset.goal, () => render(root)); return; }
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
  const wins = on('wins') ? st.moments.filter(m => m.area === 'win').length : 0;
  const lanterns = on('mind') ? st.mind.filter(n => n.letGo).length : 0;
  const withN = active.filter(g => count(g) > 0), fresh = active.filter(g => !(count(g) > 0)); // v105: goals still at the start sit on one line


  root.innerHTML =
    '<a class="gear" href="#/settings" aria-label="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></a>' +
    '<div class="hero">' + him('skate', 'breathe', 'Your character skating, feeling himself') + '<div class="txt"><h1>How far you\'ve come</h1><p class="say">Everything here only goes up.</p>' +
      '<a class="sharepill" href="#/share">Share your story <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg></a></div></div>' + // v105: a small button, not a banner
    '<div class="dcols me3"><div class="dcol ca">' + // v92: on a laptop, Me spreads into two columns (on a phone these wrappers do nothing)
    (on('goals') ? '<div class="lbl">Your goals</div>' : '') +
    (!on('goals') ? '' : (withN.length ? '<div class="grid2">' + withN.map(g => goal(g)).join('') + '</div>' : '') +
      '<div class="readyline">' + (fresh.length ? '<span>Ready when you are:</span>' + fresh.map(g => '<button type="button" class="rchip" data-goal="' + g.id + '">' + esc(g.name) + '</button>').join('') : '') + '<button type="button" class="rchip new" data-newgoal>+ New goal</button></div>') +
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
    // v105: one shelf of picture tiles for what you've collected; the little counts ride on the tiles, and Looking back
    // (weather ribbon, two weeks of nights) is its own page, so Me fits about one screen
    (() => {
      const T = [];
      if (skyOn()) { const n = st.moments.length; T.push(tile('sky', '#/sky?from=me', SKY_ART, 'Your sky', [[n, ' star', ' stars'], [lanterns, ' lantern', ' lanterns']].filter(x => x[0] > 0).map(x => x[0] + (x[0] === 1 ? x[1] : x[2])).join(' · ') || 'Your first star is on its way')); }
      if (quiltOn()) { const ym = dateKey(new Date()).slice(0, 7), mine = patches().filter(p => p.date.startsWith(ym)), mon = monthWord(ym);
        T.push(tile('quilt', '#/quilt?from=me', quiltArt(mine), 'Your quilt', mine.length ? mine.length + (mine.length === 1 ? ' night' : ' nights') + ' sewn in ' + mon : 'Waiting for ' + mon + '\'s first patch')); }
      const c = current();
      T.push(tile('rep', '#/repeat?from=me', '<span class="mtape" aria-hidden="true"><span class="mt-lab"><i></i><span>' + esc(c ? c.title : 'Your song') + '</span></span><span class="mt-win"><b></b><em></em><b></b></span></span>', 'On repeat', c ? (c.artist ? esc(c.artist) + ' · ' : '') + 'since ' + esc(dayMonth(c.start || c.date)) : 'The song you can\'t stop playing', true));
      if (lookbackAny()) { const bits = [on('weather') && 'Weather', on('rest') && 'nights'].filter(Boolean).join(', '), w = wins ? wins + (wins === 1 ? ' tiny win' : ' tiny wins') : '';
        T.push(tile('look', '#/lookback?from=me', lookArt(), 'Looking back', [bits, w].filter(Boolean).join(' · ') || 'The quiet record')); }
      return '<div class="grid2 tiles">' + T.join('') + '</div>';
    })() +
    '</div></div>' +
    nav('me');
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayMonth = k => { const [, m, d] = String(k).split('-').map(Number); return d + ' ' + MONTHS[m - 1]; };
function tile(cls, href, art, title, sub, subIsHtml) {
  return '<a class="ttile ' + cls + '" href="' + href + '">' + art + '<span class="tt"><b>' + esc(title) + '</b><small>' + (subIsHtml ? sub : esc(sub)) + '</small></span><span class="tgo" aria-hidden="true">›</span></a>';
}
// little pictures for the tiles: drawn once, a hint of each page rather than its data
const SKY_ART = (() => {
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647; let s = '';
  for (let i = 0; i < 30; i++) s += '<circle cx="' + (4 + r() * 152).toFixed(1) + '" cy="' + (4 + r() * 66).toFixed(1) + '" r="' + [0.7, 0.9, 1.2, 1.6][Math.floor(r() * 4)] + '" fill="#FFF6D8" opacity="' + (0.5 + r() * 0.5).toFixed(2) + '"/>';
  const P = [[22, 52], [46, 30], [70, 38], [96, 16], [120, 26]];
  return '<svg viewBox="0 0 160 74" class="tart" aria-hidden="true">' + s + '<polyline points="' + P.map(p => p.join(',')).join(' ') + '" fill="none" stroke="#C9D4FF" stroke-width="0.8" opacity=".7"/>' + P.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2" fill="#FFE27A"/>').join('') + '<circle cx="138" cy="56" r="7" fill="#F4C430" opacity=".25"/><rect x="135" y="52" width="6" height="8" rx="1.5" fill="#F4B740"/></svg>';
})();
function quiltArt(mine) {
  const DEF = ['#E5893D', '#1F55D0', '#F4C430', '#3E9E6E', '#D6698C', '#8FB0FF'];
  const cols = mine.slice(-6).map(p => ((p.fabrics || [])[0] || {}).a).filter(c => /^#/.test(c || ''));
  let s = '<svg viewBox="0 0 160 74" class="tart" aria-hidden="true"><rect x="6" y="5" width="148" height="64" rx="6" fill="#1F55D0"/>';
  for (let i = 0; i < 6; i++) { const x = 12 + (i % 4) * 35, y = 10 + Math.floor(i / 4) * 29, c = mine.length ? cols[i] : DEF[i];
    s += c ? '<rect x="' + x + '" y="' + y + '" width="32" height="26" rx="2" fill="' + c + '"/><rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="28" height="22" rx="1" fill="none" stroke="#FFFCF3" stroke-dasharray="2 2" stroke-width=".9"/>'
      : '<rect x="' + x + '" y="' + y + '" width="32" height="26" rx="2" fill="#FFFCF3" opacity=".3" stroke="#FFFCF3" stroke-dasharray="2 2"/>'; }
  return s + '<rect x="82" y="39" width="66" height="26" rx="2" fill="#FFFCF3" opacity=".3" stroke="#FFFCF3" stroke-dasharray="2 2"/></svg>';
}
function lookArt() {
  const W = ['#4FA88A', '#F4C430', '#8FB0FF', '#E5893D', '#6F8FD8', '#B9A9E0', '#4FA88A', '#F4C430', '#E5893D', '#8FB0FF', '#6F8FD8', '#F4C430', '#4FA88A', '#B9A9E0', '#E5893D', '#8FB0FF'];
  let s = '<svg viewBox="0 0 160 74" class="tart" aria-hidden="true">';
  if (on('weather')) s += '<rect x="8" y="6" width="144" height="16" rx="4" fill="#EEE"/>' + W.map((c, i) => '<rect x="' + (8 + i * 9) + '" y="6" width="9" height="16" fill="' + c + '"/>').join('');
  if (on('rest')) for (let i = 0; i < 6; i++) s += '<rect x="' + (40 + (i % 3) * 4) + '" y="' + ((on('weather') ? 30 : 14) + i * 7) + '" width="' + (62 - (i % 2) * 8) + '" height="5" rx="2.5" fill="#1F55D0"/>';
  if (!on('weather') && !on('rest')) s += '<text x="80" y="46" text-anchor="middle" font-size="28" fill="#D6698C">♥</text>';
  return s + '</svg>';
}
