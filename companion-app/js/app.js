import { load } from './store.js';
import * as home from './screens/home.js';
import * as weather from './screens/weather.js';
import * as move from './screens/move.js';
import * as food from './screens/food.js';
import * as rest from './screens/rest.js';
import * as wins from './screens/wins.js';
import * as mind from './screens/mind.js';
import * as letters from './screens/letters.js';
import * as days from './screens/days.js';
import * as me from './screens/me.js';
import { closeSheet } from './ui.js';

const ROUTES = { home, weather, move, food, rest, wins, mind, letters, days, me };
let root = document.getElementById('app');
let current = null;

function route() {
  closeSheet();
  const [path, query] = (location.hash.replace(/^#\/?/, '') || 'home').split('?');
  const [name, ...rest] = path.split('/');
  const params = Object.fromEntries(new URLSearchParams(query || ''));
  params.args = rest;
  const screen = ROUTES[name] || home;
  if (current && current.unmount) current.unmount();
  current = screen;
  // a fresh element per screen, so no screen's listeners leak into the next
  const next = document.createElement('main');
  next.id = 'app';
  next.className = 'screen screen-' + (ROUTES[name] ? name : 'home');
  root.replaceWith(next); root = next;
  screen.mount(root, params);
  if (!params.keepScroll) window.scrollTo(0, 0);
}

load().then(() => {
  window.addEventListener('hashchange', route);
  route();
  document.documentElement.classList.add('ready');
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is a bonus */ });
}
