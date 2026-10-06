import { get, save, addMoment, today } from '../store.js';
import { esc, nav, backLink, dateChip, logDate, him, pop, toast } from '../ui.js';

const STORMY = ['Drizzle', 'Heavy rain', 'Thunderstorm', 'Fog', 'Snow / still', 'Heatwave'];

export function mount(root, params) {
  const st = get();
  if (params.heavy === '1' && !st.heavy[logDate()]) { st.heavy[logDate()] = true; save(); }
  render(root);
  root.addEventListener('click', e => {
    const t = e.target, st2 = get(), date = logDate(); let b;
    if ((b = t.closest('[data-win]'))) {
      const label = b.dataset.win;
      const stormy = st2.heavy[date] || st2.weather.some(w => w.date === date && w.types.some(x => STORMY.includes(x)));
      addMoment('win', label, date, { bright: stormy ? 1 : 0 });
      toast(stormy ? 'That counts, and on a hard day it shines brighter.' : 'That counts. A star just went up.');
      render(root); pop(root.querySelector('.him')); return;
    }
    if (t.closest('[data-addwin]')) {
      const v = (root.querySelector('#newWin').value || '').trim(); if (!v) return;
      if (!st2.settings.tinyWins.includes(v)) st2.settings.tinyWins.push(v);
      save(); render(root); return;
    }
    if (t.closest('[data-unheavy]')) { delete st2.heavy[date]; save(); location.hash = '#/home'; }
  });
}

function render(root) {
  const st = get(), date = logDate();
  const heavy = !!st.heavy[date];
  root.classList.toggle('heavy', heavy);
  const doneToday = new Set(st.moments.filter(m => m.date === date && m.area === 'win').map(m => m.text));
  const count = st.moments.filter(m => m.area === 'win').length;
  const sealed = st.letters.length;
  root.innerHTML =
    '<div class="top">' + backLink() + dateChip() + '</div>' +
    (heavy
      ? '<div class="lowroom">' + him('lying', '', 'Your character lying face down on the floor next to you') + '</div>' +
        '<div><p class="say" style="font-size:26px">Heavy one today. I\'m lying down too.</p><p class="sub">One small thing, if you want it. Or nothing. Both are okay.</p></div>'
      : '<div class="hero">' + him('cheer', '', 'Your character celebrating') + '<div class="txt"><h1>Tiny wins</h1><p class="say">On hard days, these are the big ones.</p></div></div>') +
    '<div class="chips wins">' + st.settings.tinyWins.map(w => '<button type="button" class="chip" data-win="' + esc(w) + '" aria-pressed="' + doneToday.has(w) + '">' + esc(w) + '</button>').join('') + '</div>' +
    '<div class="addrow"><label class="sr" for="newWin">Add your own tiny win</label><input id="newWin" type="text" placeholder="Add your own tiny win" autocomplete="off"><button type="button" class="btn alt" data-addwin>Add</button></div>' +
    '<p class="muted" style="font-size:13px">' + count + ' tiny wins so far, ever. They never reset.</p>' +
    (heavy
      ? '<a class="rowlink" href="#/letters?open=1"><span>' + (sealed ? 'Open a letter from good-day you' : 'No letters yet. Write one on a good day.') + '</span><b>›</b></a>' +
        '<a class="rowlink" href="#/food"><span>Your comfort menu</span><b>›</b></a>' +
        '<button type="button" class="btn ghost" data-unheavy>' + (date === today() ? 'Feeling a bit lighter now' : 'Not a heavy day after all') + '</button>'
      : '') +
    nav('home');
}
