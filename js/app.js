import { calculateNpfAdvanced, evaluateOptics, calculateSensorRecipe, calculatePixelPitch } from './exposure.js';
import { getSunTimes, getMoonStatus, estimateBortleOffline } from './astro.js';
import { getRandomVibe } from './vibe.js';
import { getWeatherData, getNearbySpots, calculateDistance } from './api.js'; // Yeni API Importu

// ==========================================
// 1. UYGULAMA DURUMU (STATE)
// ==========================================
export const state = {
    currentTab: 'dashboard',
    coords: {
        lat: 39.9333,
        lon: 32.8500
    },
    bortle: 4,
    gpsLocked: false
};

const TAB_TITLES = {
    dashboard: 'GÖSTERGE PANELİ',
    fikir: 'FOTON ESİNTİSİ',
    hesaplama: 'POZLAMA LABORATUVARI',
    rota: 'ROTA KEŞİF DEDEKTÖRÜ'
};

// ==========================================
// 2. SEKMELER VE UI KONTROLÜ
// ==========================================
function switchTab(targetTabId) {
    const tabs = ['dashboard', 'fikir', 'hesaplama', 'rota'];
    tabs.forEach(tabId => {
        const section = document.getElementById(`tab-${tabId}`);
        const button = document.getElementById(`btn-${tabId}`);
        
        if (tabId === targetTabId) {
            section.classList.remove('hidden');
            button.classList.add('bg-m3RedDark', 'text-m3Red');
            button.classList.remove('text-gray-600');
        } else {
            section.classList.add('hidden');
            button.classList.remove('bg-m3RedDark', 'text-m3Red');
            button.classList.add('text-gray-600');
        }
    });

    document.getElementById('page-title').innerText = TAB_TITLES[targetTabId];
    state.currentTab = targetTabId;

    // Fikir sekmesine geçildiğinde otomatik vibe tetikle
    if (targetTabId === 'fikir') {
        updateVibeUI();
    }
}

// Fikir sekmesindeki metinleri güncelleyen fonksiyon
function updateVibeUI() {
    const vibe = getRandomVibe();
    document.getElementById('vibe-slot').innerText = `${vibe.slot} - ${vibe.baslik}`;
    document.getElementById('vibe-text').innerText = `"${vibe.metin}"`;
}

// ==========================================
// 3. ASTRONOMİK HESAPLAMALAR VE KONTROLLER
// ==========================================
// UI ve Hesaplamaları Tetikleyen Ana Motor (Hava durumu için async yapıldı)
async function updateAstronomicalUI() {
    const today = new Date();

    // Güneş Zamanları
    const sunTimes = getSunTimes(state.coords.lat, state.coords.lon, today);
    document.getElementById('sun-set').innerText = sunTimes.sunset;
    document.getElementById('dark-start').innerText = sunTimes.astroDark;

    // Ay Evresi
    const moon = getMoonStatus(today);
    document.getElementById('moon-phase').innerText = `${moon.phaseName} (%${moon.phasePercent})`;

    // Bortle Tahmini
    const bortleResult = estimateBortleOffline(state.coords.lat, state.coords.lon, today);
    state.bortle = bortleResult.score;

    const bortleElem = document.getElementById('bortle-value');
    if (bortleElem) {
        bortleElem.innerText = `Bortle ${bortleResult.score} (${bortleResult.reason})`;
    }

    // YENİ: Canlı Hava Durumu Bağlantısı
    const cloudElem = document.getElementById('cloud-status');
    cloudElem.innerText = "Yükleniyor...";
    try {
        const weather = await getWeatherData(state.coords.lat, state.coords.lon);
        cloudElem.innerText = `%${weather.clouds} Bulut, ${weather.wind} km/s Rüzgar`;
    } catch (err) {
        cloudElem.innerText = "Hava Tahmini Alınamadı";
    }
}

