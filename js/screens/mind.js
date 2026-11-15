import { get, save, uid, addMoment, removeById, today, addDays, parseKey } from '../store.js';
import { esc, nav, toast, prettyDate, openSheet, closeSheet, him } from '../ui.js';

const COLOURS = ['#FFF1A8', '#DCE7FF', '#FFD9CC', '#DFF0DC', '#EBDDF2'];
let when = '', recallTimer = null;

function weekendFrom(d) { const dow = parseKey(d).getDay(); return addDays(d, dow === 6 ? 7 : (6 - dow)); }

export function mount(root) {
  render(root);
  // v114: the reminder choices show once there's something typed
  root.addEventListener('input', e => { if (e.target.id === 'jot') { const r = root.querySelector('.remind'); if (r) r.hidden = !e.target.value.trim() && !when; } });
  root.addEventListener('click', e => { const b = e.target.closest('[data-recall]'); if (b) { e.stopPropagation(); recall(root, b.dataset.recall); } }, true);
  root.addEventListener('click', e => {
    const t = e.target, st = get(); let b;
    if (t.closest('[data-lanterns]')) { lanternSheet(root); return; } // v114
    if ((b = t.closest('[data-when]'))) { when = when === b.dataset.when ? '' : b.dataset.when; render(root, true); return; }
    if (t.closest('[data-jot]')) {
      const text = (root.querySelector('#jot').value || '').trim(); if (!text) { root.querySelector('#jot').focus(); return; }
      let remindOn = null;
      const d = today();
      if (when === 'tomorrow') remindOn = addDays(d, 1);
      else if (when === 'weekend') remindOn = weekendFrom(d);
      else if (when === 'week') remindOn = addDays(d, 7);
      else if (when === 'pick') remindOn = root.querySelector('#pickDate').value || null;
      st.mind.push({ id: uid(), text, remindOn, created: Date.now(), letGo: null });
      when = ''; save(); render(root); toast(remindOn ? 'I\'ll bring it up around ' + prettyDate(remindOn).toLowerCase() + '.' : 'Put down. It\'s safe here.'); return;
    }
    if ((b = t.closest('[data-letgo]'))) {
      const n = st.mind.find(x => x.id === b.dataset.letgo); if (!n) return;
      n.letGo = Date.now();
      addMoment('mind', 'Let go: ' + n.text, today(), { ref: n.id });
      save(); render(root); recallBar(root, n.id); return;
    }
    if ((b = t.closest('[data-editnote]'))) { editNote(root, b.dataset.editnote); return; }
    if ((b = t.closest('[data-rmnote]'))) { confirmRemove(root, b.dataset.rmnote); return; }
  });
}

// called a lantern back down: it's a note on the board again, and its star leaves the sky
export function unmount() { clearTimeout(recallTimer); const s = document.getElementById('snack'); if (s) s.classList.remove('show'); }
function recall(root, id) {
  const st = get(), n = st.mind.find(x => x.id === id); if (!n || !n.letGo) return;
  n.letGo = null; st.moments = st.moments.filter(m => m.ref !== id);
  save(); unmount(); render(root); toast('Called it back. It\'s on your board again.');
}
// right after letting go: a few seconds to change your mind
function recallBar(root, id) {
  let s = document.getElementById('snack');
  if (!s) { s = document.createElement('div'); s.id = 'snack'; s.className = 'snack'; document.body.appendChild(s); }
  s.innerHTML = '<span>Folded into a lantern. It\'s floating up.</span><button type="button">Bring it back</button>';
  s.querySelector('button').onclick = () => recall(root, id);
  s.classList.add('show'); clearTimeout(recallTimer); recallTimer = setTimeout(() => s.classList.remove('show'), 7000);
}

