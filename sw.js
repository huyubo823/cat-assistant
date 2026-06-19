const CACHE_NAME = 'cat-assistant-v4';

const PRECACHE_URLS = [
  './',
  'index.html',
  'css/styles.css',
  'js/utils.js',
  'js/data.js',
  'js/tasks.js',
  'js/ai.js',
  'js/ui.js',
  'js/app.js',
  'knowledge/knowledge-bundle.json'
];

// Install: precache all core app files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching app shell...');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Precache complete, skipping waiting.');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Precache failed:', err);
      })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming clients.');
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first, network fallback. API calls go network-only.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // API calls: network-only (don't cache)
  if (url.hostname === 'api.deepseek.com') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        // Cache valid responses for next time
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(err => {
        console.error('[SW] Fetch failed:', err);
        // Could return a fallback page here if needed
      });
    })
  );
});
