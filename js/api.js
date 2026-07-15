/**
 * API.JS - Canlı Hava Durumu (Open-Meteo) ve Coğrafi Keşif (Overpass) Bağlantı Modülü
 */

// Alternatif Overpass Sunucu Havuzu (Biri çökerse diğeri devreye girer)
const OVERPASS_INSTANCES = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter'
];

/**
 * Open-Meteo API üzerinden anlık rüzgar ve bulutluluk durumunu çeker.
 */
export async function getWeatherData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloud_cover,wind_speed_10m&timezone=auto`;
    
    const response = await fetch(url);
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
 * Önbellek ve Çoklu Sunucu Desteği içerir.
 */
export async function getNearbySpots(lat, lon, radius = 5000) {
    // 1. ADIM: Önbellek (Cache) Kontrolü
    // Koordinatları virgülden sonra 2 basamağa yuvarlıyoruz (~1.1 km hassasiyet). 
    // Böylece GPS hafifçe oynasa bile aynı bölgede kalındığı sürece gereksiz istek atılmaz.
    const cacheKey = `foton_spots_${lat.toFixed(2)}_${lon.toFixed(2)}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
        const { timestamp, elements } = JSON.parse(cachedData);
        const ageInHours = (Date.now() - timestamp) / (1000 * 60 * 60);

        // Eğer veriler 24 saatten daha yeniyse doğrudan hafızadan yükle (Sıfır internet kullanımı!)
        if (ageInHours < 24) {
            console.log("📍 Veriler yerel önbellekten yüklendi.");
            return elements;
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
            const response = await fetch(instanceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: "data=" + encodeURIComponent(query)
            });

            if (response.ok) {
                const data = await response.json();
                const elements = data.elements || [];

                // 3. ADIM: Başarılı Sonucu Önbelleğe Yaz
                const cachePayload = {
                    timestamp: Date.now(),
                    elements: elements
                };
                localStorage.setItem(cacheKey, JSON.stringify(cachePayload));

                return elements;
            } else {
                console.warn(`⚠️ Sunucu hata verdi: ${instanceUrl} (Kod: ${response.status})`);
            }
        } catch (err) {
            console.warn(`⚠️ Bağlantı başarısız: ${instanceUrl}`, err);
            lastError = err;
        }
    }

    // Eğer tüm sunucular denendi ve hiçbiri yanıt vermediyse eski tarihli önbelleğe sığın
    if (cachedData) {
        console.warn("🚨 Tüm canlı sunucular çöktü! Süresi geçmiş eski yerel veriler yükleniyor.");
        const { elements } = JSON.parse(cachedData);
        return elements;
    }

    throw lastError || new Error("Hiçbir Overpass sunucusundan yanıt alınamadı.");
}

/**
 * İki koordinat arasındaki kuş uçuşu mesafeyi (km) hesaplar (Haversine Formülü)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Dünya yarıçapı (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}