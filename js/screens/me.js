import { get, save, exportJSON, importJSON, isPersisted, today, reset, backupDue } from '../store.js';
import { EXERCISES, AREAS } from '../data.js';
import { esc, nav, him, toast, openSheet, closeSheet, downloadFile, prettyDate } from '../ui.js';
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
    if (t.closest('[data-export]')) { backup(root); return; }
    if (t.closest('[data-fresh]')) { startFresh(root); return; }
    if ((b = t.closest('[data-look]'))) { get().settings.theme = b.dataset.look; save(); window.dispatchEvent(new Event('prequel-theme')); render(root); return; }
    if (t.closest('[data-import]')) { root.querySelector('#importFile').click(); return; }
    if (t.closest('[data-settings]')) { openSettings(root); }
  });
  root.addEventListener('change', e => {
    if (e.target.id !== 'importFile' || !e.target.files[0]) return;
    const file = e.target.files[0];
    openSheet('<h2>Restore this backup?</h2><p class="muted">Everything in the app now will be replaced with what\'s in ' + esc(file.name) + '.</p><button type="button" class="btn" data-yes>Restore it</button><button type="button" class="btn alt" data-close>Cancel</button>', ev => {
      if (!ev.target.closest('[data-yes]')) return;
      file.text().then(txt => { try { importJSON(txt); closeSheet(); toast('Restored. Welcome back.'); render(root); } catch (err) { closeSheet(); toast(err.message || 'That file couldn\'t be read.'); } });
    });
    e.target.value = '';
  });
}

function backup(root) {
  downloadFile('prequel-backup-' + today() + '.json', exportJSON(), 'application/json');
  get().lastBackup = Date.now(); save(); render(root);
}

// start fresh: asks twice, and offers a backup first
function startFresh(root) {
  openSheet('<h2>Start fresh?</h2><p class="muted">This clears everything: your sky, quilt, sessions, notes, letters, and the workouts and exercises you made. The app goes back to how it was on day one.</p><p class="muted">If there\'s any chance you\'ll want it back, save a backup first. You can restore it any time.</p>' +
    '<button type="button" class="btn" data-o="backup">Save a backup first</button><button type="button" class="btn danger" data-o="wipe">Clear everything</button><button type="button" class="btn alt" data-close>Keep everything</button>', ev => {
    const o = ev.target.closest('[data-o]'); if (!o) return;
    if (o.dataset.o === 'backup') { backup(root); return; }
    if (!o.dataset.armed) { o.dataset.armed = '1'; o.textContent = 'Yes, clear it all. Tap again'; return; }
    reset(); closeSheet(); toast('A fresh start. Hello again.'); location.hash = '#/home';
  });
}

function openSettings(root) {
  const s = get().settings;
  openSheet('<h2>Make it yours</h2>' +
    '<label class="field-label" for="sName">WHAT HE CALLS YOU</label><input id="sName" type="text" value="' + esc(s.name) + '" placeholder="Your name or nickname" autocomplete="off">' +
    '<label class="field-label" for="sLines">KIND THINGS HE SAYS · one per line, in your own words</label><textarea id="sLines" rows="8">' + esc(s.kindLines.join('\n')) + '</textarea>' +
    '<label class="field-label" for="sWins">YOUR TINY WINS · one per line</label><textarea id="sWins" rows="8">' + esc(s.tinyWins.join('\n')) + '</textarea>' +
    '<button type="button" class="btn" data-savesettings>Save</button><button type="button" class="btn alt" data-close>Cancel</button>', ev => {
    if (!ev.target.closest('[data-savesettings]')) return;
    const lines = v => v.split('\n').map(x => x.trim()).filter(Boolean);
    s.name = document.getElementById('sName').value.trim();
    s.kindLines = lines(document.getElementById('sLines').value);
    s.tinyWins = lines(document.getElementById('sWins').value);
    save(); closeSheet(); toast('Saved'); render(root);
  });
}

