import type { FaceTrackingState } from '../features/face/face.types.js';
import type { SignalQualityLabel } from '../features/signal/signal.types.js';

export interface PulseViewModel {
  bpm: number | null;
  bpmFormatted: string; // "72" or "—"
  trustScore: number;
  trustScoreFormatted: string; // "94%"
  signalQuality: Lowercase<SignalQualityLabel>;
  signalQualityLabel: string; // "EXCELLENT"
  signalQualityColor: string; // CSS class

  waveform: number[];
  filteredWaveform: number[];
  spectrum: { frequency: number; magnitude: number }[];
  dominantFrequency: number;

  landmarks: { x: number; y: number; z: number }[] | null;
  faceBounds: { x: number; y: number; width: number; height: number } | null;
  faceDetected: boolean;
  faceConfidence: number;
  roiRegions: { name: string; points: { x: number; y: number }[] }[];
  blendshapes?: { categoryName: string; score: number }[];

  trackingState: FaceTrackingState;
  trackingStateLabel: string; // "FACE LOCK ACQUIRED"
  motionWarning: boolean;
  motionLevel: number;
  isSimulation: boolean;
  activeAlgorithm: string;

  fps: number;
  timestamp: number;
}
