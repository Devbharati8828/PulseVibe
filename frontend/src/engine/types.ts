export type TrackingState =
  | 'idle'
  | 'scanning'
  | 'detected'
  | 'locking'
  | 'locked'
  | 'acquiring'
  | 'processing'
  | 'stabilized'
  | 'lost';

export type SignalQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'none';

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ROIRegion {
  name: string; // 'forehead' | 'leftCheek' | 'rightCheek'
  points: { x: number; y: number }[];
  signalStrength: number; // 0-1
}

export interface EngineResult {
  // Face tracking
  landmarks: NormalizedLandmark[] | null;
  faceDetected: boolean;
  faceConfidence: number;
  faceBounds: BoundingBox | null;
  trackingState: TrackingState;
  roi: ROIRegion[];

  // Signal data
  rppgSignal: number[];
  filteredSignal: number[];
  fftSpectrum: number[];
  fftFrequencies: number[];
  dominantFrequency: number;

  // Results
  bpm: number;
  trustScore: number;
  signalQuality: SignalQuality;

  // Motion
  motionLevel: number;
  motionWarning: boolean;

  // Meta
  timestamp: number;
  fps: number;
  isSimulation: boolean;
  activeAlgorithm: 'green' | 'chrom' | 'pos';
}

export type EngineCallback = (result: EngineResult) => void;
