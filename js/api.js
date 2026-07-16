/**
 * API.JS - Canlı Hava Durumu (Open-Meteo) ve Coğrafi Keşif (Overpass) Bağlantı Modülü
 */

const OVERPASS_INSTANCES = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter'
];

const toRad = (value) => (value * Math.PI) / 180;

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options;
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

function safeSetLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.warn("⚠️ LocalStorage limiti aşıldı! Eski önbellekler temizleniyor...");
            Object.keys(localStorage)
                .filter(k => k.startsWith('foton_spots_'))
                .forEach(k => localStorage.removeItem(k));
            
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (retryError) {
                console.error("❌ LocalStorage yazma hatası:", retryError);
            }
        }
    }
}

export async function getWeatherData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloud_cover,wind_speed_10m&timezone=auto`;
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

export async function getNearbySpots(lat, lon, radius = 5000) {
    const cacheKey = `foton_spots_${lat.toFixed(2)}_${lon.toFixed(2)}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
        try {
            const { timestamp, elements } = JSON.parse(cachedData);
            const ageInHours = (Date.now() - timestamp) / (1000 * 60 * 60);

            if (ageInHours < 24) {
                return elements;
            }
        } catch (e) {
            console.warn("⚠️ Önbellek bozuk, yeniden istenecek.");
        }
    }

    const query = `
        [out:json][timeout:15];
        (
          nwr(around:${radius},${lat},${lon})["historic"~"archaeological_site|monument|ruins"];
          nwr(around:${radius},${lat},${lon})["natural"~"peak|cave_entrance"];
          nwr(around:${radius},${lat},${lon})["tourism"~"viewpoint"];
        );
        out center;
    `;

    let lastError = null;

    for (const instanceUrl of OVERPASS_INSTANCES) {
        try {
            const response = await fetchWithTimeout(instanceUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: "data=" + encodeURIComponent(query),
                timeout: 10000
            });

            if (response.ok) {
                const data = await response.json();
                const elements = data.elements || [];
                safeSetLocalStorage(cacheKey, { timestamp: Date.now(), elements });
                return elements;
            }
        } catch (err) {
            lastError = err;
        }
    }

    if (cachedData) {
        try {
            const { elements } = JSON.parse(cachedData);
            return elements;
        } catch (e) {}
    }

    throw lastError || new Error("Overpass sunucularına bağlanılamadı.");
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}