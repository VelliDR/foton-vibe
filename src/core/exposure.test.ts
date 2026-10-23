import { describe, it, expect } from 'vitest';
import { calculatePixelPitch, calculateNpfAdvanced, evaluateOptics, calculateSensorRecipe, calculateRuleOf500 } from './exposure';

describe('Pozlama Laboratuvarı (exposure.ts)', () => {
  it('Full Frame ve APS-C için piksel pitch hesaplaması doğru olmalı', () => {
    // 24MP Full Frame sensör (~5.96 µm)
    const pitchFF = calculatePixelPitch('fullframe', 24);
    expect(pitchFF).toBeCloseTo(5.96, 1);

    // 24MP APS-C sensör (~3.9 µm)
    const pitchAPSC = calculatePixelPitch('apsc', 24);
    expect(pitchAPSC).toBeCloseTo(3.9, 1);
  });

  it('NPF formülü odak uzaklığı, diyafram ve deklinasyona göre mantıklı süre üretmeli', () => {
    // 50mm f/2 lens, 5.96 pitch, 0 dec
    const timeEquator = calculateNpfAdvanced(50, 2.0, 5.96, 0);
    expect(timeEquator).toBeGreaterThan(0);
    expect(timeEquator).toBeLessThan(30);

    // Kutup yıldızına yaklaştıkça (dec=89) pozlama süresi uzamalı
    const timePolar = calculateNpfAdvanced(50, 2.0, 5.96, 89);
    expect(timePolar).toBeGreaterThan(timeEquator * 5);
  });

  it('Analog lens ve açık diyafram risklerini uyarmalı', () => {
    // 50mm f/2.0 Helios uyarısı
    const warnings = evaluateOptics(50, 2.0);
    expect(warnings.some(w => w.includes('Helios'))).toBe(true);

    // f/8 çok kısık diyafram uyarısı
    const darkWarnings = evaluateOptics(50, 8.0);
    expect(darkWarnings.some(w => w.includes('IŞIK RİSKİ'))).toBe(true);
  });

  it('Aşırı pozlama durumunda istifleme karelerine bölmeli', () => {
    // 30 sn pozlama, f/1.2, Bortle 9 şehir ışığı -> raw_iso < 100
    const recipe = calculateSensorRecipe(30, 1.2, 9);
    expect(recipe.overexposed).toBe(true);
    expect(recipe.stack).toBeGreaterThan(1);
    expect(recipe.frameTime).toBeLessThan(30);
  });

  it('500 Kuralı crop faktörüne göre hesaplanmalı', () => {
    // 50mm Full Frame: 500 / 50 = 10s
    expect(calculateRuleOf500(50, 'fullframe')).toBe(10);
    // 50mm APS-C (1.5x): 500 / 75 = 6.67s
    expect(calculateRuleOf500(50, 'apsc')).toBeCloseTo(6.67, 1);
  });
});
