/**
 * MAIN.TS - Ana Uygulama Durumu ve UI Kontrol Merkezi
 */

import './styles/app.css';
import { registerSW } from 'virtual:pwa-register';

import { calculateNpfAdvanced, evaluateOptics, calculateSensorRecipe, calculatePixelPitch } from './core/exposure';
import { getSunTimes, getMoonStatus, estimateBortleOffline, getCelestialPositions } from './core/astro';
import { getRandomVibe } from './core/vibe';
import { getWeatherData, getNearbySpots, calculateDistance } from './services/api';
import type { AppState, TabId, Spot, CelestialCategory } from './types';

export const state: AppState = {
  currentTab: 'dashboard',
  coords: {
    lat: 39.9333,
    lon: 32.8500
  },
  baseBortle: 3,
  bortle: 4,
  gpsLocked: false,
  celestialFilter: 'all'
};

const TAB_TITLES: Record<TabId, string> = {
  dashboard: 'GÖSTERGE PANELİ',
  fikir: 'FOTON ESİNTİSİ',
  hesaplama: 'POZLAMA LABORATUVARI',
  rota: 'ROTA KEŞİF DEDEKTÖRÜ'
};

const TABS: TabId[] = ['dashboard', 'fikir', 'hesaplama', 'rota'];

function switchTab(targetTabId: TabId): void {
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
  } else if (targetTabId === 'hesaplama') {
    handleExposureCalculation();
  }
}

function updateVibeUI(): void {
  const vibe = getRandomVibe();
  const slotElem = document.getElementById('vibe-slot');
  const textElem = document.getElementById('vibe-text');

  if (slotElem && textElem) {
    slotElem.innerText = `${vibe.slot} - ${vibe.baslik}`;
    textElem.innerText = `"${vibe.metin}"`;
  }
}

async function updateAstronomicalUI(): Promise<void> {
  const today = new Date();

  // 1. Güneş ve Astronomik Karanlık Penceresi
  const sunTimes = getSunTimes(state.coords.lat, state.coords.lon, today);
  const sunSetElem = document.getElementById('sun-set');
  const darkStartElem = document.getElementById('dark-start');
  const darkDurationElem = document.getElementById('dark-duration');

  if (sunSetElem) sunSetElem.innerText = sunTimes.sunset;
  if (darkStartElem) darkStartElem.innerText = `${sunTimes.astroDarkStart} → ${sunTimes.astroDarkEnd}`;
  if (darkDurationElem) darkDurationElem.innerText = `✨ ${sunTimes.darkDurationText}`;

  // 2. Ay Durumu, İrtifa ve Doğuş/Batış Saatleri
  const moon = getMoonStatus(state.coords.lat, state.coords.lon, today);
  const moonPhaseElem = document.getElementById('moon-phase');
  const moonTimesElem = document.getElementById('moon-times');

  if (moonPhaseElem) {
    const altText = moon.isMoonUp 
      ? `↑ ${moon.altitude.toFixed(0)}° (Gökte)`
      : `↓ Ufkun Altında`;
    moonPhaseElem.innerText = `${moon.phaseName} (%${moon.phasePercent}) • ${altText}`;
  }

  if (moonTimesElem) {
    moonTimesElem.innerText = `Doğuş: ${moon.riseTime} | Batış: ${moon.setTime}`;
  }

  // 3. Hibrit Bortle Değeri (Doğal Konum + Gerçek Zamanlı Ay İrtifası)
  const bortleResult = estimateBortleOffline(state.coords.lat, state.coords.lon, today, state.baseBortle);
  state.bortle = bortleResult.score;

  const bortleElem = document.getElementById('bortle-value');
  if (bortleElem) {
    bortleElem.innerText = `Bortle ${bortleResult.score} (${bortleResult.reason})`;
  }

  // 4. Canlı Hava Tahmini
  const cloudElem = document.getElementById('cloud-status');
  if (cloudElem) {
    cloudElem.innerText = "Yükleniyor...";
    try {
      const weather = await getWeatherData(state.coords.lat, state.coords.lon);
      cloudElem.innerText = `%${weather.clouds} Bulut, ${weather.wind} km/s Rüzgar`;
    } catch {
      cloudElem.innerText = "Hava Tahmini Alınamadı";
    }
  }

  // 5. Kozmik Göstergeleri Hesapla ve Listele
  renderCelestialList(today);
}

