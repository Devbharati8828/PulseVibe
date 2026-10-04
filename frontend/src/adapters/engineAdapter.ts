import type { FaceTrackingState } from '../features/face/face.types.js';
import type { SignalQualityLabel } from '../features/signal/signal.types.js';
import type { PulseViewModel } from './types.js';
import type { EngineResult } from '../features/measurement/measurement.types.js';
import { formatBPM, formatTrustScore, formatSignalQuality } from '../lib/formatters.js';

type SQ = Lowercase<SignalQualityLabel>;

function getSignalQualityColor(quality: SQ): string {
  switch (quality) {
    case 'excellent':
      return 'text-emerald-400';
    case 'good':
      return 'text-blue-400';
    case 'fair':
      return 'text-yellow-400';
    case 'poor':
      return 'text-red-400';
    default:
      return 'text-slate-500';
  }
}

function getTrackingStateLabel(state: FaceTrackingState): string {
  switch (state) {
    case 'NO_FACE':
      return 'NO FACE DETECTED';
    case 'DETECTED':
      return 'FACE DETECTED';
    case 'TRACKING':
      return 'TRACKING FACE';
    case 'STABILIZING':
      return 'STABILIZING';
    case 'LOCKED':
      return 'FACE LOCKED';
    default:
      return 'UNKNOWN';
  }
}

export function mapEngineOutputToViewModel(result: EngineResult): PulseViewModel {
  const signalQualityLabelStr = result.signalQuality.label.toLowerCase() as SQ;

  return {
    bpm: result.bpm,
    bpmFormatted: formatBPM(result.bpm ?? 0, result.trustScore),
    trustScore: result.trustScore,
    trustScoreFormatted: formatTrustScore(result.trustScore),
    signalQuality: signalQualityLabelStr,
    signalQualityLabel: formatSignalQuality(signalQualityLabelStr as any),
    signalQualityColor: getSignalQualityColor(signalQualityLabelStr),

    waveform: Array.from(result.rppgSignal),
    filteredWaveform: Array.from(result.rppgSignal),
    spectrum: Array.from(result.fftSpectrum.magnitudes).map((mag, i) => ({
      frequency: result.fftSpectrum.frequencies[i],
      magnitude: mag,
    })),
    dominantFrequency: result.fftSpectrum.dominantFrequency,

    landmarks: result.landmarks ? result.landmarks.map(l => ({ x: l.x, y: l.y, z: l.z ?? 0 })) : null,
    faceBounds: result.boundingBox,
    faceDetected: result.trackingState !== 'NO_FACE',
    faceConfidence: result.faceConfidence,
    roiRegions: [
      result.roi.forehead,
      result.roi.leftCheek,
      result.roi.rightCheek,
    ].filter(r => r.valid).map((r, i) => ({
      name: i === 0 ? 'Forehead' : i === 1 ? 'Left Cheek' : 'Right Cheek',
      points: [
        { x: r.x, y: r.y },
        { x: r.x + r.width, y: r.y },
        { x: r.x + r.width, y: r.y + r.height },
        { x: r.x, y: r.y + r.height },
      ],
    })),
    
    trackingState: result.trackingState,
    trackingStateLabel: getTrackingStateLabel(result.trackingState),
    motionWarning: result.motion.excessiveMotion,
    motionLevel: result.motion.motionScore,
    isSimulation: false,
    activeAlgorithm: result.algorithm,

    fps: 30, // Default or pass from engine if calculated
    timestamp: result.timestamp,
  };
}
