import { get, save, uid, addMoment, removeById, dateKey, parseKey } from '../store.js';
import { FEELS, NIGHT_THINGS } from '../data.js';
import { esc, nav, backLink, dateChip, logDate, him, timeOf, hm, prettyDate, toast, openSheet, closeSheet, downloadFile } from '../ui.js';

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
    if ((b = t.closest('[data-awake]'))) { addMoment('rest', 'Awake in the night: ' + b.dataset.awake.toLowerCase(), logDate()); toast('Noted. Night hours count too.'); render(root); return; }
    if ((b = t.closest('[data-del]'))) { removeById('rests', b.dataset.del); render(root); return; }
    if (t.closest('[data-diary]')) { exportDiary(); }
  });
}

function addRest(start, end, feel) {
  const st = get();
  const rest = { id: uid(), date: dateKey(end), start, end, feel };
  st.rests.push(rest); st.pendingSleep = null;
  const mins = Math.round((end - start) / 60000);
  addMoment('rest', 'Rested ' + hm(mins) + (feel ? ', felt ' + feel : ''), rest.date, { ref: rest.id });
  save();
  const parts = st.rests.filter(r => r.date === rest.date).length;
  toast(parts > 1 ? 'Another piece of rest. ' + parts + ' parts today, all of it counts.' : 'Rest logged. A new quilt patch.');
}

