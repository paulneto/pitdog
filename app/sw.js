// PitDog service worker: keeps the app usable with no signal in the paddock.
// Bump VERSION on every deploy so phones pick up the new version.
const VERSION = 'pitdog-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  ...['inter-latin-400-normal', 'inter-latin-600-normal', 'inter-latin-800-normal', 'inter-latin-800-italic'].map(f => './fonts/' + f + '.woff2')];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first (so updates arrive when there is signal), but never wait more than TIMEOUT_MS on a weak signal:
// then the cached copy is served, and the network response still refreshes the cache in the background.
// Only the app's own files go through here; anything else (weather) goes straight to the network.
const TIMEOUT_MS = 2500;
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const net = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; });
    const cached = (await cache.match(req)) || (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    if (!cached) return net.catch(() => caches.match('./index.html'));
    e.waitUntil(net.catch(() => {}));
    const timeout = new Promise(res => setTimeout(() => res(cached), TIMEOUT_MS));
    return Promise.race([net.catch(() => cached), timeout]);
  })());
});
