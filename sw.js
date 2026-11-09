/* Repbook service worker: cache-first app shell so it works in a gym basement.
   Bump CACHE_VERSION on every release so phones pick up the new files. */
var CACHE_VERSION = 'repbook-v1';

var SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './fonts/nunito-400.woff2',
  './fonts/nunito-600.woff2',
  './fonts/nunito-700.woff2',
  './fonts/nunito-800.woff2',
  './fonts/nunito-900.woff2'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      // 'reload' skips the HTTP cache so a new release never caches stale files.
      return cache.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf('repbook-') === 0 && k !== CACHE_VERSION;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') {
          return cache.match('./index.html').then(function (shell) {
            return shell || fetch(req);
          });
        }
        return fetch(req);
      });
    })
  );
});
