// Service worker minimal : cache "network-first" avec repli hors-ligne (PWA).
const CACHE = 'gt-auto-prive-v2';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/icon.svg'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('push', (e) => {
  let payload = {};
  try {
    payload = e.data ? e.data.json() : {};
  } catch {
    payload = { body: e.data ? e.data.text() : '' };
  }
  e.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Déjà dans l’app : la cloche se met à jour, pas de bannière en double.
    if (windows.some((c) => c.focused)) {
      windows.forEach((c) => c.postMessage({ type: 'notifications-updated' }));
      return;
    }
    await self.registration.showNotification(payload.title || 'GT Auto Privé', {
      body: payload.body || '',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: payload.url || '/', link: payload.link || null },
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const link = e.notification.data?.link || null;
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = all.find((c) => c.url.startsWith(self.location.origin));
    if (client) {
      await client.focus();
      client.postMessage({ type: 'notification-click', link });
      return;
    }
    await self.clients.openWindow(url);
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // En dev local, ne pas intercepter : le cache casserait le rechargement de Vite.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;
  // Ne jamais mettre en cache l'API (données personnelles, sessions).
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin) || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/'))),
  );
});