// ==========================================
// 4. KONUM VE KOORDİNAT YÖNETİMİ
// ==========================================
function requestLocation() {
    const statusText = document.getElementById('gps-status');
    const gpsDot = document.getElementById('gps-dot');

    if (!navigator.geolocation) {
        statusText.innerText = "GPS Yok";
        return;
    }

    statusText.innerText = "Aranıyor...";
    navigator.geolocation.getCurrentPosition(
        (position) => {
            state.coords.lat = position.coords.latitude;
            state.coords.lon = position.coords.longitude;
            state.gpsLocked = true;

            // Kutuları otomatik güncelle
            document.getElementById('input-lat').value = state.coords.lat.toFixed(4);
            document.getElementById('input-lon').value = state.coords.lon.toFixed(4);

            statusText.innerText = "GPS Kilitlendi";
            gpsDot.className = "w-2 h-2 rounded-full bg-emerald-600";

            updateAstronomicalUI();
        },
        () => {
            statusText.innerText = "HTTP Engeli";
            gpsDot.className = "w-2 h-2 rounded-full bg-red-800";
            // Hata durumunda mevcut manuel değerlerle hesaplamayı sürdür
            applyManualCoordinates();
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}
// Overpass Rota Keşif İşleyicisi
async function handleRouteSearch() {
    const resultsContainer = document.getElementById('route-results');
    resultsContainer.innerHTML = `<div class="text-center py-6 text-xs text-m3RedMuted animate-pulse">Yakın çevre taranıyor (Overpass API)...</div>`;

    try {
        const spots = await getNearbySpots(state.coords.lat, state.coords.lon);

        if (spots.length === 0) {
            resultsContainer.innerHTML = `<div class="text-center py-6 text-xs text-m3RedMuted/60">5 km yakınlarda uygun tarihi/doğal nokta bulunamadı.</div>`;
            return;
        }

        // Ham koordinat verilerini harita nesnelerine dönüştürme ve mesafe hesaplama
        const mappedSpots = spots.map(spot => {
            const spotLat = spot.lat || (spot.center ? spot.center.lat : null);
            const spotLon = spot.lon || (spot.center ? spot.center.lon : null);

            if (!spotLat || !spotLon) return null;

            const dist = calculateDistance(state.coords.lat, state.coords.lon, spotLat, spotLon);

            // Noktanın ismini veya kategorisini çözüyoruz
            let name = spot.tags.name || spot.tags.historic || spot.tags.natural || spot.tags.tourism || "Bilinmeyen Nokta";
            let category = spot.tags.historic ? "Tarihi / Harabe" : (spot.tags.natural ? "Doğal Tepe/Yapı" : "Manzara Noktası");

            return { name, dist, category };
        }).filter(s => s !== null);

        // En yakından en uzağa sıralama
        mappedSpots.sort((a, b) => a.dist - b.dist);

        // Ekrana ilk 10 sonucu basıyoruz
        resultsContainer.innerHTML = "";
        mappedSpots.slice(0, 10).forEach(spot => {
            const div = document.createElement('div');
            div.className = "bg-m3Surface p-3 rounded-xl border border-m3Border text-xs space-y-1 mb-2";
            div.innerHTML = `
                <div class="flex justify-between font-bold">
                    <span>🏛️ ${spot.name}</span>
                    <span class="text-m3RedMuted font-mono">${spot.dist.toFixed(2)} km</span>
                </div>
                <p class="text-[10px] text-m3RedMuted/70">Kategori: ${spot.category}</p>
            `;
            resultsContainer.appendChild(div);
        });

    } catch (err) {
        resultsContainer.innerHTML = `<div class="text-center py-6 text-xs text-m3RedMuted/60">Bağlantı hatası: Sunucu meşgul veya internetiniz yok.</div>`;
    }
}
function applyManualCoordinates() {
    const latInput = parseFloat(document.getElementById('input-lat').value);
    const lonInput = parseFloat(document.getElementById('input-lon').value);

    if (isNaN(latInput) || isNaN(lonInput)) {
        alert("Lütfen geçerli bir enlem ve boylam değeri girin.");
        return;
    }

    state.coords.lat = latInput;
    state.coords.lon = lonInput;

    const statusText = document.getElementById('gps-status');
    const gpsDot = document.getElementById('gps-dot');
    
    statusText.innerText = "Manuel Konum";
    gpsDot.className = "w-2 h-2 rounded-full bg-amber-600"; // Manuel konum için turuncu

    updateAstronomicalUI();
}

// ==========================================
// 5. POZLAMA LABORATUVARI KONTROLLERİ
// ==========================================
function updateCalculatedPitchUI() {
    const sensorType = document.getElementById('select-sensor').value;
    const megapixels = parseFloat(document.getElementById('input-mp').value);

    if (isNaN(megapixels) || megapixels <= 0) return;

    const pitch = calculatePixelPitch(sensorType, megapixels);
    document.getElementById('output-calculated-pitch').innerText = `${pitch.toFixed(2)} µm`;
}

function handleExposureCalculation() {
    const focal = parseFloat(document.getElementById('input-focal').value);
    const aperture = parseFloat(document.getElementById('input-aperture').value);
    const sensorType = document.getElementById('select-sensor').value;
    const megapixels = parseFloat(document.getElementById('input-mp').value);
    const declination = parseFloat(document.getElementById('select-dec').value);

    if (isNaN(focal) || isNaN(aperture) || isNaN(megapixels) || isNaN(declination)) {
        alert("Lütfen tüm alanları geçerli sayılarla doldurun.");
        return;
    }

    // 1. Piksel Boyutunu Geometriden Hesapla
    const pitch = calculatePixelPitch(sensorType, megapixels);

    // 2. NPF Süresini Hesapla
    const t = calculateNpfAdvanced(focal, aperture, pitch, declination);

    // 3. Optik Uyarıları Çek
    const warnings = evaluateOptics(focal, aperture);

    // 4. Sensör Reçetesini Al (State'deki güncel bortle değerini kullanır)
    const recipe = calculateSensorRecipe(t, aperture, state.bortle);

    // 5. Arayüzü Güncelle
    document.getElementById('output-npf').innerText = `${t.toFixed(2)}s`;
    document.getElementById('output-iso').innerText = `ISO ${recipe.iso}`;
    document.getElementById('output-stack').innerText = `${recipe.stack} Kare`;

    // 6. Uyarıları Yazdır
    const warningsContainer = document.getElementById('output-warnings');
    warningsContainer.innerHTML = "";
    warnings.forEach(warn => {
        const p = document.createElement('p');
        p.innerText = warn;
        warningsContainer.appendChild(p);
    });
}

// ==========================================
// 6. OLAY DİNLEYİCİLERİ VE BAŞLANGIÇ
// ==========================================
function initEventListeners() {
    ['dashboard', 'fikir', 'hesaplama', 'rota'].forEach(tabId => {
        document.getElementById(`btn-${tabId}`).addEventListener('click', () => switchTab(tabId));
    });

    document.getElementById('btn-location-gps').addEventListener('click', requestLocation);
    document.getElementById('btn-location-apply').addEventListener('click', applyManualCoordinates);
    document.getElementById('btn-calc-exposure').addEventListener('click', handleExposureCalculation);
    document.getElementById('btn-vibe-refresh').addEventListener('click', updateVibeUI);

    document.getElementById('select-sensor').addEventListener('change', updateCalculatedPitchUI);
    document.getElementById('input-mp').addEventListener('input', updateCalculatedPitchUI);

    // YENİ: Rota Keşif Buton Dinleyicisi
    document.getElementById('btn-search-route').addEventListener('click', handleRouteSearch);
}

// js/app.js dosyasının en altındaki DOMContentLoaded bloğu
window.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    applyManualCoordinates(); 
    updateCalculatedPitchUI(); // İlk açılışta piksel mikronunu hesapla

    // YENİ: Service Worker Kayıt İşlemi
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then((reg) => console.log('✅ Service Worker başarıyla kaydedildi.', reg))
            .catch((err) => console.warn('❌ Service Worker kaydı başarısız.', err));
    }
});