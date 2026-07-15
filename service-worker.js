/**
 * SERVICE-WORKER.JS - Çevrimdışı Çalışma ve Önbellek Yönetim Motoru
 */

// Sürüm yapay ışık ve hibrit Bortle kalibrasyonu için v1.4'e yükseltildi
const CACHE_NAME = 'foton-vibe-v1.4';

const ASSETS_TO_CACHE = [
  './',                  // KÖK DİZİN: Çevrimdışı açılış için en kritik satır!
  './index.html',
  './js/app.js',
  './js/astro.js',
  './js/exposure.js',
  './js/vibe.js',
  './js/api.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com' // Çevrimdışıyken tasarımın çökmemesi için CDN önbelleğe dahil edildi
];

// 1. Kurulum (Install): Dosyaları Önbelleğe Al
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
        console.error('❌ Önbelleğe alma sırasında kritik hata (Eksik dosya olabilir):', err);
      })
  );
});

// 2. Aktivasyon (Activate): Eski Önbellekleri Temizle ve Kontrolü Ele Al
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🧹 Eski ve süresi geçmiş önbellek siliniyor:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. İstek Yakalama (Fetch): Önce Önbelleğe Bak, Yoksa Ağa Git
self.addEventListener('fetch', (event) => {
    const isLocal = event.request.url.startsWith(self.location.origin);
    const isTailwindCDN = event.request.url.startsWith('https://cdn.tailwindcss.com');

    // Sadece yerel GET isteklerini ve güvenli Tailwind CDN'ini önbellekten oku
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