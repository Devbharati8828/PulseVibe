/**
 * SignalProcessor — cleans and filters the raw rPPG signal.
 * Pipeline:
 * 1. Detrend (remove slow fluctuations)
 * 2. Hamming Window (reduce spectral leakage)
 * 3. Normalize (zero mean, unit variance)
 * 4. Bandpass filter (optional, often FFT handles frequency limits)
 */
export class SignalProcessor {
  process(signal: Float32Array): Float32Array {
    if (signal.length < 2) return new Float32Array(signal);

    const detrended = this.detrend(signal);
    const windowed = this.applyHammingWindow(detrended);
    return this.normalize(windowed);
  }

  private detrend(signal: Float32Array): Float32Array {
    const n = signal.length;
    // Simple linear detrend using least squares
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += signal[i];
      sumXY += i * signal[i];
      sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const result = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      result[i] = signal[i] - (slope * i + intercept);
    }
    return result;
  }

  private applyHammingWindow(signal: Float32Array): Float32Array {
    const n = signal.length;
    const result = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1));
      result[i] = signal[i] * window;
    }
    return result;
  }

  private normalize(signal: Float32Array): Float32Array {
    const n = signal.length;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += signal[i];
    const mean = sum / n;

    let varianceSum = 0;
    for (let i = 0; i < n; i++) varianceSum += (signal[i] - mean) ** 2;
    const stdDev = Math.sqrt(varianceSum / n);

    const result = new Float32Array(n);
    if (stdDev === 0) return result;

    for (let i = 0; i < n; i++) {
      result[i] = (signal[i] - mean) / stdDev;
    }
    return result;
  }
}
