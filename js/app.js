import { load, get, save, today, dateKey } from './store.js';
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
import * as sky from './screens/sky.js';
import * as quilt from './screens/quilt.js';
import * as skate from './screens/skate.js';
import { closeSheet, setLogDate, esc, reduceMotion } from './ui.js';

const ROUTES = { home, weather, move, food, rest, wins, mind, letters, days, me, sky, quilt, skate };
let root = document.getElementById('app');
let current = null;

function route() {
  closeSheet();
  const [path, query] = (location.hash.replace(/^#\/?/, '') || 'home').split('?');
  const [name, ...rest] = path.split('/');
  const params = Object.fromEntries(new URLSearchParams(query || ''));
  params.args = rest;
  setLogDate(params.d || null);
  document.body.classList.remove('heavy-day');
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

// light, dark, or follow the phone
const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
export function applyTheme() {
  const pref = (get() && get().settings.theme) || 'light';
  const dark = pref === 'dark' || (pref === 'auto' && darkQuery && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = dark ? '#1C1815' : '#FAF3DC';
}
if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', () => { if (get()) applyTheme(); });
window.addEventListener('prequel-theme', applyTheme);

// a soft hello: the first time you open the app each morning (the day turns over at 5am, so late nights
// don't use it up), and again whenever you come back after 4 or more hours away. Tap to skip.
const AWAY = 4 * 3600 * 1000;
const helloDay = () => dateKey(new Date(Date.now() - 5 * 3600 * 1000));
function hello() {
  const st = get(), now = Date.now(), d = helloDay();
  const firstToday = st.lastHello !== d, back = st.lastSeen && now - st.lastSeen >= AWAY;
  st.lastSeen = now;
  if (!firstToday && !back) { save(); return; }
  st.lastHello = d; save();
  if (document.querySelector('.hello')) return;
  const h = new Date().getHours();
  const part = h < 5 ? 'Hey, night owl' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const name = st.settings.name ? ', ' + esc(st.settings.name) : '';
  const lines = st.settings.kindLines.length ? st.settings.kindLines : ['Glad you\'re here.'];
  const pose = h < 6 || h >= 19 ? 'nightwatch' : h < 12 ? 'sitting' : 'afternoon';
  const el = document.createElement('div');
  el.className = 'hello'; el.setAttribute('role', 'status');
  el.innerHTML = '<img src="art/' + pose + '.webp" alt="" draggable="false"><div class="d">' + new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div><h1>' + (firstToday ? part : 'Welcome back') + name + '</h1><p>' + esc(lines[Math.floor(Math.random() * lines.length)]) + '</p>';
  document.body.appendChild(el);
  let gone = false;
  const go = () => { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => el.remove(), 550); };
  el.addEventListener('click', go);
  setTimeout(go, reduceMotion ? 1400 : 2400);
}
// coming back to the app counts too (iPhones often keep it open in the background)
document.addEventListener('visibilitychange', () => {
  const st = get(); if (!st) return;
  if (document.visibilityState === 'visible') hello(); else { st.lastSeen = Date.now(); save(); }
});

load().then(() => {
  window.addEventListener('hashchange', route);
  applyTheme();
  route();
  hello();
  document.documentElement.classList.add('ready');
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // when a new version finishes installing, reload once so it shows straight away
  let reloaded = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    reg.update();
    // check for updates every time you come back to the app
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => { /* offline support is a bonus */ });
}
