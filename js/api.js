/**
 * API.JS - Canlı Hava Durumu (Open-Meteo) ve Coğrafi Keşif (Overpass) Bağlantı Modülü
 */

// Alternatif Overpass Sunucu Havuzu (Biri çökerse diğeri devreye girer)
const OVERPASS_INSTANCES = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter'
];

// Dereceyi radyana çeviren yardımcı fonksiyon
const toRad = (value) => (value * Math.PI) / 180;

/**
 * Belirlenen süre içinde yanıt vermeyen istekleri iptal eden güvenli fetch fonksiyonu
 */
async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options; // Varsayılan 8 saniye zaman aşımı
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

/**
 * LocalStorage dolduğunda eski önbellekleri temizleyip güvenle yazan fonksiyon
 */
function safeSetLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.warn("⚠️ LocalStorage limiti aşıldı! Eski foton_spots önbellekleri temizleniyor...");
            // Sadece bu uygulamaya ait eski rota önbelleklerini sil
            Object.keys(localStorage)
                .filter(k => k.startsWith('foton_spots_'))
                .forEach(k => localStorage.removeItem(k));
            
            // Temizlik sonrası tekrar yazmayı dene
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (retryError) {
                console.error("❌ Temizliğe rağmen LocalStorage yazma hatası:", retryError);
            }
        }
    }
}

/**
 * Open-Meteo API üzerinden anlık rüzgar ve bulutluluk durumunu çeker.
 */
export async function getWeatherData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloud_cover,wind_speed_10m&timezone=auto`;
    
    // Hava durumu için de 8 saniye timeout uyguluyoruz
    const response = await fetchWithTimeout(url, { timeout: 8000 });
    if (!response.ok) {
        throw new Error("Hava durumu verisi alınamadı.");
    }
    
    const data = await response.json();
    return {
        clouds: data.current.cloud_cover,
        wind: data.current.wind_speed_10m
    };
}

/**
 * Overpass API üzerinden 5 km çapındaki tarihi harabeleri ve manzara noktalarını çeker.
 * Önbellek, Zaman Aşımı ve Çoklu Sunucu Desteği içerir.
 */
export async function getNearbySpots(lat, lon, radius = 5000) {
    // 1. ADIM: Önbellek (Cache) Kontrolü
    const cacheKey = `foton_spots_${lat.toFixed(2)}_${lon.toFixed(2)}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
        try {
            const { timestamp, elements } = JSON.parse(cachedData);
            const ageInHours = (Date.now() - timestamp) / (1000 * 60 * 60);

            // 24 saatten taze verileri doğrudan hafızadan yükle (Çevrimdışı dostu)
            if (ageInHours < 24) {
                console.log("📍 Veriler yerel önbellekten başarıyla yüklendi.");
                return elements;
            }
        } catch (e) {
            console.warn("⚠️ Önbellek verisi bozuk, yeniden sorgulanacak.");
        }
    }

    // Overpass Sorgu Şablonu
    const query = `
        [out:json][timeout:15];
        (
          nwr(around:${radius},${lat},${lon})["historic"~"archaeological_site|monument|ruins"];
          nwr(around:${radius},${lat},${lon})["natural"~"peak|cave_entrance"];
          nwr(around:${radius},${lat},${lon})["tourism"~"viewpoint"];
        );
        out center;
    `;

    // 2. ADIM: Alternatif Sunucuları Sırayla Deneme
    let lastError = null;

    for (const instanceUrl of OVERPASS_INSTANCES) {
        try {
            console.log(`🔗 Sorgulanıyor: ${instanceUrl}`);
            
            // Zaman aşımı korumalı POST isteği
            const response = await fetchWithTimeout(instanceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: "data=" + encodeURIComponent(query),
                timeout: 10000 // Sunucu başına maksimum 10 saniye tahammül et
            });

            if (response.ok) {
                const data = await response.json();
                const elements = data.elements || [];

                // 3. ADIM: Başarılı Sonucu Önbelleğe Güvenle Yaz
                const cachePayload = {
                    timestamp: Date.now(),
                    elements: elements
                };
                safeSetLocalStorage(cacheKey, cachePayload);

                return elements;
            } else {
                console.warn(`⚠️ Sunucu hata kodu döndürdü: ${instanceUrl} (Kod: ${response.status})`);
            }
        } catch (err) {
            console.warn(`⚠️ Bağlantı başarısız veya zaman aşımı: ${instanceUrl}`, err);
            lastError = err;
        }
    }

    // Eğer tüm sunucular denendi ve hiçbiri yanıt vermediyse, süresi geçmiş eski önbelleğe sığın
    if (cachedData) {
        console.warn("🚨 Tüm canlı sunucular çöktü veya ulaşılamaz durumda! Eski yerel veriler yükleniyor.");
        try {
            const { elements } = JSON.parse(cachedData);
            return elements;
        } catch (e) {
            // Önbellek de okunamaz durumdaysa hataya devam et
        }
    }

    throw lastError || new Error("Hiçbir Overpass sunucusundan yanıt alınamadı.");
}

/**
 * İki koordinat arasındaki kuş uçuşu mesafeyi (km) hesaplar (Haversine Formülü)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Dünya yarıçapı (km)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}