// The Move hub (v48): "How's the body?" for everything, then one same-size tile per activity you do.
// Gym opens the gym page (move.js). Every other activity logs in one sheet, now or with a timer.
import { get, save, uid } from '../store.js';
import { esc, him, prettyDate, dateChip, logDate, openSheet, closeSheet, toast } from '../ui.js';
import { CATALOG, FEELS_MOVE, MINS, actDef, picked, logsOf, measures, logActivity, updateActivity, removeEntry, summary } from '../activities.js';
import { count, unitOf, checkFinished, openEditGoal, ensureGoals } from '../goals.js';
import { weights } from '../nutrition.js';
import { weightSheet } from '../weight.js';
import { openMoveReport } from '../reports.js';

// the milestone an activity has right now (gym's old "road to 100" is a sessions goal, so it counts too)
export function milestoneOf(id) {
  ensureGoals();
  return get().goals.find(g => g.kind === 'linked' && !g.finished && !g.paused && (g.source.startsWith('act:' + id + ':') || (id === 'gym' && g.source === 'sessions'))) || null;
}
const tileSub = id => {
  const st = get(), m = milestoneOf(id);
  if (m) return count(m) + ' of ' + m.target + ' ' + unitOf(m);
  if (id === 'gym') return st.active ? 'A workout is open' : st.sessions.length ? 'Session ' + (st.sessions.length + 1) + ' next' : 'Tap to start';
  const n = logsOf(id).length, d = actDef(id);
  return n ? n + ' ' + (d.unit === 'times' ? (n === 1 ? 'time' : 'times') : n === 1 ? d.unit.slice(0, -1) : d.unit) + ' so far' : 'Tap to log';
};
// newest day first, then the latest time on that day (some older sessions keep their time as text)
const newest = (a, b) => (b.date || '').localeCompare(a.date || '') || (Number(b.ts) || 0) - (Number(a.ts) || 0);
const order = () => { const p = picked(); return CATALOG.map(a => a.id).filter(id => p.includes(id)).concat(p.filter(id => !CATALOG.some(a => a.id === id))); };

