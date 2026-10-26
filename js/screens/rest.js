import { get, save, uid, addMoment, removeById, dateKey, parseKey, today, addDays } from '../store.js';
import { FEELS, feelLabel } from '../data.js';
import { openSleepDiary } from '../reports.js';
import { esc, nav, backLink, dateChip, logDate, him, timeOf, hm, prettyDate, toast, openSheet, closeSheet, reduceMotion } from '../ui.js';

export function mount(root) {
  render(root);
  root.addEventListener('click', e => {
    const t = e.target, st = get(); let b;
    if (t.closest('[data-sleep]')) { st.pendingSleep = Date.now(); save(); toast('Sleep well. Tap "Woke up" when you\'re up.'); render(root); return; }
    if (t.closest('[data-cancelsleep]')) { st.pendingSleep = null; save(); render(root); return; }
    if (t.closest('[data-wake]')) {
      if (st.pendingSleep) askFeel(root, st.pendingSleep, Date.now());
      else openManual(root, Date.now());
      return;
    }
    if (t.closest('[data-manual]')) { openManual(root, null); return; }
    // awake for a bit (v42): one tap when you're up in the night, one when you head back to sleep
    if (t.closest('[data-awakestart]')) { st.awakeSince = Date.now(); save(); toast('Okay. I\'ll keep the lamp on.'); render(root); return; }
    if (t.closest('[data-awakecancel]')) { st.awakeSince = null; save(); render(root); return; }
    if (t.closest('[data-awakeend]')) { backToSleep(root, Date.now()); return; }
    if (t.closest('[data-breathe]')) { breathe(); return; }
    if (t.closest('[data-putdown]')) { putDown(); return; }
    if (t.closest('[data-docnote]')) { doctorNotes(root); return; }
    if ((b = t.closest('[data-del]'))) { removeById('rests', b.dataset.del); render(root); return; }
    if (t.closest('[data-diary]')) { openSleepDiary(); }
  });
}

function addRest(start, end, feel, words) {
  const st = get();
  const rest = { id: uid(), date: dateKey(end), start, end, feel };
  if (words) rest.words = words;
  st.rests.push(rest); st.pendingSleep = null;
  const mins = Math.round((end - start) / 60000);
  addMoment('rest', 'Rested ' + hm(mins) + (feel ? ', felt ' + feel_(feel) : ''), rest.date, { ref: rest.id });
  save();
  const parts = st.rests.filter(r => r.date === rest.date).length;
  toast(parts > 1 ? 'Another piece of rest. ' + parts + ' parts today, all of it counts.' : 'Rest logged. A new quilt patch.');
}

const feel_ = k => feelLabel(k).toLowerCase();
// six ways to say how you woke up, plus a quiet "in your own words" that only opens if you want it (v45)
const feelsHtml = sel => '<div class="seg feels" id="feelSeg">' + FEELS.map(f => '<button type="button" data-f="' + f[0] + '" aria-pressed="' + (f[0] === sel) + '">' + f[1] + '</button>').join('') + '</div>' +
  '<button type="button" class="ownwords" data-ownwords>+ In your own words</button><input id="fWords" type="text" maxlength="60" placeholder="A few words, if you like" hidden>';
const wordsOf = () => { const w = document.getElementById('fWords'); return w && !w.hidden ? w.value.trim() : ''; };
const openWords = () => { const w = document.getElementById('fWords'); w.hidden = false; document.querySelector('[data-ownwords]').hidden = true; w.focus(); };

