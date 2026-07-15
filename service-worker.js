const CACHE_NAME = 'foton-vibe-v1';
const ASSETS_TO_CACHE = [
  './index.html',
  './js/app.js',
  './js/astro.js',
  './js/exposure.js',
  './js/vibe.js',
  './js/api.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. Kurulum (Install): Dosyaları Önbelleğe Al
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Statik dosyalar önbelleğe alınıyor...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Aktivasyon (Activate): Eski Önbellekleri Temizle
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
    })
  );
});

// 3. İstek Yakalama (Fetch): Önce Önbelleğe Bak, Yoksa Ağa Git
self.addEventListener('fetch', (event) => {
    // Sadece GET isteklerini ve yerel dosyaları önbellekten oku
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request);
        })
    );
});