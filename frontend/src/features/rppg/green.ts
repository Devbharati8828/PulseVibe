import type { RGBSample } from '../sampling/SamplingEngine.js';

/**
 * Green channel algorithm — simplest rPPG approach.
 * Extracts the green channel directly as the pulse signal.
 * Green has the highest absorption contrast for hemoglobin.
 */
export function greenChannel(samples: RGBSample[]): Float32Array {
  const signal = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    signal[i] = samples[i].g;
  }
  return signal;
}
