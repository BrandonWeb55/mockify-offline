const CACHE_NAME = 'mockify-offline-v3.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon.ico',
  './assets/css/index.css',
  './assets/css/mobile.css',
  './assets/js/core.js',
  './assets/js/views.js',
  './assets/js/audio.js',
  './assets/js/ui.js'
];

// Install: Cache all offline shell assets immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
});

// Activate: Clean up all old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate with ignoreSearch for local assets, fallback for offline navigations
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // If request is for audio blobs, media, or data URLs, bypass service worker
  if (url.protocol === 'blob:' || url.protocol === 'data:' || url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav')) {
    return;
  }

  // Handle HTML navigation: network-first with cache fallback
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html', { ignoreSearch: true })
            .then((res) => res || caches.match('./', { ignoreSearch: true }));
        })
    );
    return;
  }

  // Handle local app assets (CSS, JS, images, icons):
  // Cache-first / Stale-While-Revalidate with ignoreSearch guarantees 100% offline availability in airplane mode
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => null);

        // Return instant cached response if present; otherwise await network
        return cachedResponse || fetchPromise.then((res) => {
          if (res) return res;
          return caches.match(url.pathname, { ignoreSearch: true });
        });
      })
    );
    return;
  }

  // External requests (e.g. fonts): try fetch, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
