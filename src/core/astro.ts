/**
 * ASTRO.TS - Gelişmiş Astronomi & Hassas Gözlem Motoru (Astronomy Engine Entegrasyonu)
 */

import * as Astronomy from 'astronomy-engine';
import type {
  CelestialCategory,
  CelestialObject,
  CelestialPosition,
  MoonStatus,
  BortleOfflineResult,
  SunTimes
} from '../types';

// ZENGİN KOZMİK KILAVUZ HEDEFLERİ
export const CELESTIAL_CATALOG: CelestialObject[] = [
  {
    id: 'milkyway',
    name: "Samanyolu Çekirdeği",
    icon: "🌌",
    category: "dso",
    type: "fixed",
    raDeg: 266.42,
    decDeg: -29.01,
    description: "Galaktik merkez, en yoğun yıldız alanı (Yay A*)"
  },
  {
    id: 'andromeda',
    name: "Andromeda Galaksisi (M31)",
    icon: "🌀",
    category: "dso",
    type: "fixed",
    raDeg: 10.68,
    decDeg: 41.27,
    description: "Samanyolu'na en yakın spiral dev galaksi"
  },
  {
    id: 'orion',
    name: "Orion Bulutsusu (M42)",
    icon: "🌺",
    category: "dso",
    type: "fixed",
    raDeg: 83.82,
    decDeg: -5.39,
    description: "Gökyüzünün en parlak yıldız doğumevi bulutsusu"
  },
  {
    id: 'pleiades',
    name: "Ülker Yıldız Kümesi (M45)",
    icon: "✨",
    category: "dso",
    type: "fixed",
    raDeg: 56.75,
    decDeg: 24.11,
    description: "Yedi Kızkardeş açık kümesi ve mavi yansıma sisi"
  },
  {
    id: 'polaris',
    name: "Kutup Yıldızı (Polaris)",
    icon: "⭐",
    category: "star",
    type: "fixed",
    raDeg: 37.95,
    decDeg: 89.26,
    description: "Kuzey gök kutbu referansı ve dairesel yıldız izi merkezi"
  },
  {
    id: 'vega',
    name: "Vega (Çalgı)",
    icon: "💎",
    category: "star",
    type: "fixed",
    raDeg: 279.23,
    decDeg: 38.78,
    description: "Yaz üçgeninin mavi-beyaz kalibrasyon feneri"
  },
  {
    id: 'sirius',
    name: "Sirius (Akyıldız)",
    icon: "🌟",
    category: "star",
    type: "fixed",
    raDeg: 101.29,
    decDeg: -16.72,
    description: "Gece göğünün görünen en parlak yıldızı"
  },
  {
    id: 'moon',
    name: "Ay",
    icon: "🌙",
    category: "planet",
    type: "body",
    bodyName: "Moon",
    description: "Doğal uydumuz ve ışık kirliliği faktörü"
  },
  {
    id: 'jupiter',
    name: "Jüpiter",
    icon: "🪐",
    category: "planet",
    type: "body",
    bodyName: "Jupiter",
    description: "Dev gaz devi ve Galile uyduları"
  },
  {
    id: 'saturn',
    name: "Satürn",
    icon: "🪐",
    category: "planet",
    type: "body",
    bodyName: "Saturn",
    description: "Halkalı altın gezegen"
  }
];

export const getCardinalDirection = (az: number): string => {
  const dirs = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  const normalizedAz = ((az % 360) + 360) % 360;
  return dirs[Math.round(normalizedAz / 45) % 8];
};

function formatTimeOnly(date: Date | null): string {
  if (!date) return "--:--";
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function getMoonStatus(lat: number, lon: number, date: Date): MoonStatus {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const time = new Astronomy.AstroTime(date);

  // Anlık Ay Konumu (Ekvatoryal ve Ufuk)
  const moonEq = Astronomy.Equator(Astronomy.Body.Moon, time, observer, true, true);
  const moonHor = Astronomy.Horizon(time, observer, moonEq.ra, moonEq.dec, 'normal');

  // Aydınlanma ve Evre Açısı (0 - 360 derece)
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, time);
  const phaseDeg = Astronomy.MoonPhase(time);
  const phasePercent = Math.round(illum.phase_fraction * 100);

  let phaseName = "";
  if (phaseDeg < 15 || phaseDeg >= 345) {
    phaseName = "Yeni Ay 🌑";
  } else if (phaseDeg < 75) {
    phaseName = "Hilal 🌒";
  } else if (phaseDeg < 105) {
    phaseName = "İlk Dördün 🌓";
  } else if (phaseDeg < 165) {
    phaseName = "Şişkin Ay 🌔";
  } else if (phaseDeg < 195) {
    phaseName = "Dolunay 🌕";
  } else if (phaseDeg < 255) {
    phaseName = "Şişkin Ay 🌖";
  } else if (phaseDeg < 285) {
    phaseName = "Son Dördün 🌗";
  } else {
    phaseName = "Hilal 🌘";
  }

  // Bugün için Ay Doğuş ve Batış Arama
  const todayMidnight = new Date(date);
  todayMidnight.setHours(0, 0, 0, 0);

  let riseTime = "--:--";
  let setTime = "--:--";

  try {
    const rise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, +1, todayMidnight, 1.5);
    const set = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, todayMidnight, 1.5);
    if (rise) riseTime = formatTimeOnly(rise.date);
    if (set) setTime = formatTimeOnly(set.date);
  } catch {
    // Kutup bölgelerinde doğuş/batış olmayabilir
  }

  return {
    phaseName,
    phasePercent,
    altitude: moonHor.altitude,
    azimuth: moonHor.azimuth,
    isMoonUp: moonHor.altitude > 0,
    riseTime,
    setTime
  };
}

