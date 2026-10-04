import type { FFTResult } from './signal.types.js';

// We use fft.js which is a fast, pure JS implementation
import FFTLib from 'fft.js';

export class FFT {
  private fps: number;
  private minFreq: number; // Hz (42 BPM)
  private maxFreq: number; // Hz (240 BPM)

  constructor(fps = 30, minBpm = 42, maxBpm = 240) {
    this.fps = fps;
    this.minFreq = minBpm / 60;
    this.maxFreq = maxBpm / 60;
  }

  compute(signal: Float32Array): FFTResult {
    const n = signal.length;
    if (n === 0) {
      return { frequencies: new Float32Array(), magnitudes: new Float32Array(), dominantFrequency: 0 };
    }

    // Find next power of 2 for FFT size
    const fftSize = Math.pow(2, Math.ceil(Math.log2(n)));
    
    // Pad signal with zeros if needed
    const paddedSignal = new Float32Array(fftSize);
    paddedSignal.set(signal);

    const f = new FFTLib(fftSize);
    const out = f.createComplexArray();
    
    // Convert real signal to complex array (interleaved real/imaginary)
    const complexInput = f.createComplexArray();
    for (let i = 0; i < fftSize; i++) {
        complexInput[i*2] = paddedSignal[i];     // Real
        complexInput[i*2+1] = 0;                 // Imaginary
    }

    f.transform(out, complexInput);

    // Calculate magnitudes for the first half (Nyquist limit)
    const numBins = Math.floor(fftSize / 2);
    const magnitudes = new Float32Array(numBins);
    const frequencies = new Float32Array(numBins);
    const binSize = this.fps / fftSize;

    let maxMag = -Infinity;
    let dominantFreq = 0;

    for (let i = 0; i < numBins; i++) {
      const real = out[i * 2];
      const imag = out[i * 2 + 1];
      const magnitude = Math.sqrt(real * real + imag * imag);
      const freq = i * binSize;

      frequencies[i] = freq;
      magnitudes[i] = magnitude;

      // Only consider frequencies within human heart rate range
      if (freq >= this.minFreq && freq <= this.maxFreq) {
        if (magnitude > maxMag) {
          maxMag = magnitude;
          dominantFreq = freq;
        }
      }
    }

    return {
      frequencies,
      magnitudes,
      dominantFrequency: dominantFreq,
    };
  }
}
