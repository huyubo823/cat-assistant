// Self-destruct Service Worker — 清除旧缓存后注销自身
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (n) { return caches.delete(n); }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    self.clients.claim().then(function () {
      // 通知所有页面刷新
      return self.registration.unregister().then(function () {
        return self.clients.matchAll().then(function (clients) {
          clients.forEach(function (client) { client.navigate(client.url); });
        });
      });
    })
  );
});
