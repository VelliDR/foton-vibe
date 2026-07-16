/**
 * ASTRO.JS - Gök Cisimleri ve Astronomik Zaman Hesaplama Modülü
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

const safeMod = (n, m) => ((n % m) + m) % m;
const normalizeAngle = (angle) => safeMod(angle, 360);

// KOZMİK KILAVUZ HEDEFLERİ (J2000 Koordinatları)
export const CELESTIAL_OBJECTS = [
    { id: 'milkyway', name: "Samanyolu Çekirdeği", ra: 266.42, dec: -29.01, icon: "🌌" },
    { id: 'polaris', name: "Kutup Yıldızı (Polaris)", ra: 37.95, dec: 89.26, icon: "⭐" },
    { id: 'vega', name: "Vega", ra: 279.23, dec: 38.78, icon: "💎" },
    { id: 'sirius', name: "Sirius (Akyıldız)", ra: 101.29, dec: -16.72, icon: "✨" }
];

function getJulianDate(date) {
    let year = date.getUTCFullYear();
    let month = date.getUTCMonth() + 1;
    
    const hoursFraction = (
        date.getUTCHours() + 
        date.getUTCMinutes() / 60 + 
        date.getUTCSeconds() / 3600 + 
        date.getUTCMilliseconds() / 3600000
    ) / 24;

    let day = date.getUTCDate() + hoursFraction;

    if (month <= 2) {
        year -= 1;
        month += 12;
    }

    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function getSunCoordinates(jd) {
    const d = jd - 2451545.0;
    const g = normalizeAngle(357.529 + 0.98560028 * d);
    const q = normalizeAngle(280.459 + 0.98564736 * d);
    const L = normalizeAngle(q + 1.915 * Math.sin(g * RAD) + 0.020 * Math.sin(2 * g * RAD));
    const obliq = 23.439 - 0.00000036 * d;
    
    const dec = Math.asin(Math.sin(obliq * RAD) * Math.sin(L * RAD)) * DEG;
    const RA = Math.atan2(Math.cos(obliq * RAD) * Math.sin(L * RAD), Math.cos(L * RAD)) * DEG;

    return { dec, RA, g, L };
}

function getSunTimeForAltitude(lat, lon, date, targetAlt) {
    const jd = getJulianDate(date);
    const coords = getSunCoordinates(jd);
    
    const latRad = lat * RAD;
    const decRad = coords.dec * RAD;
    const altRad = targetAlt * RAD;

    const cosH = (Math.sin(altRad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));

    if (cosH > 1 || cosH < -1) return null;

    const H = Math.acos(cosH) * DEG;
    const localNoon = 12 - (lon / 15) - ((coords.L - coords.RA) / 15);
    const timeInHours = localNoon + (H / 15);
    
    const timezoneOffset = -date.getTimezoneOffset() / 60;
    const localTime = safeMod(timeInHours + timezoneOffset, 24);

    const totalMinutes = Math.round(localTime * 60);
    const hour = Math.floor((totalMinutes / 60) % 24);
    const minute = totalMinutes % 60;

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function getMoonStatus(date) {
    const jd = getJulianDate(date);
    const synodicMonth = 29.530588853;
    const knownNewMoon = 2451550.1;
    
    const age = safeMod(jd - knownNewMoon, synodicMonth);
    const cyclePhasePercent = (age / synodicMonth) * 100;

    const phaseRad = (age / synodicMonth) * 2 * Math.PI;
    const illuminationPercent = Math.round(50 * (1 - Math.cos(phaseRad)));

    let phaseName = "";
    if (cyclePhasePercent < 2.0 || cyclePhasePercent >= 98.0) phaseName = "Yeni Ay 🌑";
    else if (cyclePhasePercent < 23.0) phaseName = "Hilal 🌒";
    else if (cyclePhasePercent < 27.0) phaseName = "İlk Dördün 🌓";
    else if (cyclePhasePercent < 48.0) phaseName = "Şişkin Ay 🌔";
    else if (cyclePhasePercent < 52.0) phaseName = "Dolunay 🌕";
    else if (cyclePhasePercent < 73.0) phaseName = "Şişkin Ay 🌖";
    else if (cyclePhasePercent < 77.0) phaseName = "Son Dördün 🌗";
    else phaseName = "Hilal 🌘";

    const isMoonUp = age > 6 && age < 23;

    return { phaseName, phasePercent: illuminationPercent, isMoonUp, age };
}

export function estimateBortleOffline(lat, lon, date, baseBortle = 3) {
    const moon = getMoonStatus(date);
    let moonImpact = 0;
    let reason = "";

    if (moon.isMoonUp && moon.phasePercent >= 15) {
        if (moon.phasePercent > 85) {
            moonImpact = 3;
            reason = "Dolunay Baskısı";
        } else if (moon.phasePercent > 50) {
            moonImpact = 2;
            reason = "Baskın Ay Işığı";
        } else if (moon.phasePercent > 20) {
            moonImpact = 1;
            reason = "Hafif Ay Etkisi";
        }
    }

    const finalScore = Math.min(9, baseBortle + moonImpact);

    if (moonImpact > 0) {
        reason = `${reason} (+${moonImpact} Bortle)`;
    } else {
        if (baseBortle <= 2) reason = "Zifiri Karanlık (Yapay Işık Yok)";
        else if (baseBortle <= 4) reason = "Doğal Kırsal Karanlığı";
        else if (baseBortle <= 6) reason = "Orta Seviye Şehir Işığı";
        else reason = "Yoğun Şehir Kirliliği";
    }

    return { score: finalScore, reason };
}

export function getSunTimes(lat, lon, date) {
    const sunset = getSunTimeForAltitude(lat, lon, date, -0.83);
    const astroDark = getSunTimeForAltitude(lat, lon, date, -18.0);
    return {
        sunset: sunset || "Kutup Gündüzü",
        astroDark: astroDark || "Karanlık Yok"
    };
}

// COĞRAFİ KONUMA GÖRE YÜKSEKLİK VE YÖN HESABI
export function getCelestialPositions(lat, lon, date) {
    const jd = getJulianDate(date);
    const d = jd - 2451545.0;
    
    const gmst = normalizeAngle(280.46061837 + 360.98564736629 * d);
    const lst = normalizeAngle(gmst + lon);
    const latRad = lat * RAD;

    return CELESTIAL_OBJECTS.map(obj => {
        const raRad = obj.ra * RAD;
        const decRad = obj.dec * RAD;
        const haRad = (lst * RAD) - raRad;

        const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
        const altRad = Math.asin(sinAlt);
        const alt = altRad * DEG;

        const y = -Math.sin(haRad) * Math.cos(decRad);
        const x = Math.sin(decRad) - Math.sin(latRad) * sinAlt;
        const az = safeMod(Math.atan2(y, x) * DEG, 360);

        return {
            ...obj,
            alt,
            az,
            isVisible: alt > 0
        };
    });
}