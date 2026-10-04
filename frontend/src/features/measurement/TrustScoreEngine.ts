import type { SignalQuality } from '../signal/signal.types.js';

export interface TrustScoreResult {
  score: number; // 0.0 to 1.0
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class TrustScoreEngine {
  evaluate(
    quality: SignalQuality,
    stableFrames: number,
    requiredStableFrames: number,
    validBpm: boolean,
    sampleCount: number,
    targetSampleCount: number // e.g., 512 for full buffer
  ): TrustScoreResult {
    
    const qualityWeight = 0.5;
    const stabilityWeight = 0.3;
    const durationWeight = 0.2;

    const stabilityRatio = Math.min(1, stableFrames / requiredStableFrames);
    const durationRatio = Math.min(1, sampleCount / targetSampleCount);

    let score = (
      quality.score * qualityWeight +
      stabilityRatio * stabilityWeight +
      durationRatio * durationWeight
    );

    // Note: no penalty for invalid BPM — trust builds from signal quality and stability,
    // so the face-locked warmup period naturally yields growing trust before BPM is stable.

    // Map to confidence
    let confidence: TrustScoreResult['confidence'] = 'LOW';
    if (score >= 0.8) confidence = 'HIGH';
    else if (score >= 0.4) confidence = 'MEDIUM';

    return {
      score,
      confidence,
    };
  }
}
