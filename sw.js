// Service worker : permet d'ouvrir l'application sans Internet.
// Stratégie "réseau d'abord" : on prend la dernière version en ligne si possible,
// sinon la copie gardée en mémoire. Changer VERSION force le renouvellement de la copie.

const VERSION = 'covoiturage-v4';
const FILES = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    // no-cache : on redemande toujours au site s'il y a plus récent (sinon le téléphone peut
    // mélanger une page neuve et un ancien app.js gardé quelques minutes).
    fetch(event.request, { cache: 'no-cache' })
      .then(response => {
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(VERSION).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
