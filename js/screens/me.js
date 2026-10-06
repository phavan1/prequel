import { get, save, exportJSON, importJSON, isPersisted, today, reset, backupDue } from '../store.js';
import { EXERCISES } from '../data.js';
import { esc, nav, him, toast, openSheet, closeSheet, downloadFile } from '../ui.js';

export function mount(root) {
  render(root);
  root.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-export]')) { backup(root); return; }
    if (t.closest('[data-fresh]')) { startFresh(root); return; }
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
  const goal = (name, n, of, colour) => '<div class="goal"><span class="lbl" style="text-transform:none;letter-spacing:0">' + name + '</span><span class="n">' + n + '<small> / ' + of + '</small></span><span class="bar"><i style="width:' + Math.max(3, Math.min(100, n / of * 100)) + '%;background:' + colour + '"></i></span></div>';
  const cooked = st.foods.filter(f => f.tags.includes('Cooked it myself')).length;
  const newFoods = st.foods.filter(f => f.tags.includes('Tried something new')).length;
  const restDays = new Set(st.rests.map(r => r.date)).size;
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
    '<div class="grid2">' + goal('Gym sessions', st.sessions.length, 100, '#1F55D0') + goal('Home-cooked meals', cooked, 50, '#E5893D') + goal('New foods tried', newFoods, 25, '#3E9E6E') + goal('Days of rest logged', restDays, 100, '#D9A400') + '</div>' +
    '<div class="grid3"><div class="count"><b>' + wins + '</b><span>tiny wins</span></div><div class="count"><b>' + lanterns + '</b><span>lanterns let go</span></div><div class="count"><b>' + st.letters.length + '</b><span>letters</span></div></div>' +
    '<div class="grid2"><a class="rowlink" href="#/sky"><span>Your sky</span><b>›</b></a><a class="rowlink" href="#/quilt"><span>Your quilt</span><b>›</b></a></div>' +
    (looks.length ? '<div class="lbl">Look-backs</div>' + looks.map(l => '<div class="lookback" style="background:' + l[0] + '">' + esc(l[1]) + '</div>').join('') : '') +
    (backupDue() ? '<div class="card nudgecard"><b>It\'s been a while since your last backup.</b><p class="muted" style="font-size:14px;margin:0">No rush. Whenever you\'ve got a minute, it keeps everything safe.</p><button type="button" class="btn" data-export>Save one now</button></div>' : '') +
    '<div class="card"><div class="lbl">Keep your data safe</div><p class="muted" style="font-size:14px;line-height:1.45">Everything lives only on this phone. Save a backup now and then (to Files or iCloud Drive), especially before changing phones.</p><p class="muted" style="font-size:12px" id="persist"></p>' +
      '<div class="grid2"><button type="button" class="btn" data-export>Save a backup</button><button type="button" class="btn alt" data-import>Restore</button></div><input type="file" id="importFile" accept="application/json,.json" hidden>' +
      '<p class="muted" style="font-size:12px;margin:0">' + (st.lastBackup ? 'Last backup: ' + new Date(st.lastBackup).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No backup saved yet.') + '</p></div>' +
    '<button type="button" class="btn alt wide" data-settings>Your name, kind words and tiny wins</button>' +
    '<button type="button" class="btn ghost wide" data-fresh>Start fresh</button>' +
    nav('me');
  isPersisted().then(p => { const el = root.querySelector('#persist'); if (el) el.textContent = p ? 'This phone has promised to keep your data.' : 'Tip: adding the app to your home screen helps the phone keep your data.'; });
}
