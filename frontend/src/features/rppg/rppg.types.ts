import type { RGBSample } from '../sampling/SamplingEngine.js';

export type RPPGAlgorithm = 'GREEN' | 'CHROM' | 'POS';

export interface RPPGEngine {
  addSample(sample: RGBSample): void;
  process(): Float32Array;
  reset(): void;
  setAlgorithm(algorithm: RPPGAlgorithm): void;
  getSampleCount(): number;
}
