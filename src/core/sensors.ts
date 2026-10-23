/**
 * SENSORS.TS - Donanım, Sensörler, WakeLock ve Ses/Titreşim Motoru
 */

// --- 1. SCREEN WAKE LOCK API (Ekranı Açık Tutma) ---
let wakeLockSentinel: WakeLockSentinel | null = null;

export function isWakeLockSupported(): boolean {
  return 'wakeLock' in navigator;
}

export async function requestWakeLock(): Promise<boolean> {
  if (!isWakeLockSupported()) return false;
  try {
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });
    return true;
  } catch (err) {
    console.warn("WakeLock talebi reddedildi:", err);
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch {
      // ignore
    }
    wakeLockSentinel = null;
  }
}

export function isWakeLockActive(): boolean {
  return wakeLockSentinel !== null;
}

// --- 2. HAPTIC FEEDBACK (Titreşim Motoru) ---
export function triggerHaptic(pattern: number | number[] = 50): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Bazı tarayıcılarda kullanıcı etkileşimi olmadan sessizce engellenir
    }
  }
}

// --- 3. WEB AUDIO SES MOTORU (Harici ses dosyasına ihtiyaç duymadan mekanik ses sentezi) ---
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playBeep(freq = 880, durationMs = 80, type: OscillatorType = 'sine'): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (e) {
    console.warn("Ses çalınamadı:", e);
  }
}

export function playShutterClick(): void {
  // Mekanik analog deklanşör sesine benzer çift vuruş sentezi
  playBeep(1200, 40, 'triangle');
  setTimeout(() => playBeep(600, 60, 'sine'), 45);
}

// --- 4. DEVICE ORIENTATION & PUSULA MOTORU ---
export interface OrientationData {
  heading: number; // 0..360 (Kuzey = 0)
  pitch: number;   // -90..+90
  roll: number;    // -180..+180
}

type OrientationCallback = (data: OrientationData) => void;
let orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;

export async function requestOrientationPermission(): Promise<boolean> {
  // iOS 13+ izni
  const DeviceOrientationEventAny = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };

  if (typeof DeviceOrientationEventAny.requestPermission === 'function') {
    try {
      const response = await DeviceOrientationEventAny.requestPermission();
      return response === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}

export function startCompass(callback: OrientationCallback): boolean {
  if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
    return false;
  }

  stopCompass();

  orientationHandler = (e: DeviceOrientationEvent) => {
    let heading = 0;

    // iOS webkitCompassHeading desteği
    if ('webkitCompassHeading' in e && typeof (e as unknown as { webkitCompassHeading: number }).webkitCompassHeading === 'number') {
      heading = (e as unknown as { webkitCompassHeading: number }).webkitCompassHeading;
    } else if (e.alpha !== null) {
      // Android / Standart: alpha değeri (saat yönünün tersi)
      heading = (360 - e.alpha) % 360;
    }

    const pitch = e.beta || 0;
    const roll = e.gamma || 0;

    callback({ heading, pitch, roll });
  };

  window.addEventListener('deviceorientation', orientationHandler, true);
  return true;
}

export function stopCompass(): void {
  if (orientationHandler) {
    window.removeEventListener('deviceorientation', orientationHandler, true);
    orientationHandler = null;
  }
}
