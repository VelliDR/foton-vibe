import { calculateNpfAdvanced, evaluateOptics, calculateSensorRecipe, calculatePixelPitch } from './exposure.js';
import { getSunTimes, getMoonStatus, estimateBortleOffline } from './astro.js';
import { getRandomVibe } from './vibe.js';
import { getWeatherData, getNearbySpots, calculateDistance } from './api.js';

// ==========================================
// 1. UYGULAMA DURUMU (STATE) & SABİTLER
// ==========================================
export const state = {
    currentTab: 'dashboard',
    coords: {
        lat: 39.9333,
        lon: 32.8500
    },
    baseBortle: 3, // Başlangıç taban ışık kirliliği
    bortle: 4,     // Dinamik (Ay etkisi dahil) nihai Bortle skoru
    gpsLocked: false
};

const TAB_TITLES = {
    dashboard: 'GÖSTERGE PANELİ',
    fikir: 'FOTON ESİNTİSİ',
    hesaplama: 'POZLAMA LABORATUVARI',
    rota: 'ROTA KEŞİF DEDEKTÖRÜ'
};

const TABS = Object.keys(TAB_TITLES);

// ==========================================
// 2. SEKMELER VE UI KONTROLÜ
// ==========================================
function switchTab(targetTabId) {
    if (!TABS.includes(targetTabId)) return;

    TABS.forEach(tabId => {
        const section = document.getElementById(`tab-${tabId}`);
        const button = document.getElementById(`btn-${tabId}`);
        
        if (section && button) {
            if (tabId === targetTabId) {
                section.classList.remove('hidden');
                button.classList.add('bg-m3RedDark', 'text-m3Red');
                button.classList.remove('text-gray-600');
            } else {
                section.classList.add('hidden');
                button.classList.remove('bg-m3RedDark', 'text-m3Red');
                button.classList.add('text-gray-600');
            }
        }
    });

    const pageTitleElem = document.getElementById('page-title');
    if (pageTitleElem) {
        pageTitleElem.innerText = TAB_TITLES[targetTabId];
    }
    
    state.currentTab = targetTabId;

    if (targetTabId === 'fikir') {
        updateVibeUI();
    }
}

function updateVibeUI() {
    const vibe = getRandomVibe();
    const slotElem = document.getElementById('vibe-slot');
    const textElem = document.getElementById('vibe-text');

    if (slotElem && textElem) {
        slotElem.innerText = `${vibe.slot} - ${vibe.baslik}`;
        textElem.innerText = `"${vibe.metin}"`;
    }
}

// ==========================================
// 3. ASTRONOMİK HESAPLAMALAR VE KONTROLLER
// ==========================================
async function updateAstronomicalUI() {
    const today = new Date();

    // Güneş Zamanları Güncelleme
    const sunTimes = getSunTimes(state.coords.lat, state.coords.lon, today);
    const sunSetElem = document.getElementById('sun-set');
    const darkStartElem = document.getElementById('dark-start');
    if (sunSetElem) sunSetElem.innerText = sunTimes.sunset;
    if (darkStartElem) darkStartElem.innerText = sunTimes.astroDark;

    // Ay Evresi Güncelleme
    const moon = getMoonStatus(today);
    const moonPhaseElem = document.getElementById('moon-phase');
    if (moonPhaseElem) {
        moonPhaseElem.innerText = `${moon.phaseName} (%${moon.phasePercent})`;
    }

    // Bortle Tahmini Güncelleme
    const bortleResult = estimateBortleOffline(state.coords.lat, state.coords.lon, today, state.baseBortle);
    state.bortle = bortleResult.score;

    const bortleElem = document.getElementById('bortle-value');
    if (bortleElem) {
        bortleElem.innerText = `Bortle ${bortleResult.score} (${bortleResult.reason})`;
    }

    // Canlı Hava Durumu Güncelleme
    const cloudElem = document.getElementById('cloud-status');
    if (cloudElem) {
        cloudElem.innerText = "Yükleniyor...";
        try {
            const weather = await getWeatherData(state.coords.lat, state.coords.lon);
            cloudElem.innerText = `%${weather.clouds} Bulut, ${weather.wind} km/s Rüzgar`;
        } catch (err) {
            cloudElem.innerText = "Hava Tahmini Alınamadı";
            console.error("Hava durumu API hatası:", err);
        }
    }
}

