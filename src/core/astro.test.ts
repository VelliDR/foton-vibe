import { describe, it, expect } from 'vitest';
import { getMoonStatus, getSunTimes, estimateBortleOffline, getCelestialPositions, CELESTIAL_CATALOG, getCardinalDirection } from './astro';

describe('Astronomi Motoru (astro.ts)', () => {
  const ankaraLat = 39.9333;
  const ankaraLon = 32.8500;
  const testDate = new Date('2026-10-23T12:00:00Z');

  it('Güneş batımı ve astronomik karanlık saatlerini tutarlı hesaplamalı', () => {
    const sunTimes = getSunTimes(ankaraLat, ankaraLon, testDate);
    expect(sunTimes.sunset).toMatch(/^\d{2}:\d{2}$/);
    expect(sunTimes.astroDarkStart).toMatch(/^\d{2}:\d{2}$/);
    expect(sunTimes.astroDarkEnd).toMatch(/^\d{2}:\d{2}$/);
    expect(sunTimes.darkDurationText).toContain('sa');
  });

  it('Ay evresi, aydınlanma yüzdesi ve irtifasını hatasız hesaplamalı', () => {
    const moon = getMoonStatus(ankaraLat, ankaraLon, testDate);
    expect(moon.phasePercent).toBeGreaterThanOrEqual(0);
    expect(moon.phasePercent).toBeLessThanOrEqual(100);
    expect(typeof moon.altitude).toBe('number');
    expect(typeof moon.azimuth).toBe('number');
    expect(typeof moon.isMoonUp).toBe('boolean');
    expect(moon.phaseName.length).toBeGreaterThan(0);
  });

  it('Ay ufkun altındayken Bortle skoruna gereksiz ceza puanı eklememeli', () => {
    // Ayın ufkun altında olduğu bir durum
    const result = estimateBortleOffline(ankaraLat, ankaraLon, testDate, 3);
    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThanOrEqual(9);
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it('Katalogdaki tüm hedefler (10 hedef) için Alt/Az hesaplayabilmeli', () => {
    const positions = getCelestialPositions(ankaraLat, ankaraLon, testDate, 'all');
    expect(positions.length).toBe(CELESTIAL_CATALOG.length);
    
    positions.forEach(pos => {
      expect(pos.alt).toBeGreaterThanOrEqual(-90);
      expect(pos.alt).toBeLessThanOrEqual(90);
      expect(pos.az).toBeGreaterThanOrEqual(0);
      expect(pos.az).toBeLessThan(360);
      expect(typeof pos.isVisible).toBe('boolean');
      expect(pos.cardinal).toMatch(/^(K|KD|D|GD|G|GB|B|KB)$/);
    });
  });

  it('Kategori filtrelemesi doğru çalışmalı', () => {
    const dsoList = getCelestialPositions(ankaraLat, ankaraLon, testDate, 'dso');
    expect(dsoList.every(t => t.category === 'dso')).toBe(true);

    const planetList = getCelestialPositions(ankaraLat, ankaraLon, testDate, 'planet');
    expect(planetList.every(t => t.category === 'planet')).toBe(true);
  });

  it('Yön açılarını ana ve ara yönlere doğru çevirmeli', () => {
    expect(getCardinalDirection(0)).toBe('K');
    expect(getCardinalDirection(90)).toBe('D');
    expect(getCardinalDirection(180)).toBe('G');
    expect(getCardinalDirection(270)).toBe('B');
    expect(getCardinalDirection(45)).toBe('KD');
  });
});
