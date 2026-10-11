// ==============================================================================
// Velocity Turf - Production Progressive Web App Service Worker
// Version: 2.0.0
// Conforms to Lighthouse / Web.dev criteria for PWA Installability & Reliability
// ==============================================================================

const CACHE_VERSION = 'v2';
const STATIC_CACHE_NAME = `velocity-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `velocity-dynamic-${CACHE_VERSION}`;
const OFFLINE_CACHE_NAME = `velocity-offline-${CACHE_VERSION}`;

// Core static assets to precache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-192x192-maskable.png',
  '/icons/icon-512x512-maskable.png',
  '/icons/apple-touch-icon.png'
];

// 1. INSTALL EVENT: Precache static core assets and skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn('[SW] Non-critical precache failure on individual asset:', err);
      }
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE EVENT: Clean up stale caches from previous versions & claim clients
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, OFFLINE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => {
            console.log('[SW] Purging outdated cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH EVENT: Intelligent routing based on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass cache on localhost during development so changes appear immediately
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // Ignore non-HTTP(S) schemes (e.g. chrome-extension://, file://)
  if (!url.protocol.startsWith('http')) return;

  // Bypass cache for non-GET requests (mutations, bookings, login)
  if (request.method !== 'GET') return;

  // Bypass cache for API endpoints, Supabase backend calls, and server actions
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    request.headers.get('accept')?.includes('application/json')
  ) {
    return;
  }

  // A. NAVIGATION REQUESTS (Full page / document visits): Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;

          const offlineFallback = await caches.match('/offline.html');
          return offlineFallback || new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // B. STATIC ASSETS: Network-First with cache fallback to guarantee fresh bundles
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image';

  if (isStaticAsset) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // C. DEFAULT FALLBACK FOR ALL OTHER GET REQUESTS: Network with dynamic cache fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse)
      );
    })
  );
});

// 4. MANUAL UPDATE / SKIP WAITING HOOK
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
