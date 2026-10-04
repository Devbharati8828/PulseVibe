export interface BPMResult {
  bpm: number | null;
  valid: boolean;
}

export class BPMEngine {
  private prevBPM: number | null = null;
  private readonly ALPHA = 0.2; // Exponential moving average smoothing factor
  private readonly MIN_BPM = 42;
  private readonly MAX_BPM = 240;

  compute(dominantFrequencyHz: number, signalValid: boolean): BPMResult {
    if (!signalValid || dominantFrequencyHz === 0) {
      return { bpm: this.prevBPM, valid: false };
    }

    const rawBpm = dominantFrequencyHz * 60;

    if (rawBpm < this.MIN_BPM || rawBpm > this.MAX_BPM) {
      return { bpm: this.prevBPM, valid: false };
    }

    let smoothed = rawBpm;
    if (this.prevBPM !== null) {
      smoothed = this.ALPHA * rawBpm + (1 - this.ALPHA) * this.prevBPM;
    }

    this.prevBPM = smoothed;
    return { bpm: smoothed, valid: true };
  }

  reset(): void {
    this.prevBPM = null;
  }
}
