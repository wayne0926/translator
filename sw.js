const CACHE_NAME = 'ai-translator-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-128x128.png',
  '/icons/icon-512x512.png'
  // Add paths to icons later if needed
];

// Install event: Cache core assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching core assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        self.skipWaiting(); // Activate worker immediately
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        return self.clients.claim(); // Take control of uncontrolled clients
      })
  );
});

// Fetch event: Serve cached assets or fetch from network
self.addEventListener('fetch', event => {
  // We only handle GET requests
  if (event.request.method !== 'GET') {
      return;
  }

  // Strategy: Cache first for known assets, network otherwise.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
        // Try to get the response from the cache.
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
            // If found in cache, return it.
            console.log('[Service Worker] Returning from cache:', event.request.url);
            return cachedResponse;
        }

        // If not found in cache, fetch from the network.
        console.log('[Service Worker] Fetching from network:', event.request.url);
        // Don't cache network responses by default in this strategy,
        // only the initial urlsToCache are proactively cached.
        return fetch(event.request);
    })
  );
}); 