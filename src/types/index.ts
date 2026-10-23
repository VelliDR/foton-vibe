export type TabId = 'dashboard' | 'fikir' | 'hesaplama' | 'rota';

export type SensorType = 'fullframe' | 'apsc' | 'apsc-canon' | 'm43' | 'med-format';

export interface SensorGeometry {
  widthMm: number;
  aspectRatio: number;
}

export type CelestialCategory = 'all' | 'dso' | 'star' | 'planet';

export interface CelestialObject {
  id: string;
  name: string;
  icon: string;
  category: 'dso' | 'star' | 'planet';
  type: 'fixed' | 'body';
  raDeg?: number;
  decDeg?: number;
  bodyName?: 'Moon' | 'Jupiter' | 'Saturn';
  description?: string;
}

export interface CelestialPosition extends CelestialObject {
  alt: number;
  az: number;
  isVisible: boolean;
  cardinal: string;
}

export interface MoonStatus {
  phaseName: string;
  phasePercent: number;
  altitude: number;
  azimuth: number;
  isMoonUp: boolean;
  riseTime: string;
  setTime: string;
}

export interface BortleOfflineResult {
  score: number;
  reason: string;
}

export interface SunTimes {
  sunset: string;
  astroDarkStart: string;
  astroDarkEnd: string;
  darkDurationText: string;
}

export interface ExposureRecipe {
  iso: number;
  stack: number;
  frameTime: number;
  overexposed: boolean;
}

export interface VibeIdea {
  baslik: string;
  metin: string;
}

export interface VibeResult extends VibeIdea {
  slot: string;
}

export interface WeatherData {
  clouds: number;
  wind: number;
}

export interface Spot {
  name: string;
  dist: number;
  category: string;
}

export interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface AppState {
  currentTab: TabId;
  coords: {
    lat: number;
    lon: number;
  };
  baseBortle: number;
  bortle: number;
  gpsLocked: boolean;
  celestialFilter: CelestialCategory;
}