export function estimateBortleOffline(
  lat: number,
  lon: number,
  date: Date,
  baseBortle = 3
): BortleOfflineResult {
  const moon = getMoonStatus(lat, lon, date);
  let moonImpact = 0;
  let reason = "";

  if (moon.isMoonUp) {
    // Ay ufkun üstünde: Yükseklik ve aydınlanma oranına göre ışık etkisi
    if (moon.phasePercent >= 80) {
      moonImpact = moon.altitude > 15 ? 3 : 2;
      reason = "Baskın Dolunay Işığı";
    } else if (moon.phasePercent >= 40) {
      moonImpact = moon.altitude > 15 ? 2 : 1;
      reason = "Aydınlık Ay Işığı";
    } else if (moon.phasePercent >= 15) {
      moonImpact = 1;
      reason = "Hafif Hilal Işığı";
    } else {
      moonImpact = 0;
      reason = "İnce Hilal (Etkisiz)";
    }
  } else {
    moonImpact = 0;
    reason = "Ay Ufkun Altında (Işık Kirliliği Yok)";
  }

  const finalScore = Math.min(9, baseBortle + moonImpact);

  if (moonImpact > 0) {
    reason = `${reason} (+${moonImpact} Bortle)`;
  } else if (!moon.isMoonUp) {
    if (baseBortle <= 2) reason = "Zifiri Karanlık Gökyüzü (Dağ Başı)";
    else if (baseBortle <= 4) reason = "Doğal Kırsal Karanlığı (Ay Yok)";
    else if (baseBortle <= 6) reason = "Şehir Işığı Baskın (Ay Yok)";
    else reason = "Yoğun Şehir Kirliliği";
  }

  return { score: finalScore, reason };
}

export function getSunTimes(lat: number, lon: number, date: Date): SunTimes {
  const observer = new Astronomy.Observer(lat, lon, 0);

  const todayMidnight = new Date(date);
  todayMidnight.setHours(0, 0, 0, 0);

  let sunsetStr = "--:--";
  let darkStartStr = "--:--";
  let darkEndStr = "--:--";
  let durationText = "Karanlık penceresi hesaplanamadı";

  try {
    // Güneş batımı (irtifa = -0.8333 derece)
    const sunset = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, todayMidnight, 1, -0.8333);
    if (sunset) {
      sunsetStr = formatTimeOnly(sunset.date);
    }

    // Astronomik karanlık başlangıcı (-18 derece altına iniş)
    const darkStart = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, todayMidnight, 1, -18.0);
    if (darkStart) {
      darkStartStr = formatTimeOnly(darkStart.date);

      // Astronomik karanlık bitişi (-18 dereceden yukarı çıkış / sabah alacakaranlık)
      const darkEnd = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, +1, darkStart, 1, -18.0);
      if (darkEnd) {
        darkEndStr = formatTimeOnly(darkEnd.date);

        const diffMs = darkEnd.date.getTime() - darkStart.date.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        durationText = `${diffHrs} sa ${diffMins} dk zifiri karanlık`;
      }
    }
  } catch {
    sunsetStr = "Kutup Gündüzü";
    darkStartStr = "Karanlık Yok";
  }

  return {
    sunset: sunsetStr,
    astroDarkStart: darkStartStr,
    astroDarkEnd: darkEndStr,
    darkDurationText: durationText
  };
}

export function getCelestialPositions(
  lat: number,
  lon: number,
  date: Date,
  filter: CelestialCategory = 'all'
): CelestialPosition[] {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const time = new Astronomy.AstroTime(date);

  const catalog = CELESTIAL_CATALOG.filter(item => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

  const positions = catalog.map(item => {
    let alt = 0;
    let az = 0;

    if (item.type === 'body' && item.bodyName) {
      const bodyEnum = Astronomy.Body[item.bodyName];
      const eq = Astronomy.Equator(bodyEnum, time, observer, true, true);
      const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, 'normal');
      alt = hor.altitude;
      az = hor.azimuth;
    } else if (item.raDeg !== undefined && item.decDeg !== undefined) {
      // Astronomy.Horizon ra parametresini saat cinsinden (0 - 24) bekler
      const hor = Astronomy.Horizon(time, observer, item.raDeg / 15, item.decDeg, 'normal');
      alt = hor.altitude;
      az = hor.azimuth;
    }

    return {
      ...item,
      alt,
      az,
      isVisible: alt > 0,
      cardinal: getCardinalDirection(az)
    };
  });

  // Önce ufkun üstündekiler (azalan irtifaya göre), sonra ufkun altındakiler
  return positions.sort((a, b) => {
    if (a.isVisible && !b.isVisible) return -1;
    if (!a.isVisible && b.isVisible) return 1;
    return b.alt - a.alt;
  });
}
