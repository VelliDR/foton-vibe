/**
 * SERVICE-WORKER.JS - Çevrimdışı Çalışma ve Önbellek Yönetim Motoru
 */

const CACHE_NAME = 'foton-vibe-v1.8';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './js/app.js',
  './js/astro.js',
  './js/exposure.js',
  './js/vibe.js',
  './js/api.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Çekirdek dosyalar önbelleğe alınıyor...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('❌ Kurulum hatası (Dosyalarınızı kontrol edin):', err);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🧹 Eski önbellek siliniyor:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
    const isLocal = event.request.url.startsWith(self.location.origin);
    const isTailwindCDN = event.request.url.startsWith('https://cdn.tailwindcss.com');

    if (event.request.method !== 'GET' || (!isLocal && !isTailwindCDN)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(event.request).catch((err) => {
                const acceptHeader = event.request.headers.get('accept');
                if (acceptHeader && acceptHeader.includes('text/html')) {
                    return caches.match('./index.html');
                }
                throw err;
            });
        })
    );
});