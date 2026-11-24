// ==============================================================================
// Velocity Turf - Admin PWA Scoped Service Worker
// Scope: /admin
// Caches: Isolated Admin Caches (velocity-admin-*)
// ==============================================================================

const APP_ROLE = 'admin';
const CACHE_VERSION = 'v1';
const STATIC_CACHE_NAME = `velocity-${APP_ROLE}-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `velocity-${APP_ROLE}-dynamic-${CACHE_VERSION}`;
const OFFLINE_CACHE_NAME = `velocity-${APP_ROLE}-offline-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/admin',
  '/offline.html',
  '/manifest-admin.webmanifest',
  '/icons/admin/icon.svg',
  '/icons/admin/icon-192x192.png',
  '/icons/admin/icon-512x512.png',
  '/icons/admin/icon-192x192-maskable.png',
  '/icons/admin/icon-512x512-maskable.png',
  '/icons/admin/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn(`[SW-${APP_ROLE}] Non-critical precache notice:`, err);
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, OFFLINE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith(`velocity-${APP_ROLE}-`) && !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;
  if (!url.protocol.startsWith('http')) return;
  if (request.method !== 'GET') return;

  // Never cache backend mutations, auth APIs, or Supabase real-time
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    request.headers.get('accept')?.includes('application/json')
  ) {
    return;
  }

  // Navigation requests: Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offlinePage = await caches.match('/offline.html');
          return offlinePage || new Response('Offline - Velocity Turf Admin', {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Static assets: Cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      });
    })
  );
});