function askFeel(root, start, end) {
  // one tap on a word saves it, like before. Opening "your own words" turns the tap into a choice, then Save.
  let feel = '';
  openSheet('<h2>Morning. How did you wake up?</h2><p class="muted">' + timeOf(start) + ' to ' + timeOf(end) + ' · ' + hm(Math.round((end - start) / 60000)) + '</p>' +
    feelsHtml('') + '<button type="button" class="btn" data-savefeel hidden>Save</button>' +
    '<button type="button" class="btn ghost" data-skipfeel>Skip</button>', ev => {
    const t = ev.target; let b;
    if (t.closest('[data-ownwords]')) { openWords(); document.querySelector('[data-savefeel]').hidden = false; return; }
    if ((b = t.closest('[data-f]'))) {
      feel = b.dataset.f;
      if (document.getElementById('fWords').hidden) { addRest(start, end, feel); closeSheet(); render(root); return; }
      document.querySelectorAll('#feelSeg [data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return;
    }
    if (t.closest('[data-savefeel]')) { addRest(start, end, feel, wordsOf()); closeSheet(); render(root); return; }
    if (t.closest('[data-skipfeel]')) { addRest(start, end, ''); closeSheet(); render(root); }
  });
}

function openManual(root, endTs) {
  const end = endTs ? new Date(endTs) : null;
  const wake = end ? dateKey(end) : logDate();
  const pad = n => String(n).padStart(2, '0');
  const endVal = end ? pad(end.getHours()) + ':' + pad(end.getMinutes()) : '07:00';
  let feel = 'okay';
  openSheet('<h2>Add a rest</h2><p class="muted">For a forgotten night, a nap, or the second half of a split night.</p>' +
    '<label class="field-label" for="rDate">DAY YOU WOKE UP</label><input id="rDate" type="date" max="' + today() + '" value="' + wake + '">' +
    '<div class="grid2"><div><label class="field-label" for="rFrom">FELL ASLEEP</label><input id="rFrom" type="time" value="00:00"></div><div><label class="field-label" for="rTo">WOKE UP</label><input id="rTo" type="time" value="' + endVal + '"></div></div>' +
    '<div class="lbl">How did you wake up</div>' + feelsHtml(feel) +
    '<button type="button" class="btn" data-add>Add it</button><button type="button" class="btn alt" data-close>Cancel</button>', ev => {
    const t = ev.target; let b;
    if (t.closest('[data-ownwords]')) { openWords(); return; }
    if ((b = t.closest('[data-f]'))) { feel = b.dataset.f; document.querySelectorAll('#feelSeg [data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
    if (!t.closest('[data-add]')) return;
    const d = document.getElementById('rDate').value, from = document.getElementById('rFrom').value, to = document.getElementById('rTo').value;
    if (!d || !from || !to) return;
    const [y, m, dd] = d.split('-').map(Number);
    const endD = new Date(y, m - 1, dd, ...to.split(':').map(Number));
    let startD = new Date(y, m - 1, dd, ...from.split(':').map(Number));
    if (startD >= endD) startD = new Date(startD.getTime() - 86400000); // fell asleep the evening before
    if (d > today() || endD.getTime() > Date.now()) { toast('That wake-up hasn\'t happened yet.'); return; }
    addRest(startD.getTime(), endD.getTime(), feel, wordsOf()); closeSheet(); render(root);
  });
}

// ---------- awake in the night (v45): back to sleep, breathe, or put a thought down. Never asked, always offered. ----------
function backToSleep(root, end) {
  const from = get().awakeSince, mins = Math.max(1, Math.round((end - from) / 60000));
  openSheet('<h2>Back to sleep</h2><p class="muted">Awake for ' + hm(mins) + ', from ' + timeOf(from) + '.</p>' +
    '<label class="field-label" for="wokeTxt">WHAT WOKE YOU? · ONLY IF YOU WANT</label><textarea id="wokeTxt" rows="2" maxlength="200"></textarea>' +
    '<button type="button" class="btn" data-goodnight>Goodnight</button>', ev => {
    if (!ev.target.closest('[data-goodnight]')) return;
    const st = get(); if (!st.awakeSince) { closeSheet(); return; }
    const woke = document.getElementById('wokeTxt').value.trim();
    addMoment('rest', 'Awake in the night: ' + hm(mins) + ' from ' + timeOf(from), today(), woke ? { woke } : {}); // the day it happened, never a future one
    st.awakeSince = null; save(); closeSheet(); toast('Noted. Sleep well.'); render(root);
  });
}

function putDown() {
  // a Mind note that comes back in the morning, so your head doesn't have to hold it tonight
  openSheet('<h2>Put it down for the morning</h2><p class="muted">Write it here and let it go for now. It\'ll be waiting for you in the morning.</p>' +
    '<textarea id="downTxt" rows="3" maxlength="500" aria-label="What\'s on your mind"></textarea>' +
    '<button type="button" class="btn" data-putit>Put it down</button>', ev => {
    if (!ev.target.closest('[data-putit]')) return;
    const text = document.getElementById('downTxt').value.trim(); if (!text) { closeSheet(); return; }
    const morning = new Date().getHours() >= 12 ? addDays(today(), 1) : today();
    get().mind.push({ id: uid(), text, remindOn: morning, created: Date.now(), letGo: null });
    save(); closeSheet(); toast('It\'s down. I\'ll hold it till morning.');
  });
}

function breathe() {
  // in for 4, out for 6, for as long as you like. With reduced motion the circle stays still and only the words change.
  const sheet = openSheet('<div class="breathe' + (reduceMotion ? ' still' : '') + '"><div class="bcircle"><span class="bword">Breathe in</span></div></div>' +
    '<p class="muted" style="text-align:center">In for 4, out for 6. Stay as long as you like.</p>' +
    '<button type="button" class="btn alt" data-close>I\'m okay now</button>');
  const box = sheet.querySelector('.breathe'), word = sheet.querySelector('.bword');
  let out = false;
  const step = () => {
    if (!box.isConnected) return;
    out = !out; box.classList.toggle('out', out); word.textContent = out ? 'And out' : 'Breathe in';
    setTimeout(step, out ? 6000 : 4000);
  };
  requestAnimationFrame(() => { box.classList.add('in'); setTimeout(step, 4000); });
}

// ---------- notes for your doctor (v45): plain text, stamped with the day and time, and in the sleep diary ----------
function doctorNotes(root) {
  const list = () => { const n = (get().doctorNotes || []).slice().sort((a, b) => b.ts - a.ts); return n.length ? '<div class="docnotes">' + n.map(x => '<div class="entry"><span><small>' + esc(prettyDate(x.date)) + ' · ' + timeOf(x.ts) + '</small>' + esc(x.text) + '</span><button type="button" class="x" data-delnote="' + x.id + '" aria-label="Remove this note">×</button></div>').join('') + '</div>' : ''; };
  const sheet = openSheet('<h2>Notes for your doctor</h2><p class="muted">Anything you want to remember to tell them. Each note keeps its day and time, and goes into your sleep diary.</p>' +
    '<textarea id="docTxt" rows="3" maxlength="1000" aria-label="Your note"></textarea><button type="button" class="btn" data-savenote>Save note</button><div id="docList">' + list() + '</div>' +
    '<button type="button" class="btn alt" data-close>Done</button>', ev => {
    const t = ev.target, st = get(); let b;
    if (t.closest('[data-savenote]')) {
      const box = document.getElementById('docTxt'), text = box.value.trim(); if (!text) return;
      (st.doctorNotes = st.doctorNotes || []).push({ id: uid(), date: today(), ts: Date.now(), text });
      save(); box.value = ''; sheet.querySelector('#docList').innerHTML = list(); toast('Saved for your doctor.'); render(root); return;
    }
    if ((b = t.closest('[data-delnote]'))) { st.doctorNotes = st.doctorNotes.filter(x => x.id !== b.dataset.delnote); save(); sheet.querySelector('#docList').innerHTML = list(); render(root); }
  });
}

// a 24-hour clock ring with one arc per rest
function ring(rests, date) {
  const R = 90, Cc = 2 * Math.PI * R;
  const dayStart = parseKey(date).getTime();
  const cols = ['#9FC0FF', '#F4C430', '#B9A6F2', '#8EE0B4'];
  // one arc from s hours (0 = 12am, at the top) for len hours, clockwise; round ends only where the rest really starts or ends
  const arc = (s, len, col, cap) => '<circle cx="115" cy="115" r="' + R + '" fill="none" stroke="' + col + '" stroke-width="18" stroke-linecap="' + cap + '" stroke-dasharray="' + (len / 24 * Cc).toFixed(1) + ' ' + Cc.toFixed(1) + '" stroke-dashoffset="' + (-(s / 24) * Cc).toFixed(1) + '" transform="rotate(-90 115 115)"></circle>';
  const arcs = rests.map((r, i) => {
    const s = ((r.start - dayStart) / 3600000 % 24 + 24) % 24, len = Math.min(23.9, (r.end - r.start) / 3600000), col = cols[i % cols.length];
    if (s + len <= 24) return arc(s, len, col, 'round');
    // v70: a night that goes past 12am is drawn in two pieces that meet at the top (the circle's path ends there, so one arc was cut off and showed just a dot)
    return arc(s, 24 - s, col, 'butt') + arc(0, s + len - 24, col, 'butt') + arc(s, 0.001, col, 'round') + arc((s + len) % 24, 0.001, col, 'round');
  }).join('');
  const total = rests.reduce((n, r) => n + (r.end - r.start) / 60000, 0);
  return '<svg width="230" height="230" viewBox="0 0 230 230" role="img" aria-label="Rest on this day: ' + hm(total) + '">' +
    '<circle cx="115" cy="115" r="' + R + '" fill="none" stroke="#2C3760" stroke-width="18"></circle>' + arcs +
    '<text x="115" y="14" text-anchor="middle" font-size="11" font-weight="700" fill="#C9D6FF" stroke="#141A33" stroke-width="3" paint-order="stroke">12am</text><text x="224" y="119" text-anchor="end" font-size="11" font-weight="700" fill="#C9D6FF" stroke="#141A33" stroke-width="3" paint-order="stroke">6am</text><text x="115" y="226" text-anchor="middle" font-size="11" font-weight="700" fill="#C9D6FF" stroke="#141A33" stroke-width="3" paint-order="stroke">12pm</text><text x="6" y="119" font-size="11" font-weight="700" fill="#C9D6FF" stroke="#141A33" stroke-width="3" paint-order="stroke">6pm</text>' +
    '<text x="115" y="110" text-anchor="middle" font-size="32" font-weight="800" fill="#F3EEDF">' + (total ? hm(total) : '–') + '</text>' +
    '<text x="115" y="134" text-anchor="middle" font-size="13" font-weight="700" fill="#C9D6FF">' + (rests.length > 1 ? 'rested, in ' + rests.length + ' parts' : rests.length ? 'rested' : 'nothing logged') + '</text></svg>';
}

function render(root) {
  const st = get(), date = logDate(), hour = new Date().getHours();
  const rests = st.rests.filter(r => r.date === date).sort((a, b) => a.start - b.start);
  const night = hour < 5 || hour >= 22, awakeTime = hour < 6 || hour >= 21;
  root.innerHTML =
    '<div class="top">' + backLink() + dateChip() + '</div>' +
    '<div class="night-hero">' + him(night ? 'nightwatch' : 'asleep', 'breathe', 'Your character resting') + '<p class="say">' + (night ? 'Awake too? I\'ll keep the lamp on.' : 'Rest counts in any shape. One piece or three.') + '</p></div>' +
    (st.pendingSleep
      ? '<div class="card"><p><b>Asleep since ' + timeOf(st.pendingSleep) + '</b></p><div class="sleepbtns"><button type="button" class="btn b2" data-wake>Woke up</button><button type="button" class="btn alt" data-cancelsleep>Cancel</button></div></div>'
      : '<div class="sleepbtns"><button type="button" class="btn b1" data-sleep>Going to sleep</button><button type="button" class="btn b2" data-wake>Woke up</button></div>') +
    '<div class="ring">' + ring(rests, date) + '</div>' +
    (rests.length ? '<div class="card">' + rests.map(r => '<div class="entry"><span class="t">' + timeOf(r.start) + '</span><span>to ' + timeOf(r.end) + ' · ' + hm(Math.round((r.end - r.start) / 60000)) + (r.feel ? ' · ' + esc(feel_(r.feel)) : '') + '</span><button type="button" class="x" data-del="' + r.id + '" aria-label="Remove this rest">×</button></div>').join('') + '</div>' : '') +
    '<button type="button" class="btn alt wide" data-manual>+ Add a rest by hand</button>' +
    '<a class="rowlink winddown" href="#/road?from=rest"><span>Wind down · a slow ride</span><b>›</b></a>' + // v68
    (() => { const p = new Set(st.rests.map(r => r.date)).size; return '<a class="rowlink" href="#/quilt?from=rest"><span>Your quilt' + (p ? ' · ' + p + (p === 1 ? ' patch' : ' patches') : '') + '</span><b>›</b></a>'; })() +
    // night only (9pm to 6am), or while it's running
    (st.awakeSince
      ? '<div class="card awakecard on"><div class="awaketop"><div><b>Awake since ' + timeOf(st.awakeSince) + '</b><small>No rush. I\'m right here.</small></div><button type="button" class="awakex" data-awakecancel>Cancel</button></div>' +
        '<button type="button" class="btn b1" data-awakeend>Back to sleep</button>' +
        '<div class="awakeextras"><button type="button" data-breathe>Breathe with me</button><button type="button" data-putdown>Put it down for the morning</button></div></div>'
      : (awakeTime && date === today() ? '<button type="button" class="awakecard" data-awakestart><span>🌙</span><div><b>Awake for a bit?</b><small>Tap now, and again when you head back to sleep.</small></div></button>' : '')) +
    (() => { const n = (st.doctorNotes || []).length; return '<div class="card"><div class="lbl">For your doctor</div><p class="muted" style="font-size:14px">Jot down what you want to tell them, and make a tidy PDF sleep diary to save or send.' + (n ? ' ' + n + (n === 1 ? ' note' : ' notes') + ' so far.' : '') + '</p><div class="docbtns"><button type="button" class="btn alt" data-docnote>' + (n ? 'Your notes' : 'Add a note') + '</button><button type="button" class="btn alt" data-diary>Make a sleep diary</button></div></div>'; })() +
    nav('home');
}
