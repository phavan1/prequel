// Offline support: the app opens even with no signal. Change VERSION when you publish an update.
const VERSION = 'prequel-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/store.js', 'js/data.js', 'js/ui.js',
  'js/screens/home.js', 'js/screens/weather.js', 'js/screens/move.js', 'js/screens/food.js', 'js/screens/rest.js',
  'js/screens/wins.js', 'js/screens/mind.js', 'js/screens/letters.js', 'js/screens/days.js', 'js/screens/me.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  ...['standing', 'waving', 'lying', 'asleep', 'eating', 'cooking', 'umbrella', 'sunny', 'nightwatch', 'letter', 'cheer', 'stickynote', 'skate', 'legday'].map(n => 'art/' + n + '.webp')
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// serve from the cache straight away, refresh it quietly in the background
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(res => { if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) cache.put(e.request, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
