/**
 * EXPOSURE.JS - Pozlama Hesaplamaları ve Optik Limit Değerlendirme Modülü
 */

const SAFE_LIMIT_ISO = 1600;

/**
 * Sensör tipine ve megapiksel değerine göre gerçek piksel boyutunu (pixel pitch - µm) hesaplar.
 */
export function calculatePixelPitch(sensorType, megapixels) {
    const mp = megapixels * 1000000;
    let widthMm, aspectRatio;

    switch(sensorType) {
        case 'fullframe':
            widthMm = 36.0;
            aspectRatio = 1.5; // 3:2
            break;
        case 'apsc':
            widthMm = 23.5;
            aspectRatio = 1.5; // 3:2
            break;
        case 'apsc-canon':
            widthMm = 22.3;
            aspectRatio = 1.5; // 3:2
            break;
        case 'm43':
            widthMm = 17.3;
            aspectRatio = 1.3333; // 4:3
            break;
        case 'med-format':
            widthMm = 43.8;
            aspectRatio = 1.3333; // 4:3
            break;
        default:
            widthMm = 36.0;
            aspectRatio = 1.5;
    }

    // Yatay piksel sayısını bulup piksel boyutunu mikrona dönüştürüyoruz
    const pixelsWidth = Math.sqrt(mp * aspectRatio);
    return (widthMm * 1000) / pixelsWidth;
}

export function calculateNpfAdvanced(focal, aperture, pitch, declination) {
    const base_t = (16.9 * aperture + 25.6 * pitch + 13.7 * focal) / focal;
    const cos_factor = Math.max(Math.cos(declination * (Math.PI / 180)), 0.1);
    return base_t / cos_factor;
}

export function evaluateOptics(focal, aperture) {
    const warnings = [];
    if (focal >= 50 && aperture <= 3.0) {
        warnings.push("⚠️ OPTİK RİSK: Helios/Analog merceklerin kenar bölgelerinde vinyet ve koma (martı kanadı) etkisi belirginleşecektir. f/2.8 seviyesine kısmayı düşünebilirsiniz.");
    }
    if (aperture > 5.6) {
        warnings.push("⚠️ IŞIK RİSKİ: Yıldız fotoğrafçılığı için diyafram fazla kısık. Işık toplama verimi çok düşük kalacaktır.");
    }
    return warnings;
}

export function calculateSensorRecipe(t, aperture, bortle) {
    const bortle_factor = Math.pow(bortle, 0.7);
    const raw_iso = (5000 * Math.pow(aperture, 2)) / (t * bortle_factor);

    const standardIsos = [400, 800, 1600, 3200, 6400];
    let ideal_iso = standardIsos.reduce((prev, curr) => {
        return Math.abs(curr - raw_iso) < Math.abs(prev - raw_iso) ? curr : prev;
    });

    let stack_frames = 1;
    if (ideal_iso > SAFE_LIMIT_ISO) {
        const stop_difference = Math.log2(ideal_iso / SAFE_LIMIT_ISO);
        stack_frames = Math.ceil(Math.pow(2, stop_difference));
        ideal_iso = SAFE_LIMIT_ISO;
    }

    return {
        iso: ideal_iso,
        stack: stack_frames
    };
}