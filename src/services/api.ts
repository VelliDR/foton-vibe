/**
 * API.TS - Canlı Hava Durumu (Open-Meteo) ve Coğrafi Keşif (Overpass) Bağlantı Modülü
 */

import type { WeatherData, OverpassElement } from '../types';

export const OVERPASS_INSTANCES: string[] = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter'
];

export const toRad = (value: number): number => (value * Math.PI) / 180;

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

export async function fetchWithTimeout(resource: string, options: FetchWithTimeoutOptions = {}): Promise<Response> {
  const { timeout = 8000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export function safeSetLocalStorage(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
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

export async function getWeatherData(lat: number, lon: number): Promise<WeatherData> {
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

export async function getNearbySpots(lat: number, lon: number, radius = 5000): Promise<OverpassElement[]> {
  const cacheKey = `foton_spots_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData) {
    try {
      const { timestamp, elements } = JSON.parse(cachedData);
      const ageInHours = (Date.now() - timestamp) / (1000 * 60 * 60);

      if (ageInHours < 24) {
        return elements;
      }
    } catch {
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

  let lastError: unknown = null;

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
        const elements: OverpassElement[] = data.elements || [];
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
    } catch {
      // fallback ignore
    }
  }

  throw lastError || new Error("Overpass sunucularına bağlanılamadı.");
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
