/**
 * EXPOSURE.TS - Pozlama Hesaplamaları ve Optik Limit Değerlendirme Modülü
 */

import type { SensorGeometry, SensorType, ExposureRecipe } from '../types';

const SAFE_LIMIT_ISO = 1600;

export const SENSOR_GEOMETRIES: Record<SensorType, SensorGeometry> = {
  'fullframe':   { widthMm: 36.0, aspectRatio: 1.5 },
  'apsc':        { widthMm: 23.5, aspectRatio: 1.5 },
  'apsc-canon':  { widthMm: 22.3, aspectRatio: 1.5 },
  'm43':         { widthMm: 17.3, aspectRatio: 1.3333 },
  'med-format':  { widthMm: 43.8, aspectRatio: 1.3333 }
};

export function calculatePixelPitch(sensorType: string, megapixels: number | string): number {
  const mpVal = typeof megapixels === 'number' ? megapixels : parseFloat(megapixels);
  if (isNaN(mpVal) || mpVal <= 0) return 5.96;

  const geometry = SENSOR_GEOMETRIES[sensorType as SensorType] || SENSOR_GEOMETRIES['fullframe'];
  const mp = mpVal * 1_000_000;
  const pixelsWidth = Math.sqrt(mp * geometry.aspectRatio);
  return (geometry.widthMm * 1000) / pixelsWidth;
}

export function calculateNpfAdvanced(
  focal: number | string,
  aperture: number | string,
  pitch: number | string,
  declination: number | string
): number {
  const f = typeof focal === 'number' ? focal : parseFloat(focal);
  const n = typeof aperture === 'number' ? aperture : parseFloat(aperture);
  const p = typeof pitch === 'number' ? pitch : parseFloat(pitch);
  const dec = typeof declination === 'number' ? declination : parseFloat(declination);

  if (isNaN(f) || f <= 0 || isNaN(n) || n <= 0 || isNaN(p) || p <= 0) {
    return 0;
  }

  const base_t = (16.9 * n + 25.6 * p + 13.7 * f) / f;
  const cos_factor = Math.max(Math.cos(dec * (Math.PI / 180)), 0.1);
  return base_t / cos_factor;
}

export function evaluateOptics(focal: number | string, aperture: number | string): string[] {
  const warnings: string[] = [];
  const f = typeof focal === 'number' ? focal : parseFloat(focal);
  const n = typeof aperture === 'number' ? aperture : parseFloat(aperture);

  if (isNaN(f) || isNaN(n)) return warnings;

  if (f >= 50 && n <= 3.0) {
    warnings.push("⚠️ OPTİK RİSK: Helios/Analog merceklerin kenar bölgelerinde vinyet ve koma etkisi belirginleşecektir. f/2.8 seviyesine kısmayı düşünebilirsiniz.");
  }
  
  if (n > 5.6) {
    warnings.push("⚠️ IŞIK RİSKİ: Yıldız fotoğrafçılığı için diyafram fazla kısık. Işık toplama verimi çok düşük kalacaktır.");
  }
  return warnings;
}

export function calculateSensorRecipe(
  t: number | string,
  aperture: number | string,
  bortle: number | string
): ExposureRecipe {
  const time = typeof t === 'number' ? t : parseFloat(t);
  const n = typeof aperture === 'number' ? aperture : parseFloat(aperture);
  const b = typeof bortle === 'number' ? bortle : parseInt(bortle, 10);

  if (isNaN(time) || time <= 0 || isNaN(n) || n <= 0 || isNaN(b) || b <= 0) {
    return { iso: 800, stack: 1, frameTime: time || 0, overexposed: false };
  }

  const bortle_factor = Math.pow(b, 0.7);
  const raw_iso = (5000 * Math.pow(n, 2)) / (time * bortle_factor);
  const standardIsos = [100, 200, 400, 800, 1600, 3200, 6400];
  
  let ideal_iso = standardIsos.reduce((prev, curr) => {
    return Math.abs(curr - raw_iso) < Math.abs(prev - raw_iso) ? curr : prev;
  });

  let stack_frames = 1;
  let frameTime = time;
  let overexposed = false;

  if (ideal_iso > SAFE_LIMIT_ISO) {
    const stop_difference = Math.log2(ideal_iso / SAFE_LIMIT_ISO);
    stack_frames = Math.ceil(Math.pow(2, stop_difference));
    ideal_iso = SAFE_LIMIT_ISO;
  } else if (raw_iso < 100) {
    const overexposure_factor = 100 / raw_iso;
    stack_frames = Math.ceil(overexposure_factor);
    ideal_iso = 100;
    frameTime = time / stack_frames;
    overexposed = true;
  }

  return {
    iso: ideal_iso,
    stack: stack_frames,
    frameTime: frameTime,
    overexposed: overexposed
  };
}
