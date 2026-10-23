/**
 * INTERVALOMETER.TS - Astrofotografi Çekim Zamanlayıcısı ve Deklanşör Motoru
 */

import { playShutterClick, playBeep, triggerHaptic } from './sensors';

export type IntervalometerState = 'idle' | 'lead_in' | 'exposing' | 'resting' | 'completed';

export interface IntervalometerStatus {
  state: IntervalometerState;
  currentFrame: number;
  totalFrames: number;
  remainingFrameSeconds: number;
  frameExposureSeconds: number;
  totalRemainingSeconds: number;
}

export type StatusCallback = (status: IntervalometerStatus) => void;

export class Intervalometer {
  private state: IntervalometerState = 'idle';
  private currentFrame = 0;
  private totalFrames = 10;
  private exposureSeconds = 15;
  private restSeconds = 3;
  private timerId: number | null = null;
  private secondsInCurrentState = 0;
  private onStatusChange: StatusCallback | null = null;

  constructor(onStatusChange?: StatusCallback) {
    if (onStatusChange) {
      this.onStatusChange = onStatusChange;
    }
  }

  public setCallback(cb: StatusCallback): void {
    this.onStatusChange = cb;
  }

  public start(totalFrames: number, exposureSeconds: number, restSeconds = 2): void {
    this.stop();
    this.totalFrames = Math.max(1, totalFrames);
    this.exposureSeconds = Math.max(1, Math.round(exposureSeconds));
    this.restSeconds = Math.max(1, restSeconds);
    this.currentFrame = 1;

    // 3 saniyelik hazırlık süresi (lead-in)
    this.state = 'lead_in';
    this.secondsInCurrentState = 3;
    playBeep(440, 100);
    triggerHaptic(50);
    this.emitStatus();

    this.timerId = window.setInterval(() => this.tick(), 1000);
  }

  public stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.state = 'idle';
    this.emitStatus();
  }

  public getStatus(): IntervalometerStatus {
    let remainingFrameSeconds = 0;
    if (this.state === 'lead_in') {
      remainingFrameSeconds = this.secondsInCurrentState;
    } else if (this.state === 'exposing') {
      remainingFrameSeconds = this.secondsInCurrentState;
    } else if (this.state === 'resting') {
      remainingFrameSeconds = this.secondsInCurrentState;
    }

    const remainingFramesCount = Math.max(0, this.totalFrames - this.currentFrame);
    const totalRemaining = (this.state === 'exposing' ? this.secondsInCurrentState : 0) +
      (this.state === 'resting' ? this.secondsInCurrentState : 0) +
      (remainingFramesCount * (this.exposureSeconds + this.restSeconds));

    return {
      state: this.state,
      currentFrame: this.currentFrame,
      totalFrames: this.totalFrames,
      remainingFrameSeconds,
      frameExposureSeconds: this.exposureSeconds,
      totalRemainingSeconds: Math.max(0, totalRemaining)
    };
  }

  private tick(): void {
    this.secondsInCurrentState -= 1;

    if (this.state === 'lead_in') {
      if (this.secondsInCurrentState > 0) {
        playBeep(440, 80);
        triggerHaptic(40);
      } else {
        // Pozlama başlasın!
        this.state = 'exposing';
        this.secondsInCurrentState = this.exposureSeconds;
        playShutterClick();
        triggerHaptic([80, 50, 80]);
      }
    } else if (this.state === 'exposing') {
      if (this.secondsInCurrentState <= 0) {
        // Pozlama bitti, deklanşör kapandı
        playShutterClick();
        triggerHaptic(60);

        if (this.currentFrame >= this.totalFrames) {
          // Çekim serisi bitti
          this.state = 'completed';
          if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
          }
          playBeep(880, 400);
          triggerHaptic([150, 80, 150, 80, 300]);
        } else {
          // Dinlenme süresi (sensör tampon boşaltma)
          this.state = 'resting';
          this.secondsInCurrentState = this.restSeconds;
        }
      }
    } else if (this.state === 'resting') {
      if (this.secondsInCurrentState <= 0) {
        // Sonraki kareye geç
        this.currentFrame += 1;
        this.state = 'exposing';
        this.secondsInCurrentState = this.exposureSeconds;
        playShutterClick();
        triggerHaptic([80, 50, 80]);
      }
    }

    this.emitStatus();
  }

  private emitStatus(): void {
    if (this.onStatusChange) {
      this.onStatusChange(this.getStatus());
    }
  }
}
