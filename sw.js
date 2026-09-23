/* Privacy-safe offline shell: never cache accounts, complaints, HTML, API or Supabase responses. */
const OFFLINE_CACHE = 'palmeirais-offline-v1';
const OFFLINE_URL = new URL('./offline.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name.startsWith('palmeirais-offline-') && name !== OFFLINE_CACHE)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.mode !== 'navigate' || url.origin !== self.location.origin) return;

  // Always ask the network for pages, especially when someone is signed in.
  // The only cached response is the generic, public offline.html.
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached || new Response('Sem conexão.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    })
  );
});
