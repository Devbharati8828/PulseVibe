import type { FFTResult, SignalQuality } from './signal.types.js';

export class SignalQualityEngine {
  private fps: number;

  constructor(fps = 30) {
    this.fps = fps;
  }

  evaluate(
    fftResult: FFTResult,
    motionScore: number,
    isLocked: boolean
  ): SignalQuality {
    const { frequencies, magnitudes, dominantFrequency } = fftResult;
    const reasons: string[] = [];
    
    if (frequencies.length === 0 || dominantFrequency === 0) {
      return { score: 0, label: 'POOR', reasons: ['No valid signal data'] };
    }

    // 1. Calculate Signal-to-Noise Ratio (SNR) in frequency domain
    let signalPower = 0;
    let noisePower = 0;
    const binSize = this.fps / (frequencies.length * 2);
    // define signal band as +/- 0.15 Hz around the dominant frequency
    const signalBand = 0.15; 

    for (let i = 0; i < frequencies.length; i++) {
      const f = frequencies[i];
      const p = magnitudes[i] * magnitudes[i];
      if (Math.abs(f - dominantFrequency) <= signalBand) {
        signalPower += p;
      } else {
        noisePower += p;
      }
    }

    const snr = noisePower === 0 ? 100 : 10 * Math.log10(signalPower / noisePower);
    
    // Normalize SNR roughly to [0, 1]. Typical good SNR is > 3dB, excellent > 8dB
    let snrScore = Math.max(0, Math.min(1, (snr + 5) / 15));

    // 2. Motion penalty
    // motionScore typically [0..1], > 0.05 is bad
    let motionPenalty = 0;
    if (motionScore > 0.02) {
      motionPenalty = Math.min(0.5, (motionScore - 0.02) * 10);
      reasons.push('High movement detected');
    }

    // 3. Face Lock requirement
    if (!isLocked) {
      reasons.push('Face not securely locked');
      snrScore *= 0.5; // Halve score if not locked
    }

    const finalScore = Math.max(0, Math.min(1, snrScore - motionPenalty));
    
    let label: SignalQuality['label'] = 'POOR';
    if (finalScore >= 0.8) label = 'EXCELLENT';
    else if (finalScore >= 0.6) label = 'GOOD';
    else if (finalScore >= 0.4) label = 'FAIR';

    if (label === 'POOR' && reasons.length === 0) {
        reasons.push('Low optical signal strength');
    }

    return {
      score: finalScore,
      label,
      reasons,
    };
  }
}
