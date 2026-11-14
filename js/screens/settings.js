// Settings: everything that isn't about you. Your name and words, the look, your data, starting fresh.
import { get, save, exportJSON, isPersisted, today, reset, backupDue, dateKey, checkBackup, BACKUP_PROBLEMS, restoreBackup, hasData, undoInfo, undoRestore } from '../store.js';
import { esc, nav, backLink, toast, openSheet, closeSheet, downloadFile, him } from '../ui.js';
import { dayDate, clock } from '../pdf.js';
import { NEWS, LATEST, openNews } from '../news.js';
import { wu, setUnit, askLb } from '../units.js';
import { OPTIONAL } from './days.js';
import { AREAS, on, setOn } from '../features.js';

export function mount(root) {
  render(root);
  root.addEventListener('click', e => {
    const t = e.target; let b;
    if (t.closest('[data-export]')) { backup(root); return; }
    if (t.closest('[data-fresh]')) { startFresh(root); return; }
    if ((b = t.closest('[data-wunit]'))) { if (b.dataset.wunit !== wu()) { setUnit(b.dataset.wunit); render(root); if (!askLb()) toast('Weights are now in ' + (wu() === 'lb' ? 'pounds' : 'kilograms') + '.'); } return; }
    if (t.closest('[data-areas]')) { areasSheet(root); return; } // v106: the eight areas live in a sheet
    if ((b = t.closest('[data-dtab]'))) { const s = get().settings, k = b.dataset.dtab; s.dayTabs = s.dayTabs || []; s.dayTabs = s.dayTabs.includes(k) ? s.dayTabs.filter(x => x !== k) : s.dayTabs.concat(k); save(); render(root); toast(s.dayTabs.includes(k) ? 'It\'s on Days now.' : 'Taken off Days. Nothing you logged is lost.'); return; } // v96
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

// ---------- v106: the page, redesigned (B1): a hello, your backup up top, Make it yours behind one card ----------
const ICON = {
  food: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3M16 7c0-1.5 1-2 1-3"/>',
  move: '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
  rest: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  mind: '<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4"/>',
  weather: '<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 18z"/>',
  wins: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  goals: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  wall: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'
};
const TINT = { food: '#E5893D', move: '#1F55D0', rest: '#C99A00', mind: '#3E9E6E', weather: '#4F8FC0', wins: '#D6698C', goals: '#7A5BC7', wall: '#E2402F', shield: '#3E9E6E' };
const ico = (k, off) => '<span class="sico' + (off ? ' offi' : '') + '" style="--c:' + TINT[k] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg></span>';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dm = ts => { const d = new Date(ts); return d.getDate() + ' ' + MONTHS[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); };

function areaTiles() {
  return '<div class="atiles">' + AREAS.map(a => { const yes = on(a[0]); return '<button type="button" class="atile' + (yes ? '' : ' off') + '" data-area="' + a[0] + '" aria-pressed="' + yes + '">' + ico(a[0], !yes) + '<b>' + esc(a[1]) + '</b><small>' + esc(a[2].replace(/\.$/, '')) + '</small><span class="ck">' + (yes ? '✓' : 'Off') + '</span></button>'; }).join('') + '</div>';
}
function areasSheet(root) {
  const draw = () => '<div class="areasheet"><h2>Make it yours</h2><p class="muted" style="margin:0;font-size:14px">Tap to switch an area off. It\'s only hidden, never deleted: switch it back on and everything is still there.</p>' + areaTiles() + '<button type="button" class="btn" data-close>Done</button></div>';
  const sheet = openSheet(draw(), ev => {
    const b = ev.target.closest('[data-area]'); if (!b) return;
    const k = b.dataset.area, yes = !on(k); setOn(k, yes);
    sheet.querySelector('.sheet').innerHTML = draw(); render(root);
    const a = AREAS.find(x => x[0] === k); toast(yes ? a[1] + ' is back, with everything you had.' : a[1] + ' is hidden. Nothing is deleted.');
  });
}

function render(root) {
  const st = get(), s = st.settings;
  const off = AREAS.filter(a => !on(a[0]));
  const due = backupDue();
  root.innerHTML =
    '<div class="top">' + backLink('#/me', 'Me') + '</div>' +
    '<h1>Settings</h1>' +
    '<button type="button" class="hiya" data-words>' + him('waving', '', 'Your character waving') + '<span class="ht"><span class="hh">' + (s.name ? 'Hi, ' + esc(s.name) : 'Hi there') + '</span><small>' + (s.name ? 'He calls you ' + esc(s.name) : 'Tell him what to call you') + '</small><span class="hl">Your name, kind words and tiny wins ›</span></span></button>' +
    (undoInfo() ? '<div class="card undocard"><b>Your data from before the restore is safe</b><p class="muted" style="font-size:14px;margin:0">When you restored a backup on ' + esc(words(undoInfo().at)) + ', Prequel stored the app\'s data from just before, just in case. Want to undo the restore and put it back? This copy stays until ' + esc(words(undoInfo().until)) + '.</p><button type="button" class="btn alt" data-undo>Undo the restore…</button></div>' : '') +
    // your backup, up top: everything lives only on this phone
    '<div class="safe' + (st.lastBackup && !due ? '' : ' due') + '">' + ico('shield') + '<span class="st"><b>' + (st.lastBackup ? 'Backed up ' + esc(dm(st.lastBackup)) : 'No backup saved yet') + '</b><small>' + (due && st.lastBackup ? 'It\'s been a while. No rush, whenever you\'ve a minute.' : 'Everything lives only on this phone') + '</small></span><button type="button" class="btn" data-export>Save</button></div>' +
    '<p class="muted persist" id="persist"></p>' +
    '<div class="slbl">Areas of the app</div>' +
    '<button type="button" class="micard" data-areas><span class="mitop"><span class="st"><b>Make it yours</b><small>' + (off.length ? (AREAS.length - off.length) + ' of ' + AREAS.length + ' areas on · ' + esc(off.map(a => a[1]).join(', ')) + (off.length === 1 ? ' is off' : ' are off') : 'All ' + AREAS.length + ' areas are on') + '</small></span><span class="sgo" aria-hidden="true">›</span></span>' +
      '<span class="mistrip">' + AREAS.map(a => ico(a[0], !on(a[0]))).join('') + '</span></button>' +
    // v96: the optional Days tabs (also on Days under + More)
    '<div class="slbl">Extra tabs on Days</div>' +
    '<div class="tchips">' + OPTIONAL.filter(o => o[0] === 'win' ? on('wins') : o[0] === 'weather' ? on('weather') : true).map(o => { const shown = (s.dayTabs || []).includes(o[0]); return '<button type="button" class="tchip' + (shown ? ' on' : '') + '" data-dtab="' + o[0] + '" aria-pressed="' + shown + '">' + (shown ? '✓ ' : '+ ') + esc(o[1]) + '</button>'; }).join('') + '</div>' +
    (OPTIONAL.some(o => o[0] === 'cycle') ? '<p class="shint">Cycle is a private period tracker, just for you.</p>' : '') +
    '<div class="slbl">Look</div>' +
    '<div class="looks">' + [['light', 'Light', 'l'], ['dark', 'Cosy dark', 'd'], ['auto', 'Match my phone', 'a']].map(o => '<button type="button" class="lk" data-look="' + o[0] + '" aria-pressed="' + ((s.theme || 'light') === o[0]) + '"><span class="' + o[2] + '" aria-hidden="true"><i></i><i></i><i></i></span>' + o[1] + '</button>').join('') + '</div>' +
    '<div class="slbl">Weights in</div>' + // v71: kg or lb, for lifts and body weight
    '<div class="sseg">' + [['kg', 'kg · kilograms'], ['lb', 'lb · pounds']].map(o => '<button type="button" data-wunit="' + o[0] + '" aria-pressed="' + (wu() === o[0]) + '">' + o[1] + '</button>').join('') + '</div>' +
    '<div class="slbl">More</div>' +
    '<div class="sgroup"><button type="button" class="srow" data-import><span class="st"><b>Restore a backup</b><small>From a file you saved before</small></span><span class="sgo" aria-hidden="true">›</span></button>' +
      '<button type="button" class="srow" data-news><span class="st"><b>What\'s new</b><small>Every update, in plain words · this is version ' + LATEST + '</small></span><span class="sgo" aria-hidden="true">›</span></button></div>' +
    '<input type="file" id="importFile" accept="application/json,.json" hidden>' +
    '<button type="button" class="sfresh" data-fresh>Start fresh…<small>Clears everything, after asking twice and offering a backup</small></button>' +
    nav('me');
  isPersisted().then(p => { const el = root.querySelector('#persist'); if (el) el.textContent = p ? '' : 'Tip: adding the app to your home screen helps the phone keep your data.'; });
}
