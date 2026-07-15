/**
 * EXPOSURE.JS - Pozlama Hesaplamaları ve Optik Limit Değerlendirme Modülü
 */

const SAFE_LIMIT_ISO = 1600;

// Sensör Geometrisi Sözlüğü (O(1) Erişim ve Kolay Genişletilebilirlik)
const SENSOR_GEOMETRIES = {
    'fullframe':   { widthMm: 36.0, aspectRatio: 1.5 },     // 3:2
    'apsc':        { widthMm: 23.5, aspectRatio: 1.5 },     // 3:2
    'apsc-canon':  { widthMm: 22.3, aspectRatio: 1.5 },     // 3:2
    'm43':         { widthMm: 17.3, aspectRatio: 1.3333 },  // 4:3
    'med-format':  { widthMm: 43.8, aspectRatio: 1.3333 }   // 4:3
};

/**
 * Sensör tipine ve megapiksel değerine göre gerçek piksel boyutunu (pixel pitch - µm) hesaplar.
 */
export function calculatePixelPitch(sensorType, megapixels) {
    // Megapiksel kontrolü (Sıfıra bölünme ve negatif değer koruması)
    const mpVal = parseFloat(megapixels);
    if (isNaN(mpVal) || mpVal <= 0) return 5.96; // Sektör standardı güvenli varsayılan (24MP Full Frame)

    // Sözlükten sensör geometrisini çek, yoksa varsayılan olarak fullframe kullan
    const geometry = SENSOR_GEOMETRIES[sensorType] || SENSOR_GEOMETRIES['fullframe'];
    
    const mp = mpVal * 1000000;
    
    // Yatay piksel sayısı hesabı: sqrt(MP * EnBoyOranı)
    const pixelsWidth = Math.sqrt(mp * geometry.aspectRatio);
    
    // Milimetreyi mikrona çevirip yatay piksel sayısına bölüyoruz
    return (geometry.widthMm * 1000) / pixelsWidth;
}

/**
 * Gelişmiş NPF Kuralına göre yıldız uzaması olmadan yapılabilecek maksimum pozlama süresini hesaplar.
 */
export function calculateNpfAdvanced(focal, aperture, pitch, declination) {
    const f = parseFloat(focal);
    const n = parseFloat(aperture);
    const p = parseFloat(pitch);
    const dec = parseFloat(declination);

    // Sıfıra bölünme koruması
    if (isNaN(f) || f <= 0 || isNaN(n) || n <= 0 || isNaN(p) || p <= 0) {
        return 0;
    }

    // Klasik NPF Formülü: (16.9 * N + 25.6 * p + 13.7 * f) / f
    const base_t = (16.9 * n + 25.6 * p + 13.7 * f) / f;
    
    // Kutba yaklaştıkça uzama hızı düştüğü için süreyi uzatan kozinüs çarpanı (maksimum 10 kat izin)
    const cos_factor = Math.max(Math.cos(dec * (Math.PI / 180)), 0.1);
    
    return base_t / cos_factor;
}

/**
 * Optik yapıya ve mercek kusurlarına göre sahada uyarı üretir.
 */
export function evaluateOptics(focal, aperture) {
    const warnings = [];
    const f = parseFloat(focal);
    const n = parseFloat(aperture);

    if (isNaN(f) || isNaN(n)) return warnings;

    // Helios 44M-4 gibi analog/klasik lensler için felsefi ve teknik uyarı
    if (f >= 50 && n <= 3.0) {
        warnings.push("⚠️ OPTİK RİSK: Helios/Analog merceklerin kenar bölgelerinde vinyet ve koma (martı kanadı) etkisi belirginleşecektir. f/2.8 seviyesine kısmayı düşünebilirsiniz.");
    }
    
    if (n > 5.6) {
        warnings.push("⚠️ IŞIK RİSKİ: Yıldız fotoğrafçılığı için diyafram fazla kısık. Işık toplama verimi çok düşük kalacaktır.");
    }
    
    return warnings;
}

/**
 * Hedef pozlama süresi ve çevre karanlığına göre ideal ISO ve İstifleme (Stack) reçetesini çıkarır.
 */
export function calculateSensorRecipe(t, aperture, bortle) {
    const time = parseFloat(t);
    const n = parseFloat(aperture);
    const b = parseInt(bortle);

    if (isNaN(time) || time <= 0 || isNaN(n) || n <= 0 || isNaN(b) || b <= 0) {
        return { iso: 800, stack: 1, frameTime: time, overexposed: false };
    }

    const bortle_factor = Math.pow(b, 0.7);
    
    // Işık kirliliği ve diyaframa göre ham ISO hesabı
    const raw_iso = (5000 * Math.pow(n, 2)) / (time * bortle_factor);
    const standardIsos = [100, 200, 400, 800, 1600, 3200, 6400];
    
    let ideal_iso = standardIsos.reduce((prev, curr) => {
        return Math.abs(curr - raw_iso) < Math.abs(prev - raw_iso) ? curr : prev;
    });

    let stack_frames = 1;
    let frameTime = time;
    let overexposed = false;

    if (ideal_iso > SAFE_LIMIT_ISO) {
        // Yüksek ISO Kumlanma Koruması (Mevcut mantık)
        const stop_difference = Math.log2(ideal_iso / SAFE_LIMIT_ISO);
        stack_frames = Math.ceil(Math.pow(2, stop_difference));
        ideal_iso = SAFE_LIMIT_ISO;
    } else if (raw_iso < 100) {
        // GERÇEKÇİ ŞEHİR KORUMASI: Eğer gereken ISO 100'ün altındaysa sensör patlar.
        // Toplam süreyi (t) bölüp istifleyerek aşırı pozlamayı engelliyoruz.
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