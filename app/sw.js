// PitDog service worker: keeps the app usable with no signal in the paddock.
// Bump VERSION on every deploy so phones pick up the new version.
const VERSION = 'pitdog-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  ...['barlow-latin-400-normal', 'barlow-latin-600-normal', 'barlow-latin-800-normal', 'barlow-latin-800-italic',
      'barlow-condensed-latin-600-normal', 'barlow-condensed-latin-700-normal', 'barlow-condensed-latin-800-normal', 'barlow-condensed-latin-800-italic']
    .map(f => './fonts/' + f + '.woff2')];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first (so updates arrive when there is signal), cached copy when offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(m => m || caches.match('./index.html')))
  );
});
