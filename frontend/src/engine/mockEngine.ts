import type { EngineResult, TrackingState, SignalQuality, EngineCallback } from './types';
import { CONSTANTS } from '../lib/constants';

export class MockEngineService {
  private isRunning = false;
  private animationFrameId = 0;
  private lastTimestamp = 0;
  private startTime = 0;
  private callback: EngineCallback | null = null;

  // Simulation state
  private state: TrackingState = 'idle';
  private currentBpm = 0;
  private targetBpm = 72;
  private trust = 0;

  public start(cb: EngineCallback) {
    this.callback = cb;
    this.isRunning = true;
    this.state = 'scanning';
    this.startTime = performance.now();
    this.lastTimestamp = performance.now();
    this.targetBpm = 72 + Math.random() * 10 - 5; // 67-77 BPM
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
    this.state = 'idle';
  }

  private loop = () => {
    if (!this.isRunning) return;
    
    const now = performance.now();
    const dt = now - this.lastTimestamp;
    const elapsed = now - this.startTime;
    this.lastTimestamp = now;

    // State machine progression
    if (elapsed > 1000 && this.state === 'scanning') this.state = 'detected';
    if (elapsed > 1500 && this.state === 'detected') this.state = 'locking';
    if (elapsed > 2500 && this.state === 'locking') this.state = 'locked';
    if (elapsed > 3000 && this.state === 'locked') this.state = 'acquiring';
    if (elapsed > 6000 && this.state === 'acquiring') this.state = 'processing';
    if (elapsed > 6500 && this.state === 'processing') this.state = 'stabilized';

    // Simulate trust score climbing
    if (this.state === 'stabilized') {
      this.trust = Math.min(0.95, this.trust + 0.01);
    } else if (this.state === 'acquiring' || this.state === 'processing') {
      this.trust = Math.min(0.6, this.trust + 0.05);
    } else if (this.state === 'locked') {
      this.trust = 0.2;
    } else {
      this.trust = 0;
    }

    // Simulate BPM
    if (this.state === 'stabilized') {
      this.currentBpm += (this.targetBpm - this.currentBpm) * 0.1;
      // Add slight noise to target
      if (Math.random() > 0.95) this.targetBpm += Math.random() * 2 - 1;
    } else {
      this.currentBpm = 0;
    }

    let quality: SignalQuality = 'none';
    if (this.trust > 0.8) quality = 'excellent';
    else if (this.trust > 0.6) quality = 'good';
    else if (this.trust > 0.4) quality = 'fair';
    else if (this.trust > 0) quality = 'poor';

    const t = elapsed / 1000;
    const freq = (this.currentBpm || 72) / 60;
    const baseSignal = Math.sin(t * freq * Math.PI * 2);
    const noise = (Math.random() - 0.5) * 0.2;

    const result: EngineResult = {
      landmarks: this.state !== 'scanning' && this.state !== 'idle' ? Array(478).fill(0).map((_, i) => ({
        x: 0.5 + Math.cos(i) * 0.1 + (Math.random() - 0.5) * 0.005,
        y: 0.5 + Math.sin(i) * 0.15 + (Math.random() - 0.5) * 0.005,
        z: (Math.random() - 0.5) * 0.1
      })) : null,
      faceDetected: this.state !== 'scanning' && this.state !== 'idle',
      faceConfidence: this.state === 'stabilized' ? 0.99 : (this.state !== 'idle' && this.state !== 'scanning' ? 0.8 : 0),
      faceBounds: this.state !== 'scanning' && this.state !== 'idle' ? { x: 0.4, y: 0.35, width: 0.2, height: 0.3 } : null,
      trackingState: this.state,
      roi: [
        { name: 'forehead', points: [{x:0.45, y:0.4}, {x:0.55, y:0.4}, {x:0.55, y:0.45}, {x:0.45, y:0.45}], signalStrength: this.trust },
        { name: 'leftCheek', points: [{x:0.4, y:0.5}, {x:0.45, y:0.5}, {x:0.45, y:0.55}, {x:0.4, y:0.55}], signalStrength: this.trust * 0.8 },
        { name: 'rightCheek', points: [{x:0.55, y:0.5}, {x:0.6, y:0.5}, {x:0.6, y:0.55}, {x:0.55, y:0.55}], signalStrength: this.trust * 0.9 },
      ],
      rppgSignal: Array(CONSTANTS.BUFFER_SIZE).fill(0), // Mock doesn't fill array for now
      filteredSignal: Array(CONSTANTS.BUFFER_SIZE).fill(0),
      fftSpectrum: Array(128).fill(0).map((_, i) => {
        const binFreq = (i / 128) * (CONSTANTS.SAMPLE_RATE / 2);
        return Math.exp(-Math.pow(binFreq - freq, 2) / 0.1) * this.trust * 100;
      }),
      fftFrequencies: Array(128).fill(0).map((_, i) => (i / 128) * (CONSTANTS.SAMPLE_RATE / 2)),
      dominantFrequency: freq,
      bpm: this.currentBpm,
      trustScore: this.trust,
      signalQuality: quality,
      motionLevel: Math.random() * 0.1,
      motionWarning: false,
      timestamp: now,
      fps: 1000 / dt,
      isSimulation: true,
      activeAlgorithm: 'chrom',
    };

    if (this.callback) {
      this.callback(result);
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
