// Service worker. Originally just satisfied the browser's installability
// requirement (Chrome/Edge won't offer "Install app" without a registered
// service worker that controls fetches) — CampusLink is online-only by
// design (every page depends on live Supabase data), so it still
// deliberately does no caching and lets every request pass straight through
// to the network. It now also handles Web Push: this is the piece that lets
// a notification arrive even while CampusLink itself is fully closed, since
// the browser wakes the service worker on its own when a push arrives.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No-op — intentionally not intercepting anything.
});

self.addEventListener('push', (event) => {
  let payload = { title: 'CampusLink', body: 'You have a new update.', url: '/home' };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      // Not JSON — fall back to treating it as a plain-text body.
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/home' },
      tag: payload.tag || undefined,
    })
  );
});

// Clicking the notification focuses an already-open CampusLink tab/window
// if one exists (navigating it to the right place), rather than always
// opening a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/home';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate?.(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
