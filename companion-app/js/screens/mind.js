import { get, save, uid, addMoment, today, addDays, parseKey } from '../store.js';
import { esc, nav, toast, prettyDate } from '../ui.js';

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
  });
}

function render(root, keep) {
  const st = get(), d = today();
  const jot = keep && root.querySelector('#jot') ? root.querySelector('#jot').value : '';
  const open = st.mind.filter(n => !n.letGo).sort((a, b) => (a.remindOn || '9999').localeCompare(b.remindOn || '9999'));
  const lanterns = st.mind.filter(n => n.letGo).length;
  root.innerHTML =
    '<div><h1>Things on my mind</h1><p class="sub">No due dates. No overdue. Just a place to put things down.</p></div>' +
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
          return '<div class="sticky" style="background:' + COLOURS[i % COLOURS.length] + ';transform:rotate(' + ((i % 3) - 1) * 1.5 + 'deg)"><span class="tx">' + esc(n.text) + '</span><span class="mt">' + esc(meta) + '</span><button type="button" data-letgo="' + n.id + '">Let it go</button></div>';
        }).join('') + '</div>'
      : '<p class="empty">Nothing on your mind here right now. That\'s a nice kind of empty.</p>') +
    '<p class="muted" style="font-size:13px">' + lanterns + (lanterns === 1 ? ' lantern' : ' lanterns') + ' let go so far. Doing it or not doing it, both count as letting go.</p>' +
    '<a class="rowlink" href="#/letters"><span>Letters from good-day you</span><b>' + st.letters.length + '</b></a>' +
    nav('mind');
}