function renderCelestialList(date: Date = new Date()): void {
  const celestialList = document.getElementById('celestial-list');
  if (!celestialList) return;

  try {
    const positions = getCelestialPositions(state.coords.lat, state.coords.lon, date, state.celestialFilter);
    celestialList.innerHTML = "";

    if (positions.length === 0) {
      celestialList.innerHTML = `<div class="text-center py-4 text-xs text-m3RedMuted/50 italic">Bu filtrede hedef bulunamadı.</div>`;
      return;
    }

    positions.forEach(pos => {
      const row = document.createElement('div');
      row.className = "flex justify-between items-center text-xs font-mono py-2 px-2.5 rounded-xl bg-m3Bg/60 border border-m3Border/40 transition-colors";

      const leftDiv = document.createElement('div');
      leftDiv.className = "flex items-center gap-2.5 min-w-0 pr-2";

      const iconSpan = document.createElement('span');
      iconSpan.className = "text-base flex-shrink-0";
      iconSpan.textContent = pos.icon;

      const textDiv = document.createElement('div');
      textDiv.className = "truncate";

      const nameP = document.createElement('div');
      nameP.className = "font-sans font-semibold text-m3Red text-xs truncate";
      nameP.textContent = pos.name;

      const descP = document.createElement('div');
      descP.className = "text-[9px] text-m3RedMuted/60 font-sans truncate";
      descP.textContent = pos.description || "";

      textDiv.appendChild(nameP);
      if (pos.description) textDiv.appendChild(descP);
      leftDiv.appendChild(iconSpan);
      leftDiv.appendChild(textDiv);

      const rightDiv = document.createElement('div');
      rightDiv.className = "text-right flex-shrink-0";

      if (pos.isVisible) {
        rightDiv.innerHTML = `
          <div class="text-emerald-400 font-bold text-xs flex items-center justify-end gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>↑ ${pos.alt.toFixed(1)}°</span>
          </div>
          <div class="text-m3RedMuted/70 text-[10px]">
            ${pos.cardinal} (${pos.az.toFixed(0)}°)
          </div>
        `;
      } else {
        rightDiv.innerHTML = `
          <div class="text-gray-500 italic text-xs">
            Ufkun Altında
          </div>
          <div class="text-gray-600 text-[9px]">
            ${pos.alt.toFixed(1)}°
          </div>
        `;
      }

      row.appendChild(leftDiv);
      row.appendChild(rightDiv);
      celestialList.appendChild(row);
    });
  } catch (e) {
    console.error("Kozmik göstergeler güncellenemedi:", e);
  }
}