// the × on a note or a lantern (v60): asks once, then it's gone (its star leaves the sky too)
function confirmRemove(root, id) {
  const n = get().mind.find(x => x.id === id); if (!n) return;
  openSheet('<h2>Remove it completely?</h2><p class="muted">"' + esc(n.text) + '"' + (n.letGo ? ' will leave your sky too.' : '') + '</p>' +
    '<button type="button" class="btn danger" data-o="del">Remove it</button><button type="button" class="btn ghost" data-close>Keep it</button>', ev => {
    if (!ev.target.closest('[data-o="del"]')) return;
    removeById('mind', id); closeSheet(); render(root); toast('Gone, like it was never written.');
  });
}
// tap a note (or a lantern) to change it, bring it back, or remove it completely
function editNote(root, id) {
  const st = get(), n = st.mind.find(x => x.id === id); if (!n) return;
  openSheet((n.letGo ? '<h2>A lantern you let go</h2>' : '<h2>Change this note</h2>') +
    '<label class="field-label" for="noteTx">NOTE</label><input id="noteTx" type="text" value="' + esc(n.text) + '" autocomplete="off" enterkeyhint="done">' +
    (n.letGo ? '' : '<label class="field-label" for="noteDay">BRING IT UP AROUND · leave empty for no nudge</label><input id="noteDay" type="date" value="' + esc(n.remindOn || '') + '">') +
    '<button type="button" class="btn" data-o="save">Save</button>' +
    (n.letGo ? '<button type="button" class="btn alt" data-o="back">Bring it back to my notes</button>' : '') +
    '<button type="button" class="btn danger" data-o="del">Remove it completely</button><button type="button" class="btn ghost" data-close>Cancel</button>', ev => {
    const o = ev.target.closest('[data-o]'); if (!o) return;
    if (o.dataset.o === 'del') { removeById('mind', id); closeSheet(); render(root); toast('Gone, like it was never written.'); return; }
    if (o.dataset.o === 'back') { closeSheet(); recall(root, id); return; }
    const text = document.getElementById('noteTx').value.trim(); if (!text) return;
    n.text = text;
    const day = document.getElementById('noteDay'); if (day) n.remindOn = day.value || null;
    st.moments.forEach(m => { if (m.ref === id) m.text = 'Let go: ' + text; });
    save(); closeSheet(); render(root); toast('Changed.');
  });
}

// v114: the lanterns you've let go, in a pop-up from the Lanterns tile (they used to be a list you could expand)
function lanternSheet(root) {
  const draw = () => { const L = get().mind.filter(n => n.letGo).sort((a, b) => b.letGo - a.letGo);
    return '<h2>Lanterns you\'ve let go</h2><p class="muted" style="margin:0">Doing it or not doing it, both count as letting go. Call one back any time.</p>' +
      (L.length ? '<div class="lanterns">' + L.map(n => '<div class="item lantern"><i style="background:#3E9E6E"></i><button type="button" class="tap" data-editnote="' + n.id + '">' + esc(n.text) + '</button><button type="button" class="recall" data-recall="' + n.id + '">Bring back</button><button type="button" class="rmx" data-rmnote="' + n.id + '" aria-label="Remove this lantern">×</button></div>').join('') + '</div>' : '<p class="empty">No lanterns yet. Tap "Let it go" on a note and it floats up here.</p>') +
      '<button type="button" class="btn ghost" data-close>Close</button>'; };
  openSheet(draw(), ev => {
    let b;
    if ((b = ev.target.closest('[data-recall]'))) { closeSheet(); recall(root, b.dataset.recall); return; }
    if ((b = ev.target.closest('[data-rmnote]'))) { closeSheet(); confirmRemove(root, b.dataset.rmnote); return; }
    if ((b = ev.target.closest('[data-editnote]'))) { closeSheet(); editNote(root, b.dataset.editnote); }
  });
}
const STARS = (() => { let seed = 5; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647; let s = '';
  for (let i = 0; i < 26; i++) s += '<circle cx="' + (4 + r() * 152).toFixed(1) + '" cy="' + (4 + r() * 66).toFixed(1) + '" r="' + [0.6, 0.9, 1.2][Math.floor(r() * 3)] + '" fill="#FFF6D8" opacity="' + (0.4 + r() * 0.5).toFixed(2) + '"/>'; return s; })();
const LANTERN = (x, y, k, o) => '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')" opacity="' + o + '"><ellipse cx="0" cy="6" rx="16" ry="20" fill="#F4C430" opacity=".18"/><path d="M-7 -6 Q0 -10 7 -6 L5 12 Q0 14 -5 12 Z" fill="#F4B740"/><path d="M-5 12 Q0 14 5 12 L4 15 L-4 15 Z" fill="#C8792A"/><path d="M-3 -3 L-2 9" stroke="#FFE7A0" stroke-width="1.5" opacity=".7"/></g>';
const LANTERN_ART = '<svg viewBox="0 0 160 74" class="tart" aria-hidden="true">' + STARS + LANTERN(40, 40, 0.9, 1) + LANTERN(84, 24, 0.7, 0.85) + LANTERN(124, 46, 0.55, 0.7) + '</svg>';
const ENVELOPE_ART = '<svg viewBox="0 0 160 74" class="tart" aria-hidden="true"><rect x="22" y="8" width="116" height="60" rx="6" fill="#FFF6DA" stroke="#E2CF9E" stroke-width="1.5"/><path d="M22 12 L80 44 L138 12" fill="none" stroke="#E2CF9E" stroke-width="1.5"/><circle cx="80" cy="42" r="8" fill="#D9573F"/></svg>';

