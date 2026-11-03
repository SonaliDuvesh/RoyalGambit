const CACHE_NAME = 'royal-gambit-v1';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon-32x32.png',
  './favicon-16x16.png',
  './apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/board/chessboard.png',
  './assets/pieces/white/king.png',
  './assets/pieces/white/queen.png',
  './assets/pieces/white/rook.png',
  './assets/pieces/white/bishop.png',
  './assets/pieces/white/knight.png',
  './assets/pieces/white/pawn.png',
  './assets/pieces/black/king.png',
  './assets/pieces/black/queen.png',
  './assets/pieces/black/rook.png',
  './assets/pieces/black/bishop.png',
  './assets/pieces/black/knight.png',
  './assets/pieces/black/pawn.png',
  './assets/sounds/capture.mp3',
  './assets/sounds/move.mp3',
  './assets/sounds/check.mp3',
  './assets/sounds/castle.mp3',
  './assets/sounds/game-end.mp3',
  './assets/sounds/notify.mp3'
];

// Install event: Pre-cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Some assets could not be pre-cached:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network-first for navigation & API, Cache-first for images/assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bypass non-GET requests and Socket.io / API endpoints
  if (
    request.method !== 'GET' ||
    url.pathname.includes('/socket.io') ||
    url.pathname.startsWith('/api') ||
    url.hostname.includes('supabase.co')
  ) {
    return;
  }

  // Static images and fonts: Cache-first, then network
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.includes('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          return networkResponse;
        });
      })
    );
    return;
  }

  // HTML and JS: Network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Network offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