// ---------- the hub ----------
export function hubHtml(lightsHtml) {
  const st = get();
  if (!st.moveSetup) return '<div class="top"><div class="lbl">Move</div>' + dateChip() + '</div>' + pickerHtml(true);
  const t = st.actTimer, td = t && actDef(t.type);
  const recent = (st.activities || []).map(a => ({ ts: a.ts, date: a.date, n: actDef(a.type).n })).concat(st.sessions.map(s => ({ ts: s.ts, date: s.date, n: 'Gym' }))).sort(newest).slice(0, 3);
  return '<div class="top"><div class="lbl">Move</div>' + dateChip() + '</div>' +
    (t ? '<div class="card acttimer"><span class="emo" aria-hidden="true">' + td.e + '</span><div><b>' + esc(td.n) + '</b><small id="acttime">' + timerText() + '</small></div><button type="button" class="btn" data-actstop>Stop</button><button type="button" class="awakex" data-actcancel>Cancel</button></div>' : '') +
    '<h1>How\'s the body?</h1>' + lightsHtml +
    '<div class="lbl">What did you get up to?</div>' +
    '<div class="acttiles">' + order().map(id => { const d = actDef(id); return '<button type="button" class="acttile" data-act="' + esc(id) + '"><span class="emo" aria-hidden="true">' + d.e + '</span><b>' + esc(d.n) + '</b><small>' + esc(tileSub(id)) + '</small></button>'; }).join('') + '</div>' +
    (() => { const w = weights().slice().sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts)[0]; return '<div class="grid2"><button type="button" class="rowlink" data-actsetup><span>Your activities</span><b>›</b></button><button type="button" class="rowlink" data-weight><span>Weight</span><b>' + (w ? w.kg + ' kg ›' : '+') + '</b></button></div>'; })() + // body weight, same log as Food (v57)
    '<div class="grid2"><a class="rowlink" href="#/journey?from=move"><span>Your moving journey</span><b>›</b></a><button type="button" class="rowlink" data-movereport><span>Move report</span><b>PDF ›</b></button></div>' + // v61, v67
    (recent.length ? '<button type="button" class="lately" data-lately><b>Lately</b> ' + recent.map(r => { const w = prettyDate(r.date); return esc(r.n) + ' ' + esc(/^(Today|Yesterday)$/.test(w) ? w.toLowerCase() : w); }).join(' · ') + ' ›</button>' : '');
}
const timerText = () => { const t = get().actTimer; if (!t) return ''; const m = Math.floor((Date.now() - t.start) / 60000); return m < 1 ? 'Just started' : (m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min') + ' so far'; };
export function hubTick(root) { const el = root.querySelector('#acttime'); if (el) el.textContent = timerText(); }

// ---------- choosing your activities: once, then any time from "Your activities" ----------
let pick = null, own = false, road = 'keep';
function pickerHtml(first) {
  const st = get();
  if (!pick) pick = new Set(st.moveSetup ? st.moveSetup.picked : (st.sessions.length || st.active ? ['gym'] : []));
  const custom = ((st.moveSetup || {}).custom) || {}, ms = first ? milestoneOf('gym') : null;
  return '<div class="card picker">' + (first ? '<div class="pickhead">' + him('cwalk', 'breathe', 'Your character, ready to move') + '<div><h2>What gets you moving?</h2><p class="muted">Pick everything you do. You can change it any time.</p></div></div>' : '<h2>Your activities</h2><p class="muted">Pick everything you do.</p>') +
    '<div class="pickgrid">' + CATALOG.map(a => [a.id, a.e, a.n]).concat(Object.keys(custom).map(k => [k, custom[k].e || '✨', custom[k].n])).map(a => '<button type="button" class="chip" data-pick="' + esc(a[0]) + '" aria-pressed="' + pick.has(a[0]) + '"><span aria-hidden="true">' + a[1] + '</span> ' + esc(a[2]) + '</button>').join('') +
      '<button type="button" class="chip" data-ownact aria-pressed="' + own + '">+ Your own</button></div>' +
    (own ? '<div class="ownact"><div class="grid2"><input id="oaName" type="text" maxlength="30" placeholder="What is it?" autocomplete="off"><input id="oaEmo" type="text" maxlength="4" placeholder="An emoji, if you like" autocomplete="off"></div>' +
      '<input id="oaUnit" type="text" maxlength="20" placeholder="Something to count? e.g. rounds (optional)" autocomplete="off"><button type="button" class="btn alt" data-oaadd>Add it</button></div>' : '') +
    (ms ? '<div class="roadq"><b>You were on the road to ' + ms.target + ' gym sessions.</b><span>Keep that milestone?</span><div class="chips"><button type="button" class="chip small" data-road="keep" aria-pressed="' + (road === 'keep') + '">Keep it</button><button type="button" class="chip small" data-road="change" aria-pressed="' + (road === 'change') + '">Change the number</button><button type="button" class="chip small" data-road="drop" aria-pressed="' + (road === 'drop') + '">No milestone</button></div>' +
      (road === 'change' ? '<input id="roadN" type="text" inputmode="numeric" placeholder="How many sessions?" value="' + ms.target + '">' : '') + '</div>' : '') +
    '<div class="err" id="pickErr"></div><button type="button" class="btn" data-picksave>' + (first ? 'That\'s me' : 'Save') + '</button>' + (first ? '' : '<button type="button" class="btn alt" data-close>Cancel</button>') + '</div>';
}

// ---------- logging one ----------
function logSheet(type, opts, done) {
  // opts.edit: change a log you already saved (v50); everything starts filled in
  const ed = opts && opts.edit, d = actDef(type), day = ed ? ed.date : (opts && opts.date) || logDate();
  const v = ed ? { mins: ed.mins || null, feel: ed.feel || '', f: Object.assign({}, ed.f || {}), hl: ed.hl || '', note: ed.note || '' } : { mins: opts && opts.mins ? opts.mins : null, feel: '', f: {} };
  const seg = (k, opts2) => '<div class="chips">' + opts2.map(o => '<button type="button" class="chip small" data-seg="' + k + '" data-v="' + esc(o) + '" aria-pressed="' + (v.f[k] === o) + '">' + esc(o) + '</button>').join('') + '</div>';
  const draw = () => '<h2><span aria-hidden="true">' + d.e + '</span> ' + esc(d.n) + '</h2><p class="muted">' + esc(prettyDate(day, { weekday: 'long', day: 'numeric', month: 'long' })) + '. Everything here is optional.</p>' +
    '<div class="lbl">How long</div><div class="chips">' + MINS.map(m => '<button type="button" class="chip small" data-mins="' + m + '" aria-pressed="' + (v.mins === m) + '">' + (m < 60 ? m + ' min' : m === 60 ? '1 hour' : '1½ hours') + '</button>').join('') + '</div>' +
    '<input id="alMins" type="text" inputmode="numeric" placeholder="Or type minutes" value="' + (v.mins && !MINS.includes(v.mins) ? v.mins : '') + '" aria-label="How many minutes">' +
    '<div class="lbl">How did it feel</div><div class="seg">' + FEELS_MOVE.map(f => '<button type="button" data-feel="' + f + '" aria-pressed="' + (v.feel === f) + '">' + f + '</button>').join('') + '</div>' +
    d.f.map(x => '<div class="lbl">' + esc(x.l) + '</div>' + (x.seg ? seg(x.k, x.seg) : '<input type="text" data-fld="' + x.k + '"' + (x.num ? ' inputmode="decimal" placeholder="' + esc(x.u) + '"' : ' placeholder="' + esc(x.text) + '"') + ' value="' + esc(v.f[x.k] || '') + '" aria-label="' + esc(x.l) + '">')).join('') +
    '<label class="field-label" for="alHl">HIGHLIGHT OF THE DAY</label><input id="alHl" type="text" maxlength="80" placeholder="' + esc(type === 'badminton' ? 'that cross-court smash…' : type === 'football' ? 'first goal in months…' : 'a moment you want to keep…') + '">' +
    '<label class="field-label" for="alNote">A NOTE</label><textarea id="alNote" rows="2" maxlength="500"></textarea>' +
    '<button type="button" class="btn" data-alsave>' + (ed ? 'Save changes' : 'Save') + '</button><button type="button" class="btn alt" data-close>Cancel</button>';
  const keep = sh => { sh.querySelectorAll('[data-fld]').forEach(i => { v.f[i.dataset.fld] = i.value.trim(); }); const m = sh.querySelector('#alMins'); if (m && m.value.trim()) v.mins = parseInt(m.value, 10) || null; v.hl = (sh.querySelector('#alHl') || {}).value; v.note = (sh.querySelector('#alNote') || {}).value; };
  const redraw = sh => { keep(sh); const s = sh.querySelector('.sheet'), y = s.scrollTop, hl = v.hl, note = v.note; s.innerHTML = draw(); s.querySelector('#alHl').value = hl || ''; s.querySelector('#alNote').value = note || ''; s.scrollTop = y; };
  const sheet = openSheet(draw(), ev => {
    const t = ev.target; let b;
    if ((b = t.closest('[data-mins]'))) { keep(sheet); const m = Number(b.dataset.mins); v.mins = v.mins === m ? null : m; sheet.querySelector('#alMins').value = ''; redraw(sheet); return; }
    if ((b = t.closest('[data-feel]'))) { keep(sheet); v.feel = v.feel === b.dataset.feel ? '' : b.dataset.feel; redraw(sheet); return; }
    if ((b = t.closest('[data-seg]'))) { keep(sheet); v.f[b.dataset.seg] = v.f[b.dataset.seg] === b.dataset.v ? '' : b.dataset.v; redraw(sheet); return; }
    if (!t.closest('[data-alsave]')) return;
    keep(sheet);
    const f = {}; d.f.forEach(x => { const val = v.f[x.k]; if (val == null || val === '') return; if (x.num) { const n = parseFloat(String(val).replace(',', '.')); if (n > 0) f[x.k] = Math.round(n * 100) / 100; } else f[x.k] = val; });
    const data = { f }; if (v.mins > 0) data.mins = v.mins; if (v.feel) data.feel = v.feel; if (v.hl && v.hl.trim()) data.hl = v.hl.trim(); if (v.note && v.note.trim()) data.note = v.note.trim();
    if (ed) { updateActivity(ed.id, data); closeSheet(); toast('Saved.'); if (done) done(); checkFinished(); return; }
    logActivity(type, day, data);
    closeSheet(); toast(d.n + ' logged.' + (data.mins ? ' ' + data.mins + ' minutes of moving.' : ' It counts.'));
    if (done) done(); checkFinished();
  });
  if (ed) { sheet.querySelector('#alHl').value = v.hl; sheet.querySelector('#alNote').value = v.note; }
}

// ---------- one log you already saved (v50): see it, change it, or remove it, right here on Move ----------
export function entrySheet(id, done) {
  const a = (get().activities || []).find(x => x.id === id); if (!a) return;
  const d = actDef(a.type);
  openSheet('<h2><span aria-hidden="true">' + d.e + '</span> ' + esc(d.n) + '</h2><p class="muted" style="margin:0">' + esc(prettyDate(a.date, { weekday: 'long', day: 'numeric', month: 'long' })) + '</p>' +
    (summary(a) ? '<p style="margin:0;font-weight:700">' + esc(summary(a)) + '</p>' : '') +
    (a.hl ? '<p class="say" style="margin:0">“' + esc(a.hl) + '”</p>' : '') + (a.note ? '<p class="muted" style="margin:0;white-space:pre-wrap">' + esc(a.note) + '</p>' : '') +
    '<div class="actbtns"><button type="button" class="btn alt" data-o="edit">Edit</button><button type="button" class="btn danger" data-o="rm">Remove</button></div>' +
    '<button type="button" class="btn ghost" data-close>Close</button>', ev => {
    const o = ev.target.closest('[data-o]'); if (!o) return;
    if (o.dataset.o === 'edit') { closeSheet(); logSheet(a.type, { edit: a }, done); return; }
    if (!o.dataset.armed) { o.dataset.armed = '1'; o.textContent = 'Sure? Tap again'; return; }
    removeEntry('activities', a.id); closeSheet(); toast('Removed.'); if (done) done();
  });
}

// ---------- a milestone for one activity ----------
export function milestoneSheet(id, done) {
  const m = milestoneOf(id); if (m) { openEditGoal(m.id, done); return; }
  const d = actDef(id), list = measures(id); let pickM = list[0][0];
  const draw = msg => '<h2>A milestone for ' + esc(d.n.toLowerCase()) + '</h2><p class="muted">Something to count up to. It never resets, and there\'s no deadline.</p>' +
    '<div class="lbl">Count</div><div class="chips">' + list.map(x => '<button type="button" class="chip small" data-meas="' + x[0] + '" aria-pressed="' + (pickM === x[0]) + '">' + esc(x[1]) + '</button>').join('') + '</div>' +
    '<label class="field-label" for="msN">HOW MANY ' + esc((list.find(x => x[0] === pickM) || list[0])[2].toUpperCase()) + '?</label><input id="msN" type="text" inputmode="decimal" placeholder="e.g. 20">' +
    '<div class="err">' + (msg || '') + '</div><button type="button" class="btn" data-mssave>Save milestone</button><button type="button" class="btn alt" data-close>Cancel</button>';
  const sheet = openSheet(draw(), ev => {
    const t = ev.target; let b;
    if ((b = t.closest('[data-meas]'))) { const n = sheet.querySelector('#msN').value; pickM = b.dataset.meas; sheet.querySelector('.sheet').innerHTML = draw(); sheet.querySelector('#msN').value = n; return; }
    if (!t.closest('[data-mssave]')) return;
    const n = Math.round(parseFloat(sheet.querySelector('#msN').value.replace(',', '.')) * 10) / 10;
    if (!(n > 0)) { const v = sheet.querySelector('#msN').value; sheet.querySelector('.sheet').innerHTML = draw('Pick a number to count up to.'); sheet.querySelector('#msN').value = v; return; }
    const ms = list.find(x => x[0] === pickM);
    get().goals.push({ id: uid(), kind: 'linked', source: id === 'gym' && pickM === 'sessions' ? 'sessions' : 'act:' + id + ':' + pickM, name: d.n + ' · ' + ms[1].toLowerCase(), target: n, from: 0, created: Date.now(), finished: null });
    save(); closeSheet(); toast('A milestone. No rush.'); if (done) done(); checkFinished();
  });
}

// one activity's little menu: start a timer, log one, its milestone, and the last time
function actSheet(id, done) {
  const st = get(), d = actDef(id), last = logsOf(id).sort(newest)[0], m = milestoneOf(id), t = st.actTimer;
  openSheet('<h2><span aria-hidden="true">' + d.e + '</span> ' + esc(d.n) + '</h2>' +
    (last ? '<div class="lbl">Recent · tap one to change or remove it</div><div class="actrecent">' + logsOf(id).sort(newest).slice(0, 5).map(a => '<button type="button" class="mgrow" data-entry="' + a.id + '"><span>' + esc(prettyDate(a.date)) + '<small>' + esc(summary(a) || 'logged') + (a.hl ? ' · “' + esc(a.hl) + '”' : '') + '</small></span><b aria-hidden="true">›</b></button>').join('') + '</div>' : '') +
    '<div class="actbtns"><button type="button" class="btn" data-o="start"' + (t ? ' disabled' : '') + '>Start now</button><button type="button" class="btn alt" data-o="log">Log one I did</button></div>' +
    (t ? '<p class="muted" style="font-size:13px;margin:0">A timer is already running for ' + esc(actDef(t.type).n.toLowerCase()) + '.</p>' : '<p class="muted" style="font-size:13px;margin:0">Start now runs a timer, even if you close the app. Stop it when you\'re done.</p>') +
    '<button type="button" class="rowlink" data-o="mile" style="width:100%"><span>' + (m ? 'Milestone: ' + count(m) + ' of ' + m.target + ' ' + esc(unitOf(m)) : 'Set a milestone') + '</span><b>›</b></button>' +
    '<button type="button" class="btn ghost" data-close>Close</button>', ev => {
    const en = ev.target.closest('[data-entry]'); if (en) { closeSheet(); entrySheet(en.dataset.entry, done); return; }
    const o = ev.target.closest('[data-o]'); if (!o || o.disabled) return;
    if (o.dataset.o === 'start') { st.actTimer = { type: id, start: Date.now(), date: logDate() }; save(); closeSheet(); toast('Timer on. Enjoy it.'); done(); return; }
    if (o.dataset.o === 'log') { closeSheet(); logSheet(id, null, done); return; }
    if (o.dataset.o === 'mile') { closeSheet(); milestoneSheet(id, done); }
  });
}

function latelySheet(done, openSession) {
  const st = get();
  const items = (st.activities || []).map(a => ({ k: 'a:' + a.id, ts: a.ts, date: a.date, t: actDef(a.type).e + ' ' + actDef(a.type).n, s: summary(a), hl: a.hl })).concat(st.sessions.map(s => ({ k: 's:' + s.id, ts: s.ts, date: s.date, t: '🏋️ ' + s.workoutName, s: s.noReps ? s.exercises.length + ' exercises' : s.exercises.reduce((n, x) => n + x.sets.length, 0) + ' sets' }))).sort(newest).slice(0, 30);
  openSheet('<h2>Lately</h2><p class="muted" style="margin:0">Tap one to see it, change it or remove it.</p><div class="latelylist">' + items.map(i => '<button type="button" class="entry" data-lt="' + i.k + '"><span><small>' + esc(prettyDate(i.date)) + '</small><b>' + esc(i.t) + '</b>' + (i.s ? ' · ' + esc(i.s) : '') + (i.hl ? '<br><i>“' + esc(i.hl) + '”</i>' : '') + '</span><b aria-hidden="true">›</b></button>').join('') + '</div><button type="button" class="btn alt" data-close>Close</button>', ev => {
    const b = ev.target.closest('[data-lt]'); if (!b) return;
    const [kind, id] = b.dataset.lt.split(':'); closeSheet();
    if (kind === 'a') entrySheet(id, done); else if (openSession) openSession(id);
  });
}

// ---------- clicks on the hub; returns true when it handled one ----------
export function hubClick(e, root, rerender, openGym, openSession) {
  const t = e.target, st = get(); let b;
  if ((b = t.closest('[data-pick]'))) { const k = b.dataset.pick; pick.has(k) ? pick.delete(k) : pick.add(k); b.setAttribute('aria-pressed', String(pick.has(k))); return true; }
  if (t.closest('[data-ownact]')) { own = !own; redrawPicker(root); return true; }
  if ((b = t.closest('[data-road]'))) { road = b.dataset.road; redrawPicker(root); return true; }
  if (t.closest('[data-oaadd]')) {
    const box = t.closest('.picker'), n = box.querySelector('#oaName').value.trim(); if (!n) { box.querySelector('#oaName').focus(); return true; }
    const id = 'c' + uid(); customDraft[id] = { n, e: box.querySelector('#oaEmo').value.trim() || '✨', unit: box.querySelector('#oaUnit').value.trim().toLowerCase() };
    pick.add(id); own = false; redrawPicker(root); return true;
  }
  if (t.closest('[data-picksave]')) {
    const box = t.closest('.picker'), err = box.querySelector('#pickErr');
    if (!pick.size) { err.textContent = 'Pick at least one, even just a walk.'; return true; }
    const ms = milestoneOf('gym');
    if (ms && box.querySelector('[data-road]')) {
      if (road === 'drop') st.goals = st.goals.filter(g => g !== ms);
      if (road === 'change') { const n = parseInt((box.querySelector('#roadN') || {}).value, 10); if (!(n > 0)) { err.textContent = 'Type how many sessions.'; return true; } ms.target = n; }
    }
    const custom = Object.assign({}, (st.moveSetup || {}).custom || {}, customDraft);
    st.moveSetup = { picked: [...pick], custom }; save();
    pick = null; own = false; road = 'keep'; for (const k in customDraft) delete customDraft[k];
    if (document.getElementById('sheet')) closeSheet();
    rerender(); checkFinished(); return true;
  }
  if (t.closest('[data-actsetup]')) {
    pick = new Set(picked()); own = false;
    openSheet(pickerHtml(false), ev => { hubClick(ev, document.getElementById('sheet'), rerender, openGym, openSession); });
    return true;
  }
  if ((b = t.closest('[data-act]'))) { const id = b.dataset.act; if (id === 'gym') openGym(); else actSheet(id, rerender); return true; }
  if (t.closest('[data-actstop]')) {
    const tm = st.actTimer; if (!tm) return true;
    const mins = Math.max(1, Math.round((Date.now() - tm.start) / 60000));
    logSheet(tm.type, { mins, date: tm.date }, () => { get().actTimer = null; save(); rerender(); });
    return true;
  }
  if ((b = t.closest('[data-actcancel]'))) {
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Sure? Tap again'; return true; }
    st.actTimer = null; save(); rerender(); return true;
  }
  if (t.closest('[data-lately]')) { latelySheet(rerender, openSession); return true; }
  if (t.closest('[data-weight]')) { weightSheet(rerender); return true; }
  if (t.closest('[data-movereport]')) { openMoveReport(); return true; }
  return false;
}
const customDraft = {};
function redrawPicker(root) {
  const box = (root.querySelector ? root : document).querySelector('.picker'); if (!box) return;
  const first = !get().moveSetup && !document.getElementById('sheet');
  const keepVals = ['oaName', 'oaEmo', 'oaUnit', 'roadN'].map(k => [k, (box.querySelector('#' + k) || {}).value]);
  const tmp = document.createElement('div'); tmp.innerHTML = pickerHtmlWithDrafts(first); box.replaceWith(tmp.firstChild);
  keepVals.forEach(([k, v]) => { const el = document.getElementById(k); if (el && v != null) el.value = v; });
}
// the picker, including your own activities added but not saved yet
function pickerHtmlWithDrafts(first) {
  const st = get(), had = st.moveSetup;
  if (!Object.keys(customDraft).length) return pickerHtml(first);
  st.moveSetup = { picked: [...pick], custom: Object.assign({}, (had || {}).custom || {}, customDraft) };
  const html = pickerHtml(first); st.moveSetup = had; return html;
}