function askFeel(root, start, end) {
  openSheet('<h2>Morning. How did it feel?</h2><p class="muted">' + timeOf(start) + ' to ' + timeOf(end) + ' · ' + hm(Math.round((end - start) / 60000)) + '</p>' +
    '<div class="seg">' + FEELS.map(f => '<button type="button" data-feel="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>' +
    '<button type="button" class="btn ghost" data-feel="">Skip</button>', ev => {
    const b = ev.target.closest('[data-feel]'); if (!b) return;
    addRest(start, end, b.dataset.feel); closeSheet(); render(root);
  });
}

function openManual(root, endTs) {
  const end = endTs ? new Date(endTs) : null;
  const wake = end ? dateKey(end) : logDate();
  const pad = n => String(n).padStart(2, '0');
  const endVal = end ? pad(end.getHours()) + ':' + pad(end.getMinutes()) : '07:00';
  let feel = 'okay';
  openSheet('<h2>Add a rest</h2><p class="muted">For a forgotten night, a nap, or the second half of a split night.</p>' +
    '<label class="field-label" for="rDate">DAY YOU WOKE UP</label><input id="rDate" type="date" value="' + wake + '">' +
    '<div class="grid2"><div><label class="field-label" for="rFrom">FELL ASLEEP</label><input id="rFrom" type="time" value="00:00"></div><div><label class="field-label" for="rTo">WOKE UP</label><input id="rTo" type="time" value="' + endVal + '"></div></div>' +
    '<div class="lbl">How did it feel</div><div class="seg" id="feelSeg">' + FEELS.map(f => '<button type="button" data-f="' + f[0] + '" aria-pressed="' + (f[0] === feel) + '">' + f[1] + '</button>').join('') + '</div>' +
    '<button type="button" class="btn" data-add>Add it</button><button type="button" class="btn alt" data-close>Cancel</button>', ev => {
    const t = ev.target; let b;
    if ((b = t.closest('[data-f]'))) { feel = b.dataset.f; document.querySelectorAll('#feelSeg [data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
    if (!t.closest('[data-add]')) return;
    const d = document.getElementById('rDate').value, from = document.getElementById('rFrom').value, to = document.getElementById('rTo').value;
    if (!d || !from || !to) return;
    const [y, m, dd] = d.split('-').map(Number);
    const endD = new Date(y, m - 1, dd, ...to.split(':').map(Number));
    let startD = new Date(y, m - 1, dd, ...from.split(':').map(Number));
    if (startD >= endD) startD = new Date(startD.getTime() - 86400000); // fell asleep the evening before
    addRest(startD.getTime(), endD.getTime(), feel); closeSheet(); render(root);
  });
}

function exportDiary() {
  const rows = [['Date woke', 'Fell asleep', 'Woke up', 'Hours', 'Felt']];
  get().rests.slice().sort((a, b) => a.start - b.start).forEach(r => {
    rows.push([r.date, new Date(r.start).toLocaleString('en-AU'), new Date(r.end).toLocaleString('en-AU'), ((r.end - r.start) / 3600000).toFixed(1), r.feel || '']);
  });
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  downloadFile('sleep-diary.csv', csv, 'text/csv');
}

// a 24-hour clock ring with one arc per rest
function ring(rests, date) {
  const R = 90, Cc = 2 * Math.PI * R;
  const dayStart = parseKey(date).getTime();
  const cols = ['#9FC0FF', '#F4C430', '#B9A6F2', '#8EE0B4'];
  const arcs = rests.map((r, i) => {
    const s = ((r.start - dayStart) / 3600000 % 24 + 24) % 24, len = Math.min(24, (r.end - r.start) / 3600000);
    return '<circle cx="115" cy="115" r="' + R + '" fill="none" stroke="' + cols[i % cols.length] + '" stroke-width="18" stroke-linecap="round" stroke-dasharray="' + (len / 24 * Cc).toFixed(1) + ' ' + Cc.toFixed(1) + '" stroke-dashoffset="' + (-(s / 24) * Cc).toFixed(1) + '" transform="rotate(-90 115 115)"></circle>';
  }).join('');
  const total = rests.reduce((n, r) => n + (r.end - r.start) / 60000, 0);
  return '<svg width="230" height="230" viewBox="0 0 230 230" role="img" aria-label="Rest on this day: ' + hm(total) + '">' +
    '<circle cx="115" cy="115" r="' + R + '" fill="none" stroke="#2C3760" stroke-width="18"></circle>' + arcs +
    '<text x="115" y="14" text-anchor="middle" font-size="11" font-weight="700" fill="#C9D6FF">12am</text><text x="224" y="119" text-anchor="end" font-size="11" font-weight="700" fill="#C9D6FF">6am</text><text x="115" y="226" text-anchor="middle" font-size="11" font-weight="700" fill="#C9D6FF">12pm</text><text x="6" y="119" font-size="11" font-weight="700" fill="#C9D6FF">6pm</text>' +
    '<text x="115" y="110" text-anchor="middle" font-size="32" font-weight="800" fill="#F3EEDF">' + (total ? hm(total) : '–') + '</text>' +
    '<text x="115" y="134" text-anchor="middle" font-size="13" font-weight="700" fill="#C9D6FF">' + (rests.length > 1 ? 'rested, in ' + rests.length + ' parts' : rests.length ? 'rested' : 'nothing logged') + '</text></svg>';
}

function render(root) {
  const st = get(), date = logDate(), hour = new Date().getHours();
  const rests = st.rests.filter(r => r.date === date).sort((a, b) => a.start - b.start);
  const night = hour < 5 || hour >= 22;
  root.innerHTML =
    '<div class="top">' + backLink() + dateChip() + '</div>' +
    '<div class="night-hero">' + him(night ? 'nightwatch' : 'asleep', 'breathe', 'Your character resting') + '<p class="say">' + (night ? 'Awake too? I\'ll keep the lamp on.' : 'Rest counts in any shape. One piece or three.') + '</p></div>' +
    (st.pendingSleep
      ? '<div class="card"><p><b>Asleep since ' + timeOf(st.pendingSleep) + '</b></p><div class="sleepbtns"><button type="button" class="btn b2" data-wake>Woke up</button><button type="button" class="btn alt" data-cancelsleep>Cancel</button></div></div>'
      : '<div class="sleepbtns"><button type="button" class="btn b1" data-sleep>Going to sleep</button><button type="button" class="btn b2" data-wake>Woke up</button></div>') +
    '<div class="ring">' + ring(rests, date) + '</div>' +
    (rests.length ? '<div class="card">' + rests.map(r => '<div class="entry"><span class="t">' + timeOf(r.start) + '</span><span>to ' + timeOf(r.end) + ' · ' + hm(Math.round((r.end - r.start) / 60000)) + (r.feel ? ' · ' + esc(r.feel) : '') + '</span><button type="button" class="x" data-del="' + r.id + '" aria-label="Remove this rest">×</button></div>').join('') + '</div>' : '') +
    '<button type="button" class="btn alt wide" data-manual>+ Add a rest by hand</button>' +
    '<div class="lbl">Awake for a bit? What did you do</div>' +
    '<div class="chips">' + NIGHT_THINGS.map(n => '<button type="button" class="chip small" data-awake="' + esc(n) + '">' + esc(n) + '</button>').join('') + '</div>' +
    '<div class="card"><div class="lbl">For your doctor</div><p class="muted" style="font-size:14px">Your rests as a sleep diary, ready to save or send. ' + st.rests.length + ' logged so far.</p><button type="button" class="btn alt" data-diary>Export sleep diary</button></div>' +
    nav('home');
}
