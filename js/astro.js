/**
 * ASTRO.JS - Gök Cisimleri ve Astronomik Zaman Hesaplama Modülü
 */

// Astronomik Sabitler
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Negatif sayıları da güvenle kapsayan matematiksel modulo fonksiyonu
 */
const safeMod = (n, m) => ((n % m) + m) % m;

/**
 * Derece cinsinden açıları 0-360 derece arasına normalize eder.
 */
const normalizeAngle = (angle) => safeMod(angle, 360);

/**
 * Verilen tarihin milisaniye hassasiyetinde Julian Gününü (JD) hesaplar.
 */
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

/**
 * Yaklaşık Güneş boylamını ve deklinasyonunu hesaplar.
 */
function getSunCoordinates(jd) {
    const d = jd - 2451545.0; // J2000.0 miladı
    
    const g = normalizeAngle(357.529 + 0.98560028 * d); // Ortalama anomali
    const q = normalizeAngle(280.459 + 0.98564736 * d); // Ortalama boylam
    const L = normalizeAngle(q + 1.915 * Math.sin(g * RAD) + 0.020 * Math.sin(2 * g * RAD)); // Gerçek boylam

    const obliq = 23.439 - 0.00000036 * d; // Ekliptik eğiklik
    
    const dec = Math.asin(Math.sin(obliq * RAD) * Math.sin(L * RAD)) * DEG; // Deklinasyon
    const RA = Math.atan2(Math.cos(obliq * RAD) * Math.sin(L * RAD), Math.cos(L * RAD)) * DEG; // Sağ açıklık

    return { dec, RA, g, L };
}

/**
 * Güneş'in ufuk altındaki belirli bir dereceye (altituda) ulaşacağı saati hesaplar.
 */
function getSunTimeForAltitude(lat, lon, date, targetAlt) {
    const jd = getJulianDate(date);
    const coords = getSunCoordinates(jd);
    
    const latRad = lat * RAD;
    const decRad = coords.dec * RAD;
    const altRad = targetAlt * RAD;

    const cosH = (Math.sin(altRad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));

    if (cosH > 1 || cosH < -1) {
        return null; // Kutup gecesi veya kutup gündüzü durumu
    }

    const H = Math.acos(cosH) * DEG; // Derece cinsinden saat açısı
    const localNoon = 12 - (lon / 15) - ((coords.L - coords.RA) / 15); // Yerel öğle vakti (Saat)
    
    const timeInHours = localNoon + (H / 15); // Batış saati (UTC)
    
    const timezoneOffset = -date.getTimezoneOffset() / 60;
    const localTime = safeMod(timeInHours + timezoneOffset, 24);

    const totalMinutes = Math.round(localTime * 60);
    const hour = Math.floor((totalMinutes / 60) % 24);
    const minute = totalMinutes % 60;

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Ay'ın evresini ve bilimsel gerçek aydınlanma yüzdesini hesaplar.
 */
export function getMoonStatus(date) {
    const jd = getJulianDate(date);
    const synodicMonth = 29.530588853;
    const knownNewMoon = 2451550.1; // 6 Ocak 2000 Yeni Ay
    
    const age = safeMod(jd - knownNewMoon, synodicMonth);
    const cyclePhasePercent = (age / synodicMonth) * 100;

    // Gerçek aydınlanma yüzdesi hesaplama formula
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

    return {
        phaseName,
        phasePercent: illuminationPercent,
        isMoonUp,
        age
    };
}

/**
 * Kullanıcının seçtiği yapay ışık tabanına Ay'ın gökyüzündeki anlık etkisini ekler.
 */
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

    return { 
        score: finalScore, 
        reason: reason 
    };
}

/**
 * Ana Güneş Zamanları Sorgulayıcısı
 */
export function getSunTimes(lat, lon, date) {
    const sunset = getSunTimeForAltitude(lat, lon, date, -0.83);
    const astroDark = getSunTimeForAltitude(lat, lon, date, -18.0);

    return {
        sunset: sunset || "Kutup Gündüzü",
        astroDark: astroDark || "Karanlık Yok"
    };
}