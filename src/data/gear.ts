/**
 * GEAR.TS - Astrofotografi Gövde ve Mercek Ön Tanımları (Presets)
 */

import type { SensorType } from '../types';

export interface CameraPreset {
  id: string;
  name: string;
  sensorType: SensorType;
  megapixels: number;
}

export interface LensPreset {
  id: string;
  name: string;
  focal: number;
  aperture: number;
  note?: string;
}

export const POPULAR_CAMERAS: CameraPreset[] = [
  { id: 'custom', name: '⚙️ Özel / Manuel Giriş', sensorType: 'fullframe', megapixels: 24 },
  { id: 'sony-a7iii', name: 'Sony A7 III / A7C (FF - 24 MP)', sensorType: 'fullframe', megapixels: 24 },
  { id: 'sony-a7iv', name: 'Sony A7 IV (FF - 33 MP)', sensorType: 'fullframe', megapixels: 33 },
  { id: 'sony-a7r3', name: 'Sony A7R III / R IV (FF - 42-61 MP)', sensorType: 'fullframe', megapixels: 42 },
  { id: 'canon-r6', name: 'Canon EOS R6 / R6 II (FF - 20-24 MP)', sensorType: 'fullframe', megapixels: 24 },
  { id: 'canon-r5', name: 'Canon EOS R5 (FF - 45 MP)', sensorType: 'fullframe', megapixels: 45 },
  { id: 'canon-apsc', name: 'Canon Rebel / 200D / 80D / R50 (APS-C - 24 MP)', sensorType: 'apsc-canon', megapixels: 24 },
  { id: 'nikon-z6', name: 'Nikon Z6 / Z6 II / D750 (FF - 24 MP)', sensorType: 'fullframe', megapixels: 24 },
  { id: 'fuji-xt', name: 'Fujifilm X-T3 / X-T4 / X-S10 (APS-C - 26 MP)', sensorType: 'apsc', megapixels: 26 },
  { id: 'fuji-xt5', name: 'Fujifilm X-T5 / X-H2 (APS-C - 40 MP)', sensorType: 'apsc', megapixels: 40 },
  { id: 'm43-om', name: 'OM System / Olympus OM-1 / GH5 (M43 - 20 MP)', sensorType: 'm43', megapixels: 20 }
];

export const POPULAR_LENSES: LensPreset[] = [
  { id: 'custom', name: '⚙️ Özel / Manuel Giriş', focal: 50, aperture: 2.0 },
  { id: 'helios-44m', name: 'Helios 44M-4 / 44-2 (58mm f/2.0) [Analog Efsane]', focal: 58, aperture: 2.0, note: 'Girdap bokeh, merkez dışı koma karakteri' },
  { id: 'jupiter-9', name: 'Jupiter-9 (85mm f/2.0) [Analog Portre]', focal: 85, aperture: 2.0, note: 'Yumuşak kontrast, nebulalar için organik doku' },
  { id: 'samyang-14', name: 'Samyang / Rokinon 14mm f/2.8 [Geniş Açı Efsanesi]', focal: 14, aperture: 2.8, note: 'Geniş Samanyolu kemeri için altın standart' },
  { id: 'samyang-135', name: 'Samyang 135mm f/2.0 ED [Derin Uzay Canavarı]', focal: 135, aperture: 2.0, note: 'Orion, Andromeda ve Rho Ophiuchi için jilet gibi keskin' },
  { id: 'sigma-16', name: 'Sigma 16mm f/1.4 DC DN (APS-C Yıldızı)', focal: 16, aperture: 1.4, note: 'APS-C gövdeler için ultra parlak diyafram' },
  { id: 'nifty-fifty', name: 'Klasik 50mm f/1.8 (Nifty Fifty)', focal: 50, aperture: 1.8, note: 'Kompakt Samanyolu detayları' },
  { id: 'tamron-1728', name: 'Tamron 17-28mm f/2.8 Di III RXD', focal: 17, aperture: 2.8, note: 'Hafif ve modern geniş açı zoom' },
  { id: 'sony-20', name: 'Sony FE 20mm f/1.8 G', focal: 20, aperture: 1.8, note: 'Koma düzeltmesi mükemmel modern prime' }
];

export interface CalibrationItem {
  id: string;
  title: string;
  description: string;
  recipe: string;
}

export const CALIBRATION_GUIDE: CalibrationItem[] = [
  {
    id: 'light',
    title: '1. Işık Kareleri (Light Frames)',
    description: 'Yıldız ve nebulaların toplandığı ana pozlamalar.',
    recipe: 'NPF süresiyle belirlenen ISO ve diyaframda asıl çekim serisi.'
  },
  {
    id: 'dark',
    title: '2. Karanlık Kareler (Dark Frames)',
    description: 'Sensörün termal sıcaklık gürültüsünü ve sıcak piksellerini (hot pixels) yok eder.',
    recipe: 'Lens kapağı kapalı, Işık Kareleri ile BİREBİR AYNI pozlama süresi, ISO ve sensör sıcaklığında 10-20 kare.'
  },
  {
    id: 'flat',
    title: '3. Düzeltme Kareleri (Flat Frames)',
    description: 'Merceğin vinyetini (kenar kararması) ve sensör camındaki toz lekelerini dengeler.',
    recipe: 'Ön merceğe beyaz bir tişört veya tablet ekranı koyup histogtamın tam ortasında (1/100s - 1/2s civarı) 15-20 kare.'
  },
  {
    id: 'bias',
    title: '4. Ön Gerilim Kareleri (Bias / Offset)',
    description: 'Kamera sensörünün okuma devresi gürültüsünü (readout noise) sıfırlar.',
    recipe: 'Lens kapağı kapalı, Işık kareleriyle aynı ISO, en hızlı deklanşör süresi (1/4000s veya 1/8000s) 20-30 kare.'
  }
];
