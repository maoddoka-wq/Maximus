const DRIVER_CACHE_PREFIX = 'maximus-driver-shell-';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(DRIVER_CACHE_PREFIX))
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET'
    || url.origin !== self.location.origin
    || url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // The driver app deliberately stays network-only: private driver and trip data
  // must never be cached by a shared browser service worker.
  event.respondWith(fetch(request));
});