function requestLocation(): void {
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

      const latInput = document.getElementById('input-lat') as HTMLInputElement | null;
      const lonInput = document.getElementById('input-lon') as HTMLInputElement | null;
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
        errorMsg = "Sinyal Yok";
      } else if (error.code === error.TIMEOUT) {
        errorMsg = "Zaman Aşımı";
      }

      statusText.innerText = errorMsg;
      gpsDot.className = "w-2 h-2 rounded-full bg-red-800";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function applyManualCoordinates(): void {
  const latInputElem = document.getElementById('input-lat') as HTMLInputElement | null;
  const lonInputElem = document.getElementById('input-lon') as HTMLInputElement | null;
  if (!latInputElem || !lonInputElem) return;

  const latInput = parseFloat(latInputElem.value);
  const lonInput = parseFloat(lonInputElem.value);

  if (isNaN(latInput) || isNaN(lonInput)) {
    alert("Geçersiz koordinat.");
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

async function handleRouteSearch(): Promise<void> {
  const resultsContainer = document.getElementById('route-results');
  if (!resultsContainer) return;

  resultsContainer.innerHTML = `<div class="text-center py-6 text-xs text-m3RedMuted animate-pulse">Çevre taranıyor (Overpass API)...</div>`;

  try {
    const spots = await getNearbySpots(state.coords.lat, state.coords.lon);

    if (spots.length === 0) {
      resultsContainer.innerHTML = `<div class="text-center py-6 text-xs text-m3RedMuted/60">Uygun nokta bulunamadı.</div>`;
      return;
    }

    const mappedSpots: Spot[] = spots.map(spot => {
      const spotLat = spot.lat || (spot.center ? spot.center.lat : null);
      const spotLon = spot.lon || (spot.center ? spot.center.lon : null);

      if (!spotLat || !spotLon) return null;

      const dist = calculateDistance(state.coords.lat, state.coords.lon, spotLat, spotLon);
      const tags = spot.tags || {};
      const name = tags.name || tags.historic || tags.natural || tags.tourism || "Gizemli Nokta";
      const category = tags.historic ? "Tarihi Yapı" : (tags.natural ? "Doğal Zirve" : "Manzara Noktası");

      return { name, dist, category };
    }).filter((s): s is Spot => s !== null);

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
    resultsContainer.innerHTML = `<div class="text-center py-6 text-xs text-m3RedMuted/60">Overpass bağlantı hatası veya internet yok.</div>`;
    console.error(err);
  }
}

function updateCalculatedPitchUI(): void {
  const sensorTypeElem = document.getElementById('select-sensor') as HTMLSelectElement | null;
  const mpElem = document.getElementById('input-mp') as HTMLInputElement | null;
  const outputElem = document.getElementById('output-calculated-pitch');

  if (!sensorTypeElem || !mpElem || !outputElem) return;

  const sensorType = sensorTypeElem.value;
  const megapixels = parseFloat(mpElem.value);

  if (isNaN(megapixels) || megapixels <= 0) return;

  const pitch = calculatePixelPitch(sensorType, megapixels);
  outputElem.innerText = `${pitch.toFixed(2)} µm`;
}

function handleExposureCalculation(): void {
  const focalElem = document.getElementById('input-focal') as HTMLInputElement | null;
  const apertureElem = document.getElementById('input-aperture') as HTMLInputElement | null;
  const sensorTypeElem = document.getElementById('select-sensor') as HTMLSelectElement | null;
  const mpElem = document.getElementById('input-mp') as HTMLInputElement | null;
  const decElem = document.getElementById('select-dec') as HTMLSelectElement | null;

  if (!focalElem || !apertureElem || !sensorTypeElem || !mpElem || !decElem) return;

  const focal = parseFloat(focalElem.value);
  const aperture = parseFloat(apertureElem.value);
  const sensorType = sensorTypeElem.value;
  const megapixels = parseFloat(mpElem.value);
  const declination = parseFloat(decElem.value);

  if (isNaN(focal) || isNaN(aperture) || isNaN(megapixels) || isNaN(declination)) {
    alert("Girdileri kontrol edin.");
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
    
    const pBortle = document.createElement('p');
    pBortle.className = "text-[10px] text-m3RedMuted/70 font-mono not-italic border-b border-m3Border/30 pb-2 mb-2";
    pBortle.innerText = `ℹ️ Hesaplama Parametresi: Bortle ${state.bortle}`;
    warningsContainer.appendChild(pBortle);

    if (recipe.overexposed) {
      const pOver = document.createElement('p');
      pOver.className = "text-[10px] text-amber-500 font-bold leading-relaxed";
      pOver.innerText = `⚠️ AŞIRI POZLAMA KORUMASI: Bu ışık kirliliğinde ${t.toFixed(2)}s tek kare pozlama sensörü patlatacaktır. Toplam süreyi ${recipe.stack} kareye böldük (Kare başına ${recipe.frameTime.toFixed(1)}s pozlayın).`;
      warningsContainer.appendChild(pOver);
    }

    warnings.forEach(warn => {
      const p = document.createElement('p');
      p.innerText = warn;
      warningsContainer.appendChild(p);
    });
  }
}

function initEventListeners(): void {
  TABS.forEach(tabId => {
    const btn = document.getElementById(`btn-${tabId}`);
    if (btn) btn.addEventListener('click', () => switchTab(tabId));
  });

  const bindClick = (id: string, fn: () => void): void => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  const bindInput = (id: string, event: string, fn: (e: Event) => void): void => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  };

  bindInput('select-environment', 'change', (e) => {
    const target = e.target as HTMLSelectElement | null;
    if (target) {
      state.baseBortle = parseInt(target.value, 10);
      updateAstronomicalUI();
    }
  });

  // Kozmik Göstergeler Filtre Butonları
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter') as CelestialCategory;
      if (filter) {
        state.celestialFilter = filter;
        filterBtns.forEach(b => {
          b.classList.remove('bg-m3RedDark', 'text-m3Red');
          b.classList.add('bg-m3Bg', 'text-m3RedMuted');
        });
        btn.classList.add('bg-m3RedDark', 'text-m3Red');
        btn.classList.remove('bg-m3Bg', 'text-m3RedMuted');
        renderCelestialList();
      }
    });
  });

  bindClick('btn-location-gps', requestLocation);
  bindClick('btn-location-apply', applyManualCoordinates);
  bindClick('btn-calc-exposure', handleExposureCalculation);
  bindClick('btn-vibe-refresh', updateVibeUI);
  bindClick('btn-search-route', handleRouteSearch);

  bindInput('select-sensor', 'change', updateCalculatedPitchUI);
  bindInput('input-mp', 'input', updateCalculatedPitchUI);
}

// Güvenli Initialization Metodu
function initApp(): void {
  const envElem = document.getElementById('select-environment') as HTMLSelectElement | null;
  if (envElem) {
    state.baseBortle = parseInt(envElem.value, 10);
  }

  initEventListeners();
  applyManualCoordinates(); 
  updateCalculatedPitchUI();

  // VitePWA otomatik Service Worker aktivasyonu
  registerSW({ immediate: true });
}

// DOMContentLoaded koruması
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
