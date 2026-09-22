/* App-shell service worker: intentionally avoids caching authenticated content. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});
// No fetch handler: requests continue to the network; private data is never stored in SW caches.
