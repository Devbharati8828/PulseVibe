import type { RGBSample } from '../sampling/SamplingEngine.js';

/**
 * POS algorithm — Wang et al. (2017)
 *
 * Plane-Orthogonal-to-Skin method.
 * Exploits the fact that the skin specular reflection lies in a plane
 * orthogonal to the skin color vector.
 *
 * Reference: Wang, W., den Brinker, A. C., Stuijk, S., & de Haan, G. (2017).
 * Algorithmic Principles of Remote PPG. IEEE Transactions on Biomedical Engineering.
 */
export function pos(samples: RGBSample[]): Float32Array {
  const n = samples.length;
  if (n < 2) return new Float32Array(n);

  // Temporal normalization: divide each channel by its running mean
  const rNorm = new Float32Array(n);
  const gNorm = new Float32Array(n);
  const bNorm = new Float32Array(n);

  let rMean = 0, gMean = 0, bMean = 0;
  for (let i = 0; i < n; i++) {
    rMean += samples[i].r;
    gMean += samples[i].g;
    bMean += samples[i].b;
  }
  rMean /= n; gMean /= n; bMean /= n;

  const rDiv = rMean || 1;
  const gDiv = gMean || 1;
  const bDiv = bMean || 1;

  for (let i = 0; i < n; i++) {
    rNorm[i] = samples[i].r / rDiv;
    gNorm[i] = samples[i].g / gDiv;
    bNorm[i] = samples[i].b / bDiv;
  }

  // POS projection matrix (from Wang et al. Table I)
  // P = [[0, 1, -1], [-2, 1, 1]]
  // H = P × [Rn, Gn, Bn]^T
  const H0 = new Float32Array(n); // row 1: 0*R + 1*G - 1*B
  const H1 = new Float32Array(n); // row 2: -2*R + 1*G + 1*B

  for (let i = 0; i < n; i++) {
    H0[i] = gNorm[i] - bNorm[i];
    H1[i] = -2 * rNorm[i] + gNorm[i] + bNorm[i];
  }

  // α = std(H0) / std(H1)
  const stdH0 = std(H0);
  const stdH1 = std(H1);
  const alpha = stdH1 !== 0 ? stdH0 / stdH1 : 1;

  // Final signal = H0 + α * H1
  const signal = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    signal[i] = H0[i] + alpha * H1[i];
  }

  return signal;
}

function std(arr: Float32Array): number {
  const n = arr.length;
  if (n < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}
