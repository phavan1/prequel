// Settings: everything that isn't about you. Your name and words, the look, your data, starting fresh.
import { get, save, exportJSON, isPersisted, today, reset, backupDue, dateKey, checkBackup, BACKUP_PROBLEMS, restoreBackup, hasData, undoInfo, undoRestore } from '../store.js';
import { esc, nav, backLink, toast, openSheet, closeSheet, downloadFile } from '../ui.js';
import { dayDate, clock } from '../pdf.js';
import { NEWS, LATEST, openNews } from '../news.js';
import { wu, setUnit, askLb } from '../units.js';

export function mount(root) {
  render(root);
  root.addEventListener('click', e => {
    const t = e.target; let b;
    if (t.closest('[data-export]')) { backup(root); return; }
    if (t.closest('[data-fresh]')) { startFresh(root); return; }
    if ((b = t.closest('[data-wunit]'))) { if (b.dataset.wunit !== wu()) { setUnit(b.dataset.wunit); render(root); if (!askLb()) toast('Weights are now in ' + (wu() === 'lb' ? 'pounds' : 'kilograms') + '.'); } return; }
    if ((b = t.closest('[data-look]'))) { get().settings.theme = b.dataset.look; save(); window.dispatchEvent(new Event('prequel-theme')); render(root); return; }
    if (t.closest('[data-import]')) { root.querySelector('#importFile').click(); return; }
    if (t.closest('[data-words]')) { wordsSheet(root); return; }
    if (t.closest('[data-undo]')) { undoSheet(root); return; }
    if (t.closest('[data-news]')) { openNews(NEWS, true); }
  });
  root.addEventListener('change', e => {
    if (e.target.id !== 'importFile' || !e.target.files[0]) return;
    const file = e.target.files[0];
    file.text().then(txt => {
      const r = checkBackup(txt);
      if (r.problem) { notice('Nothing was changed', BACKUP_PROBLEMS[r.problem]); return; }
      restoreSheet(root, r.data, file.name);
    }, () => notice('Nothing was changed', BACKUP_PROBLEMS.unreadable));
    e.target.value = '';
  });
}

// "Last backup" only counts once the file really went somewhere (closing the share sheet doesn't count)
async function backup(root) {
  const r = await downloadFile('prequel-backup-' + today() + '.json', exportJSON(), 'application/json');
  if (r === 'cancelled') { toast('No backup saved this time.'); return false; }
  get().lastBackup = Date.now(); save(); render(root); return true;
}

