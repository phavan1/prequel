// On repeat (v96), as its own page: the same tape player and shelf of eras as the Days tab (musicPanel), reached from
// Me ("Your sky · Your quilt · On repeat"), so people find it without adding a Days tab. The Days tab still works.
import { today } from '../store.js';
import { nav, backLink } from '../ui.js';
import { musicPanel, musicClick } from './ontape.js';
import { stopPlay } from '../music.js';

let root = null;
export function mount(r) {
  root = r; render();
  root.addEventListener('click', e => { musicClick(e, render); });
}
export function unmount() { try { stopPlay(); } catch (e) { /* nothing playing */ } }
function render() {
  root.innerHTML = '<div class="top">' + backLink() + '</div>' +
    '<div><h1>On repeat</h1><p class="sub">The song you can\'t stop playing, kept era by era.</p></div>' +
    musicPanel(today()) +
    nav('me');
}
