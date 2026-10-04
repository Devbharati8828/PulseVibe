export type SignalQualityLabel = 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';

export interface SignalQuality {
  score: number;       // 0.0 to 1.0
  label: SignalQualityLabel;
  reasons: string[];
}

export interface FFTResult {
  frequencies: Float32Array;
  magnitudes: Float32Array;
  dominantFrequency: number;
}

export interface SignalMetrics {
  snr: number;
}
