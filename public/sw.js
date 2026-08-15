// Minimal service worker. Its only job is to satisfy the browser's
// installability requirement (Chrome/Edge won't offer "Install app" without
// a registered service worker that controls fetches) — CampusLink is
// online-only by design (every page depends on live Supabase data), so this
// deliberately does no caching and just lets every request pass straight
// through to the network.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No-op — intentionally not intercepting anything.
});