function render(root) {
  const st = get();
  const COL = { sessions: '#1F55D0', cooked: '#E5893D', newfood: '#3E9E6E', breakfast: '#E5893D', restdays: '#D9A400', wins: '#D6698C', letters: '#3E9E6E', lanterns: '#3E9E6E' };
  const colourOf = g => g.kind === 'own' ? AREAS.goal.colour : (COL[g.source] || AREAS.win.colour);
  const goal = g => { const n = count(g); return '<button type="button" class="goal" data-goal="' + g.id + '"><span class="lbl" style="text-transform:none;letter-spacing:0">' + esc(g.name) + '</span><span class="n">' + n + '<small> / ' + g.target + '</small></span><span class="bar"><i style="width:' + Math.max(3, Math.min(100, n / g.target * 100)) + '%;background:' + colourOf(g) + '"></i></span></button>'; };
  const active = st.goals.filter(g => !g.finished), finished = st.goals.filter(g => g.finished).sort((a, b) => b.finished - a.finished);
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
    '<div class="hero">' + him('skate', 'breathe', 'Your character skating, feeling himself') + '<div class="txt"><h1>How far you\'ve come</h1><p class="say">Everything here only goes up.</p></div></div>' +
    '<div class="lbl">Your goals</div>' +
    '<div class="grid2">' + active.map(g => goal(g)).join('') + '<button type="button" class="goal newgoal" data-newgoal><b>+ New goal</b><span>count up to anything</span></button></div>' +
    (ownActive ? '<button type="button" class="btn alt wide" data-loggoal>Log one of your own goals</button>' : '') +
    (finished.length ? '<div class="lbl">The finished shelf</div><div class="trophies">' + finished.map(g => '<button type="button" class="trophy" data-goal="' + g.id + '"><span class="star">★</span><span>' + esc(g.name) + '<small>' + g.target + ' ' + esc(unitOf(g)) + ' · ' + esc(prettyDate(dateKey(new Date(g.finished)))) + '</small></span></button>').join('') + '</div>' : '') +
    '<div class="grid3"><div class="count"><b>' + wins + '</b><span>tiny wins</span></div><div class="count"><b>' + lanterns + '</b><span>lanterns let go</span></div><div class="count"><b>' + st.letters.length + '</b><span>letters</span></div></div>' +
    '<div class="grid2"><a class="rowlink" href="#/sky"><span>Your sky</span><b>›</b></a><a class="rowlink" href="#/quilt"><span>Your quilt</span><b>›</b></a></div>' +
    '<div class="lbl">Looking back</div>' +
    '<div class="card"><b>Your hill</b><p class="muted" style="font-size:13px;margin:0">It only ever climbs. A break is just a flat bit of the path.</p>' +
      '<div class="chips">' + Object.keys(HILLS).map(k => '<button type="button" class="chip small" data-hill="' + k + '" aria-pressed="' + (k === hillKey) + '">' + HILLS[k][0] + '</button>').join('') + '</div>' + hill(H[1], H[2], H[3]) + '</div>' +
    '<div class="card"><b>Your weather ribbon</b><p class="muted" style="font-size:13px;margin:0">Every day you checked in, as a stripe. No good or bad, just weather.</p>' + ribbon(st.weather) + '</div>' +
    '<div class="card"><b>When you rest</b><p class="muted" style="font-size:13px;margin:0">All your rests on one clock. Your real pattern, no score.</p>' + restClock(st.rests) + '</div>' +
    (notice ? '<div class="lookback" style="background:#DFF0DC">' + esc(notice) + '</div>' : '') +
    (looks.length ? looks.map(l => '<div class="lookback" style="background:' + l[0] + '">' + esc(l[1]) + '</div>').join('') : '') +
    (backupDue() ? '<div class="card nudgecard"><b>It\'s been a while since your last backup.</b><p class="muted" style="font-size:14px;margin:0">No rush. Whenever you\'ve got a minute, it keeps everything safe.</p><button type="button" class="btn" data-export>Save one now</button></div>' : '') +
    '<div class="card"><div class="lbl">Keep your data safe</div><p class="muted" style="font-size:14px;line-height:1.45">Everything lives only on this phone. Save a backup now and then (to Files or iCloud Drive), especially before changing phones.</p><p class="muted" style="font-size:12px" id="persist"></p>' +
      '<div class="grid2"><button type="button" class="btn" data-export>Save a backup</button><button type="button" class="btn alt" data-import>Restore</button></div><input type="file" id="importFile" accept="application/json,.json" hidden>' +
      '<p class="muted" style="font-size:12px;margin:0">' + (st.lastBackup ? 'Last backup: ' + new Date(st.lastBackup).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No backup saved yet.') + '</p></div>' +
    '<div class="card"><div class="lbl">Look</div><div class="seg3">' + [['light', 'Light'], ['dark', 'Cosy dark'], ['auto', 'Match my phone']].map(o => '<button type="button" data-look="' + o[0] + '" aria-pressed="' + ((st.settings.theme || 'light') === o[0]) + '">' + o[1] + '</button>').join('') + '</div></div>' +
    '<button type="button" class="btn alt wide" data-settings>Your name, kind words and tiny wins</button>' +
    '<button type="button" class="btn ghost wide" data-fresh>Start fresh</button>' +
    nav('me');
  isPersisted().then(p => { const el = root.querySelector('#persist'); if (el) el.textContent = p ? 'This phone has promised to keep your data.' : 'Tip: adding the app to your home screen helps the phone keep your data.'; });
}
