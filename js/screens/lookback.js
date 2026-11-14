// Looking back (v105): the quiet record, one tap from Me. It used to sit at the bottom of Me and made that page about
// two and a half phone screens long. Your tiny wins, lanterns and letters, the weather ribbon, and two weeks of nights.
import { get } from '../store.js';
import { nav, backLink, esc } from '../ui.js';
import { ribbon, nightsChart, noticing } from '../charts.js';
import { on } from '../features.js';

const counts = st => [[on('wins') ? st.moments.filter(m => m.area === 'win').length : 0, 'tiny win', 'tiny wins'], [on('mind') ? st.mind.filter(n => n.letGo).length : 0, 'lantern let go', 'lanterns let go'], [on('mind') ? st.letters.length : 0, 'letter', 'letters']].filter(x => x[0] > 0);
// Me shows the Looking back tile only when this page has something to show
export const lookbackAny = (st = get()) => on('weather') || on('rest') || counts(st).length > 0;

export function mount(root) {
  render(root);
  root.addEventListener('click', e => { const b = e.target.closest('[data-wx]'); if (b) b.closest('.chartwrap').querySelector('.readout').textContent = b.dataset.wx; });
}
function render(root) {
  const st = get(), c = counts(st), notice = on('weather') ? noticing(st) : null;
  root.innerHTML = '<div class="top">' + backLink() + '</div>' +
    '<div><h1>Looking back</h1><p class="sub">The quiet record. No good or bad, just what happened.</p></div>' +
    (c.length ? '<div class="grid' + (c.length === 1 ? '1' : c.length) + '">' + c.map(x => '<div class="count"><b>' + x[0] + '</b><span>' + (x[0] === 1 ? x[1] : x[2]) + '</span></div>').join('') + '</div>' : '') +
    (on('weather') ? '<div class="card"><b>Your weather ribbon</b><p class="muted" style="font-size:13px;margin:0">Every day you checked in, as a stripe. No good or bad, just weather.</p>' + ribbon(st.weather) + '</div>' : '') +
    (on('rest') ? '<div class="card"><b>Your last two weeks of nights</b><p class="muted" style="font-size:13px;margin:0">One row a day, from 6pm the evening before to 6pm that day. Your real pattern, no score.</p>' + nightsChart(st.rests) + '</div>' : '') +
    (notice ? '<div class="lookback" style="background:#DFF0DC">' + esc(notice) + '</div>' : '') +
    (!lookbackAny(st) ? '<p class="empty">Nothing to look back on yet.</p>' : '') +
    nav('me');
}