// ==========================================
// 4. KONUM VE KOORDİNAT YÖNETİMİ
// ==========================================
function requestLocation() {
    const statusText = document.getElementById('gps-status');
    const gpsDot = document.getElementById('gps-dot');

    if (!statusText || !gpsDot) return;

    if (!navigator.geolocation) {
        statusText.innerText = "GPS Yok";
        gpsDot.className = "w-2 h-2 rounded-full bg-red-800";
        return;
    }

    statusText.innerText = "Aranıyor...";
    gpsDot.className = "w-2 h-2 rounded-full bg-amber-600 animate-pulse";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            state.coords.lat = position.coords.latitude;
            state.coords.lon = position.coords.longitude;
            state.gpsLocked = true;

            const latInput = document.getElementById('input-lat');
            const lonInput = document.getElementById('input-lon');
            if (latInput) latInput.value = state.coords.lat.toFixed(4);
            if (lonInput) lonInput.value = state.coords.lon.toFixed(4);

            statusText.innerText = "GPS Kilitlendi";
            gpsDot.className = "w-2 h-2 rounded-full bg-emerald-600";

            updateAstronomicalUI();
        },
        (error) => {
            let errorMsg = "GPS Hatası";
            if (error.code === error.PERMISSION_DENIED) {
                errorMsg = "İzin Reddedildi";
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                errorMsg = "Sinyal Yok / Kapalı";
            } else if (error.code === error.TIMEOUT) {
                errorMsg = "Zaman Aşımı";
            }

            statusText.innerText = errorMsg;
            gpsDot.className = "w-2 h-2 rounded-full bg-red-800";
            console.warn("GPS Hatası Detayı:", error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function applyManualCoordinates() {
    const latInputElem = document.getElementById('input-lat');
    const lonInputElem = document.getElementById('input-lon');
    if (!latInputElem || !lonInputElem) return;

    const latInput = parseFloat(latInputElem.value);
    const lonInput = parseFloat(lonInputElem.value);

    if (isNaN(latInput) || isNaN(lonInput)) {
        alert("Lütfen geçerli bir enlem ve boylam değeri girin.");
        return;
    }

    state.coords.lat = latInput;
    state.coords.lon = lonInput;

    const statusText = document.getElementById('gps-status');
    const gpsDot = document.getElementById('gps-dot');
    
    if (statusText) statusText.innerText = "Manuel Konum";
    if (gpsDot) gpsDot.className = "w-2 h-2 rounded-full bg-amber-600";

    updateAstronomicalUI();
}

async function handleRouteSearch() {
    const resultsContainer = document.getElementById('route-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `<div class="text-center py-6 text-xs text-m3RedMuted animate-pulse">Yakın çevre taranıyor (Overpass API)...</div>`;

    try {
        const spots = await getNearbySpots(state.coords.lat, state.coords.lon);

        if (spots.length === 0) {
            resultsContainer.innerHTML = `<div class="text-center py-6 text-xs text-m3RedMuted/60">5 km yakınlarda uygun tarihi/doğal nokta bulunamadı.</div>`;
            return;
        }

        const mappedSpots = spots.map(spot => {
            const spotLat = spot.lat || (spot.center ? spot.center.lat : null);
            const spotLon = spot.lon || (spot.center ? spot.center.lon : null);

            if (!spotLat || !spotLon) return null;

            const dist = calculateDistance(state.coords.lat, state.coords.lon, spotLat, spotLon);

            const name = spot.tags.name || spot.tags.historic || spot.tags.natural || spot.tags.tourism || "Bilinmeyen Nokta";
            const category = spot.tags.historic ? "Tarihi / Harabe" : (spot.tags.natural ? "Doğal Tepe/Yapı" : "Manzara Noktası");

            return { name, dist, category };
        }).filter(s => s !== null);

        mappedSpots.sort((a, b) => a.dist - b.dist);

        resultsContainer.innerHTML = "";
        mappedSpots.slice(0, 10).forEach(spot => {
            const div = document.createElement('div');
            div.className = "bg-m3Surface p-3 rounded-xl border border-m3Border text-xs space-y-1 mb-2";
            
            const headerDiv = document.createElement('div');
            headerDiv.className = "flex justify-between font-bold";
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `🏛️ ${spot.name}`;
            
            const distSpan = document.createElement('span');
            distSpan.className = "text-m3RedMuted font-mono";
            distSpan.textContent = `${spot.dist.toFixed(2)} km`;
            
            headerDiv.appendChild(nameSpan);
            headerDiv.appendChild(distSpan);

            const descP = document.createElement('p');
            descP.className = "text-[10px] text-m3RedMuted/70";
            descP.textContent = `Kategori: ${spot.category}`;

            div.appendChild(headerDiv);
            div.appendChild(descP);
            resultsContainer.appendChild(div);
        });

    } catch (err) {
        resultsContainer.innerHTML = `<div class="text-center py-6 text-xs text-m3RedMuted/60">Bağlantı hatası: Sunucu meşgul veya internetiniz yok.</div>`;
        console.error("Rota arama hatası:", err);
    }
}

// ==========================================
// 5. POZLAMA LABORATUVARI KONTROLLERİ
// ==========================================
function updateCalculatedPitchUI() {
    const sensorTypeElem = document.getElementById('select-sensor');
    const mpElem = document.getElementById('input-mp');
    const outputElem = document.getElementById('output-calculated-pitch');

    if (!sensorTypeElem || !mpElem || !outputElem) return;

    const sensorType = sensorTypeElem.value;
    const megapixels = parseFloat(mpElem.value);

    if (isNaN(megapixels) || megapixels <= 0) return;

    const pitch = calculatePixelPitch(sensorType, megapixels);
    outputElem.innerText = `${pitch.toFixed(2)} µm`;
}

function handleExposureCalculation() {
    const focalElem = document.getElementById('input-focal');
    const apertureElem = document.getElementById('input-aperture');
    const sensorTypeElem = document.getElementById('select-sensor');
    const mpElem = document.getElementById('input-mp');
    const decElem = document.getElementById('select-dec');

    if (!focalElem || !apertureElem || !sensorTypeElem || !mpElem || !decElem) return;

    const focal = parseFloat(focalElem.value);
    const aperture = parseFloat(apertureElem.value);
    const sensorType = sensorTypeElem.value;
    const megapixels = parseFloat(mpElem.value);
    const declination = parseFloat(decElem.value);

    if (isNaN(focal) || isNaN(aperture) || isNaN(megapixels) || isNaN(declination)) {
        alert("Lütfen tüm alanları geçerli sayılarla doldurun.");
        return;
    }

    const pitch = calculatePixelPitch(sensorType, megapixels);
    const t = calculateNpfAdvanced(focal, aperture, pitch, declination);
    const warnings = evaluateOptics(focal, aperture);
    const recipe = calculateSensorRecipe(t, aperture, state.bortle);

    const npfOut = document.getElementById('output-npf');
    const isoOut = document.getElementById('output-iso');
    const stackOut = document.getElementById('output-stack');

    if (npfOut) npfOut.innerText = `${t.toFixed(2)}s`;
    if (isoOut) isoOut.innerText = `ISO ${recipe.iso}`;
    if (stackOut) stackOut.innerText = `${recipe.stack} Kare`;

    const warningsContainer = document.getElementById('output-warnings');
    if (warningsContainer) {
        warningsContainer.innerHTML = "";
        warnings.forEach(warn => {
            const p = document.createElement('p');
            p.innerText = warn;
            warningsContainer.appendChild(p);
        });
    }
}

// ==========================================
// 6. OLAY DİNLEYİCİLERİ VE BAŞLANGIÇ
// ==========================================
function initEventListeners() {
    TABS.forEach(tabId => {
        const btn = document.getElementById(`btn-${tabId}`);
        if (btn) btn.addEventListener('click', () => switchTab(tabId));
    });

    const bindClick = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
    };

    const bindInput = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
    };

    // Yapay ışık seçimi değiştiğinde taban kirliliği güncelle
    bindInput('select-environment', 'change', (e) => {
        state.baseBortle = parseInt(e.target.value);
        updateAstronomicalUI();
    });

    bindClick('btn-location-gps', requestLocation);
    bindClick('btn-location-apply', applyManualCoordinates);
    bindClick('btn-calc-exposure', handleExposureCalculation);
    bindClick('btn-vibe-refresh', updateVibeUI);
    bindClick('btn-search-route', handleRouteSearch);

    bindInput('select-sensor', 'change', updateCalculatedPitchUI);
    bindInput('input-mp', 'input', updateCalculatedPitchUI);
}

window.addEventListener('DOMContentLoaded', () => {
    // HTML'deki seçili çevresel ışık seviyesini başlangıç durumuna senkronize et
    const envElem = document.getElementById('select-environment');
    if (envElem) {
        state.baseBortle = parseInt(envElem.value);
    }

    initEventListeners();
    applyManualCoordinates(); 
    updateCalculatedPitchUI();

    // Dinamik ve hatasız alt dizin (Subdirectory) uyumlu SW kayıt yolu bulucu
    if ('serviceWorker' in navigator) {
        let swPath = window.location.pathname;
        if (!swPath.endsWith('/') && !swPath.includes('.')) {
            swPath += '/';
        } else {
            swPath = swPath.substring(0, swPath.lastIndexOf('/') + 1);
        }
        const swUrl = `${swPath}service-worker.js`;

        navigator.serviceWorker.register(swUrl)
            .then((reg) => console.log('✅ Service Worker başarıyla kaydedildi. Kapsam:', reg.scope))
            .catch((err) => console.warn('❌ Service Worker kaydı başarısız:', err));
    }
});