// ---------- restoring: see what's in the file first, keep a safety copy, and allow an undo for 7 days ----------
const words = ts => dayDate(dateKey(new Date(ts)));
function counts(d) {
  const n = k => (Array.isArray(d[k]) ? d[k].length : 0);
  const parts = [[n('moments'), 'star', 'stars'], [n('meals') + n('foods'), 'meal', 'meals'], [n('rests'), 'rest', 'rests'], [n('sessions'), 'session', 'sessions']]
    .filter(x => x[0] > 0).map(x => x[0] + ' ' + (x[0] === 1 ? x[1] : x[2]));
  return parts.length ? parts.join(' · ') : 'Nothing logged yet';
}
function notice(title, text) {
  openSheet('<h2>' + esc(title) + '</h2><p class="muted">' + esc(text) + '</p><button type="button" class="btn" data-close>Okay</button>');
}
function restoreSheet(root, data, fileName) {
  const st = get(), here = hasData(st);
  const at = data.exported ? Date.parse(data.exported) : NaN, dated = !isNaN(at);
  // the real risk isn't a broken file, it's a good but older one: say what would be lost
  const newer = dated ? st.moments.filter(m => m.ts > at).length : 0;
  const older = here && (dated ? newer > 0 : st.moments.length > data.moments.length);
  const warn = older ? '<div class="note-y">' + (dated ? 'This backup is older than what\'s here. Anything logged after ' + esc(words(at)) + ' would be gone.' : 'This backup has less in it than the app does now. Anything that isn\'t in it would be gone.') + '</div>' : '';
  const box = (title, sub, body) => '<div class="cmp"><div class="k">' + title + '</div>' + (sub ? '<small>' + sub + '</small>' : '') + '<b>' + esc(body) + '</b></div>';
  const draw = saved => '<h2>Restore this backup?</h2>' +
    '<div class="cmpgrid">' + box('This backup', dated ? 'saved ' + esc(words(at)) : esc(fileName), counts(data)) + box('In the app now', '', counts(st)) + '</div>' + warn +
    '<p class="muted" style="font-size:14px;margin:0">' + (here ? 'Restoring replaces everything in the app with this backup. Before it does, Prequel keeps a copy of what\'s here now on this phone for 7 days, so you can undo it.' : 'There\'s nothing in the app yet, so nothing will be lost.') + '</p>' +
    '<button type="button" class="btn" data-yes>Restore it</button>' +
    (here ? '<button type="button" class="btn alt" data-savefirst' + (saved ? ' disabled' : '') + '>' + (saved ? 'Saved as a file ✓' : 'Save what\'s here as a file first') + '</button>' : '') +
    '<button type="button" class="btn ghost" data-close>Cancel</button>';
  const sheet = openSheet(draw(false), async ev => {
    if (ev.target.closest('[data-savefirst]')) { if (await backup(root)) sheet.querySelector('.sheet').innerHTML = draw(true); return; }
    if (!ev.target.closest('[data-yes]')) return;
    const r = await restoreBackup(data);
    if (r === 'nocopy') { noCopySheet(root, data); return; }
    restored(root);
  });
}
function noCopySheet(root, data) {
  openSheet('<h2>Couldn\'t keep a safety copy</h2><p class="muted">Prequel couldn\'t store a copy of what\'s here on this phone, so this restore can\'t be undone. You could save what\'s here as a file first.</p>' +
    '<button type="button" class="btn" data-o="save">Save what\'s here as a file</button><button type="button" class="btn alt" data-o="go">Restore anyway</button><button type="button" class="btn ghost" data-close>Cancel</button>', async ev => {
    const o = ev.target.closest('[data-o]'); if (!o) return;
    if (o.dataset.o === 'save') { await backup(root); return; }
    await restoreBackup(data, { withoutCopy: true }); restored(root);
  });
}
function restored(root) {
  closeSheet(); toast('Restored. Welcome back.'); window.dispatchEvent(new Event('prequel-theme')); render(root);
}
function undoSheet(root) {
  const u = undoInfo(); if (!u) { render(root); return; }
  openSheet('<h2>Undo the restore?</h2><p class="muted">This puts back everything exactly as it was just before you restored, on ' + esc(words(u.at)) + ' at ' + esc(clock(u.at)) + '. Anything logged since then will be gone.</p>' +
    '<button type="button" class="btn" data-o="undo">Yes, put it back</button><button type="button" class="btn ghost" data-close>Keep things as they are</button>', async ev => {
    if (!ev.target.closest('[data-o="undo"]')) return;
    const ok = await undoRestore(); closeSheet();
    toast(ok ? 'Back to how it was before the restore.' : 'That copy couldn\'t be found. Nothing was changed.');
    window.dispatchEvent(new Event('prequel-theme')); render(root);
  });
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
    '<div class="lbl">Weights in</div>' + // v71: kg or lb, for lifts and body weight
    '<div class="seg3 two">' + [['kg', 'kg · kilograms'], ['lb', 'lb · pounds']].map(o => '<button type="button" data-wunit="' + o[0] + '" aria-pressed="' + (wu() === o[0]) + '">' + o[1] + '</button>').join('') + '</div>' +
    '<div class="lbl">Look</div>' +
    '<div class="seg3">' + [['light', 'Light'], ['dark', 'Cosy dark'], ['auto', 'Match my phone']].map(o => '<button type="button" data-look="' + o[0] + '" aria-pressed="' + ((s.theme || 'light') === o[0]) + '">' + o[1] + '</button>').join('') + '</div>' +
    '<div class="lbl">Your data</div>' +
    (undoInfo() ? '<div class="card undocard"><b>Your data from before the restore is safe</b><p class="muted" style="font-size:14px;margin:0">When you restored a backup on ' + esc(words(undoInfo().at)) + ', Prequel stored the app\'s data from just before, just in case. Want to undo the restore and put it back? This copy stays until ' + esc(words(undoInfo().until)) + '.</p><button type="button" class="btn alt" data-undo>Undo the restore…</button></div>' : '') +
    (backupDue() ? '<div class="card nudgecard"><b>It\'s been a while since your last backup.</b><p class="muted" style="font-size:14px;margin:0">No rush. Whenever you\'ve got a minute, it keeps everything safe.</p></div>' : '') +
    '<div class="card"><p class="muted" style="font-size:14px;line-height:1.45;margin:0">Everything lives only on this phone. Save a backup now and then (to Files or iCloud Drive), especially before changing phones.</p><p class="muted" style="font-size:12px;margin:0" id="persist"></p>' +
      '<div class="grid2"><button type="button" class="btn" data-export>Save a backup</button><button type="button" class="btn alt" data-import>Restore</button></div><input type="file" id="importFile" accept="application/json,.json" hidden>' +
      '<p class="muted" style="font-size:12px;margin:0">' + (st.lastBackup ? 'Last backup: ' + new Date(st.lastBackup).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No backup saved yet.') + '</p></div>' +
    '<div class="lbl">About</div>' +
    '<button type="button" class="rowlink" data-news style="width:100%"><span>What\'s new<small class="rowsub">Every update, in plain words · this is version ' + LATEST + '</small></span><b>›</b></button>' +
    '<div class="lbl">Reset</div>' +
    '<div class="card"><b>Start fresh</b><p class="muted" style="font-size:13px;margin:0">Clears everything in the app and takes it back to day one. It asks twice, and offers a backup first.</p><button type="button" class="btn danger wide" data-fresh>Start fresh…</button></div>' +
    nav('me');
  isPersisted().then(p => { const el = root.querySelector('#persist'); if (el) el.textContent = p ? 'This phone has promised to keep your data.' : 'Tip: adding the app to your home screen helps the phone keep your data.'; });
}
