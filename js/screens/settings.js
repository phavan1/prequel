// Settings: everything that isn't about you. Your name and words, the look, your data, starting fresh.
import { get, save, exportJSON, importJSON, isPersisted, today, reset, backupDue } from '../store.js';
import { esc, nav, backLink, toast, openSheet, closeSheet, downloadFile } from '../ui.js';

export function mount(root) {
  render(root);
  root.addEventListener('click', e => {
    const t = e.target; let b;
    if (t.closest('[data-export]')) { backup(root); return; }
    if (t.closest('[data-fresh]')) { startFresh(root); return; }
    if ((b = t.closest('[data-look]'))) { get().settings.theme = b.dataset.look; save(); window.dispatchEvent(new Event('prequel-theme')); render(root); return; }
    if (t.closest('[data-import]')) { root.querySelector('#importFile').click(); return; }
    if (t.closest('[data-words]')) { wordsSheet(root); }
  });
  root.addEventListener('change', e => {
    if (e.target.id !== 'importFile' || !e.target.files[0]) return;
    const file = e.target.files[0];
    openSheet('<h2>Restore this backup?</h2><p class="muted">Everything in the app now will be replaced with what\'s in ' + esc(file.name) + '.</p><button type="button" class="btn" data-yes>Restore it</button><button type="button" class="btn alt" data-close>Cancel</button>', ev => {
      if (!ev.target.closest('[data-yes]')) return;
      file.text().then(txt => { try { importJSON(txt); closeSheet(); toast('Restored. Welcome back.'); window.dispatchEvent(new Event('prequel-theme')); render(root); } catch (err) { closeSheet(); toast(err.message || 'That file couldn\'t be read.'); } });
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
    reset(); closeSheet(); window.dispatchEvent(new Event('prequel-theme')); toast('A fresh start. Hello again.'); location.hash = '#/home';
  });
}

function wordsSheet(root) {
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
  const st = get(), s = st.settings;
  root.innerHTML =
    '<div class="top">' + backLink('#/me', 'Me') + '</div>' +
    '<h1>Settings</h1>' +
    '<div class="lbl">Make it yours</div>' +
    '<button type="button" class="rowlink" data-words style="width:100%"><span>Your name, kind words and tiny wins<small class="rowsub">' + (s.name ? 'He calls you ' + esc(s.name) : 'Tell him what to call you') + '</small></span><b>›</b></button>' +
    '<div class="lbl">Look</div>' +
    '<div class="seg3">' + [['light', 'Light'], ['dark', 'Cosy dark'], ['auto', 'Match my phone']].map(o => '<button type="button" data-look="' + o[0] + '" aria-pressed="' + ((s.theme || 'light') === o[0]) + '">' + o[1] + '</button>').join('') + '</div>' +
    '<div class="lbl">Your data</div>' +
    (backupDue() ? '<div class="card nudgecard"><b>It\'s been a while since your last backup.</b><p class="muted" style="font-size:14px;margin:0">No rush. Whenever you\'ve got a minute, it keeps everything safe.</p></div>' : '') +
    '<div class="card"><p class="muted" style="font-size:14px;line-height:1.45;margin:0">Everything lives only on this phone. Save a backup now and then (to Files or iCloud Drive), especially before changing phones.</p><p class="muted" style="font-size:12px;margin:0" id="persist"></p>' +
      '<div class="grid2"><button type="button" class="btn" data-export>Save a backup</button><button type="button" class="btn alt" data-import>Restore</button></div><input type="file" id="importFile" accept="application/json,.json" hidden>' +
      '<p class="muted" style="font-size:12px;margin:0">' + (st.lastBackup ? 'Last backup: ' + new Date(st.lastBackup).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No backup saved yet.') + '</p></div>' +
    '<button type="button" class="btn ghost wide" data-fresh style="margin-top:12px">Start fresh</button>' +
    nav('me');
  isPersisted().then(p => { const el = root.querySelector('#persist'); if (el) el.textContent = p ? 'This phone has promised to keep your data.' : 'Tip: adding the app to your home screen helps the phone keep your data.'; });
}
