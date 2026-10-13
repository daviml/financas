// Service worker: guarda o app para abrir sem internet.
// Rede primeiro (pega a versão nova), cache se estiver offline. A API do GitHub nunca passa pelo cache.
// Ao publicar uma versão nova, aumente o número do CACHE.
const CACHE = 'financas-v3';
const FILES = ['./', './index.html', './config.js', './css/app.css', './manifest.webmanifest',
  './js/core.js', './js/crypto.js', './js/cloud.js', './js/store.js', './js/calc.js', './js/ui.js', './js/views.js', './js/forms.js', './js/app.js',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
