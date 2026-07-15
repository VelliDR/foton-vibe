/**
 * SERVICE-WORKER.JS - Çevrimdışı Çalışma ve Önbellek Yönetim Motoru
 */

// Sürüm her değiştiğinde tarayıcı eski önbelleği silip yenisini kurar
const CACHE_NAME = 'foton-vibe-v1.2';

const ASSETS_TO_CACHE = [
  './',                  // KÖK DİZİN: Çevrimdışı açılış için en kritik satır!
  './index.html',
  './js/app.js',
  './js/astro.js',
  './js/exposure.js',
  './js/vibe.js',
  './js/api.js',
  './manifest.json',
  './icon-192.png',      // İkonların sunucuda mevcut olduğundan emin olmalısın
  './icon-512.png'
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
        // Yeni güncellenmiş kodların anında aktif olması için bekleme sürecini atla
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
      // Servis işçisinin kontrolü anında devralmasını sağla (Sekme kapatma zorunluluğu kalkar)
      return self.clients.claim();
    })
  );
});

// 3. İstek Yakalama (Fetch): Önce Önbelleğe Bak, Yoksa Ağa Git
self.addEventListener('fetch', (event) => {
    // Sadece yerel GET isteklerini önbellekten oku (Harici API'ler muaf)
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(event.request).catch((err) => {
                // Güvenli kontrol: acceptHeader null ise çökmesini engelle
                const acceptHeader = event.request.headers.get('accept');
                if (acceptHeader && acceptHeader.includes('text/html')) {
                    return caches.match('./index.html');
                }
                // HTML dışındaki başarısızlıkları tarayıcıya doğal yolla fırlat, SW'yi kilitleme
                throw err;
            });
        })
    );
});