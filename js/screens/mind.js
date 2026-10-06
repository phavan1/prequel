import { get, save, uid, addMoment, removeById, today, addDays, parseKey } from '../store.js';
import { esc, nav, toast, prettyDate, openSheet, closeSheet } from '../ui.js';

const COLOURS = ['#FFF1A8', '#DCE7FF', '#FFD9CC', '#DFF0DC', '#EBDDF2'];
let when = '';

function weekendFrom(d) { const dow = parseKey(d).getDay(); return addDays(d, dow === 6 ? 7 : (6 - dow)); }

export function mount(root) {
  render(root);
  root.addEventListener('click', e => {
    const t = e.target, st = get(); let b;
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
      save(); render(root); toast('Folded into a lantern. It\'s floating up into your sky.'); return;
    }
    if ((b = t.closest('[data-editnote]'))) { editNote(root, b.dataset.editnote); return; }
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
    if (o.dataset.o === 'back') { n.letGo = null; st.moments = st.moments.filter(m => m.ref !== id); save(); closeSheet(); render(root); toast('It\'s back on your board.'); return; }
    const text = document.getElementById('noteTx').value.trim(); if (!text) return;
    n.text = text;
    const day = document.getElementById('noteDay'); if (day) n.remindOn = day.value || null;
    st.moments.forEach(m => { if (m.ref === id) m.text = 'Let go: ' + text; });
    save(); closeSheet(); render(root); toast('Changed.');
  });
}

function render(root, keep) {
  const st = get(), d = today();
  const jot = keep && root.querySelector('#jot') ? root.querySelector('#jot').value : '';
  const open = st.mind.filter(n => !n.letGo).sort((a, b) => (a.remindOn || '9999').localeCompare(b.remindOn || '9999'));
  const lanterns = st.mind.filter(n => n.letGo).length;
  root.innerHTML =
    '<div><h1>Things on my mind</h1><p class="sub">No due dates. No overdue. Just a place to put things down. Tap a note to change it.</p></div>' +
    '<div class="card">' +
      '<label class="field-label" for="jot">JOT SOMETHING DOWN</label><input id="jot" type="text" placeholder="e.g. check that email from uni" autocomplete="off" value="' + esc(jot) + '" enterkeyhint="done">' +
      '<div class="lbl">Remind me around</div>' +
      '<div class="chips">' + [['tomorrow', 'Tomorrow'], ['weekend', 'The weekend'], ['week', 'Next week'], ['pick', 'Pick a day']].map(w => '<button type="button" class="chip small" data-when="' + w[0] + '" aria-pressed="' + (when === w[0]) + '">' + w[1] + '</button>').join('') + '</div>' +
      (when === 'pick' ? '<label class="sr" for="pickDate">Day to bring it up</label><input id="pickDate" type="date" min="' + d + '" value="' + addDays(d, 3) + '">' : '') +
      '<button type="button" class="btn" data-jot>Put it down</button>' +
    '</div>' +
    (open.length
      ? '<div class="notes">' + open.map((n, i) => {
          const due = n.remindOn && n.remindOn <= d;
          const meta = !n.remindOn ? 'no nudge' : due ? 'hey, this one' : 'around ' + prettyDate(n.remindOn).toLowerCase();
          return '<div class="sticky" style="background:' + COLOURS[i % COLOURS.length] + ';transform:rotate(' + ((i % 3) - 1) * 1.5 + 'deg)"><button type="button" class="tx" data-editnote="' + n.id + '" aria-label="Change this note">' + esc(n.text) + '</button><span class="mt">' + esc(meta) + '</span><button type="button" data-letgo="' + n.id + '">Let it go</button></div>';
        }).join('') + '</div>'
      : '<p class="empty">Nothing on your mind here right now. That\'s a nice kind of empty.</p>') +
    (lanterns ? '<details class="letgo"><summary>Lanterns you\'ve let go</summary>' + st.mind.filter(n => n.letGo).sort((a, b) => b.letGo - a.letGo).map(n => '<button type="button" class="item" data-editnote="' + n.id + '" style="width:100%;text-align:left"><i style="background:#3E9E6E"></i><span>' + esc(n.text) + '</span><b style="padding-right:12px;color:var(--blue)">›</b></button>').join('') + '</details>' : '') +
    '<p class="muted" style="font-size:13px">' + lanterns + (lanterns === 1 ? ' lantern' : ' lanterns') + ' let go so far. Doing it or not doing it, both count as letting go.</p>' +
    '<a class="rowlink" href="#/letters"><span>Letters from good-day you</span><b>' + st.letters.length + '</b></a>' +
    nav('mind');
}
