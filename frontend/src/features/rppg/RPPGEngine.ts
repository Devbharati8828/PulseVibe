import type { RGBSample } from '../sampling/SamplingEngine.js';
import type { RPPGAlgorithm } from './rppg.types.js';
import { greenChannel } from './green.js';
import { chrom } from './chrom.js';
import { pos } from './pos.js';

const MAX_BUFFER_SIZE = 512; // ~17 seconds at 30fps

/**
 * RPPGEngine — manages the rolling sample buffer and dispatches
 * to the appropriate rPPG algorithm.
 *
 * No artificial signals are ever generated.
 * All samples must come from real camera pixels via SamplingEngine.
 */
export class RPPGEngine {
  private buffer: RGBSample[] = [];
  private algorithm: RPPGAlgorithm = 'CHROM';

  addSample(sample: RGBSample): void {
    this.buffer.push(sample);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.shift(); // evict oldest
    }
  }

  process(): Float32Array {
    if (this.buffer.length < 2) {
      return new Float32Array(0);
    }

    switch (this.algorithm) {
      case 'GREEN':
        return greenChannel(this.buffer);
      case 'CHROM':
        return chrom(this.buffer);
      case 'POS':
        return pos(this.buffer);
    }
  }

  setAlgorithm(algorithm: RPPGAlgorithm): void {
    if (this.algorithm !== algorithm) {
      this.algorithm = algorithm;
      this.buffer = []; // reset buffer on algorithm change
    }
  }

  reset(): void {
    this.buffer = [];
  }

  getSampleCount(): number {
    return this.buffer.length;
  }

  getBuffer(): ReadonlyArray<RGBSample> {
    return this.buffer;
  }
}
