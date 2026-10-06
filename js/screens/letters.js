import { get, save, uid, addMoment, today, dateKey } from '../store.js';
import { esc, nav, backLink, him, toast, prettyDate } from '../ui.js';

let showing = null;

export function mount(root, params) {
  showing = null;
  if (params.open === '1') openOne();
  render(root);
  root.addEventListener('click', e => {
    const t = e.target, st = get(); let b;
    if (t.closest('[data-open]')) { openOne(); render(root); return; }
    if (t.closest('[data-fold]')) { showing = null; render(root); return; }
    if ((b = t.closest('[data-read]'))) { showing = st.letters.find(l => l.id === b.dataset.read) || null; if (showing && !showing.opened) { showing.opened = Date.now(); save(); } render(root); window.scrollTo(0, 0); return; }
    if (t.closest('[data-seal]')) {
      const text = (root.querySelector('#letter').value || '').trim(); if (!text) { root.querySelector('#letter').focus(); return; }
      const wx = st.weather.filter(w => w.date === today()).sort((a, b) => a.ts - b.ts).pop();
      st.letters.push({ id: uid(), text, ts: Date.now(), weather: wx ? wx.types.join(' + ') : '', opened: null });
      addMoment('mind', 'Wrote a letter to future me', today(), { bright: 1 });
      save(); render(root); toast('Sealed. It\'ll be here on a stormy day.');
    }
  });
}

// unopened letters first, oldest first; then any letter at random
function openOne() {
  const st = get();
  const unopened = st.letters.filter(l => !l.opened);
  const pool = unopened.length ? unopened : st.letters;
  if (!pool.length) return;
  showing = unopened.length ? unopened[0] : pool[Math.floor(Math.random() * pool.length)];
  if (!showing.opened) { showing.opened = Date.now(); save(); }
}

function render(root) {
  const st = get();
  const sealed = st.letters.filter(l => !l.opened).length;
  root.innerHTML =
    '<div class="top">' + backLink('#/mind', 'Mind') + '<span class="lbl">' + sealed + ' sealed</span></div>' +
    '<div><h1>Letters from good-day you</h1><p class="sub">Written on sunny days. Handed to you on stormy ones.</p></div>' +
    (showing
      ? '<div class="paper"><span class="lbl">Written ' + esc(prettyDate(dateKey(new Date(showing.ts)), { weekday: 'long', day: 'numeric', month: 'long' })) + (showing.weather ? ' · ' + esc(showing.weather.toLowerCase()) : '') + '</span><p class="tx">' + esc(showing.text) + '</p><button type="button" class="btn alt" data-fold>Fold it back up</button></div>'
      : st.letters.length
        ? '<button type="button" class="envelope" data-open aria-label="Open a letter"><svg viewBox="0 0 324 170" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,0 162,96 324,0" fill="none" stroke="#E2CF9E" stroke-width="2"></polyline></svg><span class="seal"></span><span class="cap">' + (sealed ? 'From you, for today · tap to open' : 'All opened · tap to reread one') + '</span></button>'
        : '<div class="hero">' + him('letter', 'breathe', 'Your character reading a letter') + '<div class="txt"><p class="say">No letters yet. Write one on a good day, and I\'ll keep it safe.</p></div></div>') +
    '<div class="card"><label class="field-label" for="letter">WRITE ONE FOR LATER</label><textarea id="letter" placeholder="Dear stormy-day me…"></textarea><button type="button" class="btn" data-seal>Seal it</button></div>' +
    (st.letters.length ? '<div class="lbl">All your letters</div>' + st.letters.slice().reverse().map(l => '<button type="button" class="item" data-read="' + l.id + '" style="text-align:left;width:100%"><i style="background:' + (l.opened ? '#C9BFA6' : '#D9673B') + '"></i><span>' + esc(prettyDate(dateKey(new Date(l.ts)))) + (l.opened ? '' : ' · sealed') + '</span><b style="padding-right:12px;color:var(--blue)">›</b></button>').join('') : '') +
    nav('mind');
}