function render(root, keep) {
  const st = get(), d = today();
  const jot = keep && root.querySelector('#jot') ? root.querySelector('#jot').value : '';
  const open = st.mind.filter(n => !n.letGo).sort((a, b) => (a.remindOn || '9999').localeCompare(b.remindOn || '9999'));
  const lanterns = st.mind.filter(n => n.letGo).length, letters = st.letters.length;
  // v114 (design A): a hello with him, a slim jot bar (reminders appear once you type), notes on a corkboard,
  // and Lanterns and Letters as picture tiles, like Me's
  root.innerHTML =
    '<div class="mhero"><div class="mtx"><h1>Mind</h1><p class="sub">A place to put things down. No due dates, no overdue. Tap a note to change it.</p></div>' + him('stickynote', '', 'Him with a sticky note') + '</div>' +
    '<div class="jotwrap"><div class="jotbar"><label class="sr" for="jot">Jot something down</label><input id="jot" type="text" placeholder="Put something down…" autocomplete="off" value="' + esc(jot) + '" enterkeyhint="done"><button type="button" class="jotgo" data-jot aria-label="Put it down">+</button></div>' +
      '<div class="remind"' + (jot.trim() || when ? '' : ' hidden') + '><div class="lbl">Remind me around</div>' +
      '<div class="chips">' + [['tomorrow', 'Tomorrow'], ['weekend', 'The weekend'], ['week', 'Next week'], ['pick', 'Pick a day']].map(w => '<button type="button" class="chip small" data-when="' + w[0] + '" aria-pressed="' + (when === w[0]) + '">' + w[1] + '</button>').join('') + '</div>' +
      (when === 'pick' ? '<label class="sr" for="pickDate">Day to bring it up</label><input id="pickDate" type="date" min="' + d + '" value="' + addDays(d, 3) + '">' : '') + '</div></div>' +
    '<div class="board"><div class="blbl">On your mind' + (open.length ? ' · ' + open.length : '') + '</div>' +
    (open.length
      ? '<div class="notes">' + open.map((n, i) => {
          const due = n.remindOn && n.remindOn <= d;
          const meta = !n.remindOn ? 'no nudge' : due ? 'hey, this one' : 'around ' + prettyDate(n.remindOn).toLowerCase();
          return '<div class="sticky" style="background:' + COLOURS[i % COLOURS.length] + ';transform:rotate(' + ((i % 3) - 1) * 1.5 + 'deg)"><button type="button" class="tx" data-editnote="' + n.id + '" aria-label="Change this note">' + esc(n.text) + '</button><span class="mt">' + esc(meta) + '</span><button type="button" data-letgo="' + n.id + '">Let it go</button><button type="button" class="rmx" data-rmnote="' + n.id + '" aria-label="Remove this note">×</button></div>';
        }).join('') + '</div>'
      : '<p class="bempty">Nothing on your mind here right now. That\'s a nice kind of empty.</p>') + '</div>' +
    '<div class="grid2 tiles">' +
      '<button type="button" class="ttile sky" data-lanterns>' + LANTERN_ART + '<span class="tt"><b>Lanterns</b><small>' + (lanterns ? lanterns + (lanterns === 1 ? ' let go' : ' let go') + ' · call one back' : 'Let a note go and it floats up here') + '</small></span><span class="tgo" aria-hidden="true">›</span></button>' +
      '<a class="ttile lett" href="#/letters?from=mind">' + ENVELOPE_ART + '<span class="tt"><b>Letters</b><small>' + (letters ? letters + (letters === 1 ? ' sealed' : ' sealed') + ', for a stormy day' : 'From good-day you, for a stormy day') + '</small></span><span class="tgo" aria-hidden="true">›</span></a>' +
    '</div>' +
    nav('mind');
}
