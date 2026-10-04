import type { RGBSample } from '../sampling/SamplingEngine.js';

/**
 * CHROM algorithm — de Haan & Jeanne (2013)
 *
 * Uses chrominance to separate blood-volume pulse from motion artifacts.
 *
 * X = 3R - 2G
 * Y = 1.5R + G - 1.5B
 * α = std(X) / std(Y)
 * H = X - α * Y
 *
 * Reference: de Haan, G., & Jeanne, V. (2013). Robust pulse rate from
 * chrominance-based rPPG. IEEE Transactions on Biomedical Engineering.
 */
export function chrom(samples: RGBSample[]): Float32Array {
  const n = samples.length;
  if (n < 2) return new Float32Array(n);

  // Normalize each channel
  const rArr = new Float32Array(n);
  const gArr = new Float32Array(n);
  const bArr = new Float32Array(n);

  let rMean = 0, gMean = 0, bMean = 0;
  for (let i = 0; i < n; i++) {
    rMean += samples[i].r;
    gMean += samples[i].g;
    bMean += samples[i].b;
  }
  rMean /= n; gMean /= n; bMean /= n;

  // Avoid divide-by-zero
  const rDiv = rMean || 1;
  const gDiv = gMean || 1;
  const bDiv = bMean || 1;

  for (let i = 0; i < n; i++) {
    rArr[i] = samples[i].r / rDiv;
    gArr[i] = samples[i].g / gDiv;
    bArr[i] = samples[i].b / bDiv;
  }

  // CHROM: X, Y signals
  const X = new Float32Array(n);
  const Y = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    X[i] = 3 * rArr[i] - 2 * gArr[i];
    Y[i] = 1.5 * rArr[i] + gArr[i] - 1.5 * bArr[i];
  }

  // Compute std of X and Y
  const stdX = std(X);
  const stdY = std(Y);
  const alpha = stdY !== 0 ? stdX / stdY : 1;

  // Final signal H = X - α * Y
  const H = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    H[i] = X[i] - alpha * Y[i];
  }

  return H;
}

function std(arr: Float32Array): number {
  const n = arr.length;
  if (n < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}
