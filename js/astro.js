/**
 * ASTRO.JS - Gök Cisimleri ve Astronomik Zaman Hesaplama Modülü
 */

// Astronomik Sabitler
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Verilen tarihin Julian Gününü (JD) hesaplar.
 */
function getJulianDate(date) {
    let year = date.getUTCFullYear();
    let month = date.getUTCMonth() + 1;
    let day = date.getUTCDate() + (date.getUTCHours() + date.getUTCMinutes() / 60) / 24;

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
    const g = (357.529 + 0.98560028 * d) % 360; // Ortalama anomali
    const q = (280.459 + 0.98564736 * d) % 360; // Ortalama boylam
    const L = (q + 1.915 * Math.sin(g * RAD) + 0.020 * Math.sin(2 * g * RAD)) % 360; // Gerçek boylam

    const obliq = 23.439 - 0.00000036 * d; // Ekliptik eğiklik
    
    const dec = Math.asin(Math.sin(obliq * RAD) * Math.sin(L * RAD)) * DEG; // Deklinasyon
    const RA = Math.atan2(Math.cos(obliq * RAD) * Math.sin(L * RAD), Math.cos(L * RAD)) * DEG; // Sağ açıklık

    return { dec, RA, g, L };
}

/**
 * Güneş'in ufuk altındaki belirli bir dereceye (altituda) ulaşacağı saati hesaplar.
 * Sunset için: -0.83 derece (Kırılma dahil gerçek batış)
 * Astronomik Karanlık için: -18.0 derece
 */
function getSunTimeForAltitude(lat, lon, date, targetAlt) {
    const jd = getJulianDate(date);
    const coords = getSunCoordinates(jd);
    
    // Saat açısı (Hour Angle) hesabı
    const latRad = lat * RAD;
    const decRad = coords.dec * RAD;
    const altRad = targetAlt * RAD;

    const cosH = (Math.sin(altRad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));

    if (cosH > 1 || cosH < -1) {
        return null; // Güneş bu yüksekliğe hiç ulaşmıyor (Kutup gecesi/gündüzü)
    }

    const H = Math.acos(cosH) * DEG; // Derece cinsinden saat açısı
    const localNoon = 12 - (lon / 15) - ( (coords.L - coords.RA) / 15); // Yerel öğle vakti (Saat)
    
    const timeInHours = localNoon + (H / 15); // Batış saati (UTC cinsinden)
    
    // Kullanıcının yerel saat dilimine (timezone) çeviriyoruz
    const timezoneOffset = -date.getTimezoneOffset() / 60;
    let localTime = (timeInHours + timezoneOffset) % 24;
    if (localTime < 0) localTime += 24;

    const hour = Math.floor(localTime);
    const minute = Math.floor((localTime - hour) * 60);

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Ay'ın evresini ve aydınlanma yüzdesini hesaplar.
 */
export function getMoonStatus(date) {
    const jd = getJulianDate(date);
    const synodicMonth = 29.530588853;
    const knownNewMoon = 2451550.1; // 6 Ocak 2000 Yeni Ay
    
    const age = (jd - knownNewMoon) % synodicMonth;
    const phasePercent = (age / synodicMonth) * 100;

    let phaseName = "";
    if (phasePercent < 1.7) phaseName = "Yeni Ay 🌑";
    else if (phasePercent < 23) phaseName = "Hilal 🌒";
    else if (phasePercent < 27) phaseName = "İlk Dördün 🌓";
    else if (phasePercent < 48) phaseName = "Şişkin Ay 🌔";
    else if (phasePercent < 52) phaseName = "Dolunay 🌕";
    else if (phasePercent < 73) phaseName = "Şişkin Ay 🌖";
    else if (phasePercent < 77) phaseName = "Son Dördün 🌗";
    else if (phasePercent < 98) phaseName = "Hilal 🌘";
    else phaseName = "Yeni Ay 🌑";

    // Ay'ın ufukta olup olmadığını kaba bir yaklaşımla hesaplayalım (Güneş konumuna göre)
    // Python'daki moon.compute(obs) simülasyonu
    const isMoonUp = age > 6 && age < 23; // Kaba yaklaşım: Hilalden sonra ay gece gökyüzündedir

    return {
        phaseName,
        phasePercent: Math.round(phasePercent),
        isMoonUp,
        age
    };
}

/**
 * Python'daki estimate_bortle_offline fonksiyonunun birebir portu.
 */
export function estimateBortleOffline(lat, lon, date) {
    const moon = getMoonStatus(date);
    
    // Ay ufkun altındaysa veya Yeni Ay ise gökyüzü temizdir (Bortle 3)
    if (!moon.isMoonUp || moon.phasePercent < 15) {
        return { score: 3, reason: "Temiz Gökyüzü (Ay Yok)" };
    }

    // Ay'ın aydınlatma oranına göre kirlilik tahmini
    if (moon.phasePercent > 85) {
        return { score: 6, reason: "Dolunay Baskısı" };
    } else if (moon.phasePercent > 50) {
        return { score: 5, reason: "Baskın Ay Işığı" };
    } else if (moon.phasePercent > 20) {
        return { score: 4, reason: "Hafif Ay Etkisi" };
    }

    return { score: 3, reason: "Karanlık Gökyüzü" };
}

/**
 * Ana Güneş Zamanları Sorgulayıcısı
 */
export function getSunTimes(lat, lon, date) {
    // Kırılma payıyla standart Gün Batımı (-0.83°)
    const sunset = getSunTimeForAltitude(lat, lon, date, -0.83);
    // Astronomik Twilight Başlangıcı (-18.0°) - Gerçek zifiri karanlık
    const astroDark = getSunTimeForAltitude(lat, lon, date, -18.0);

    return {
        sunset: sunset || "Kutup Gündüzü",
        astroDark: astroDark || "Karanlık Yok"
    };
}