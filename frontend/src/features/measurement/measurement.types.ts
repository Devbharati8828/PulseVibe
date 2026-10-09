import type { RGBSample } from '../sampling/SamplingEngine.js';
import type { RPPGAlgorithm } from '../rppg/rppg.types.js';
import type { SignalQuality, FFTResult } from '../signal/signal.types.js';
import type { ROIResult } from '../roi/roi.types.js';
import type { MotionState } from '../motion/motion.types.js';
import type { FaceTrackingState, NormalizedPoint } from '../face/face.types.js';
import type { BPMResult } from './BPMEngine.js';
import type { TrustScoreResult } from './TrustScoreEngine.js';

export interface SignalWorkerMessage {
  type: 'PROCESS_SAMPLE' | 'SET_ALGORITHM' | 'RESET';
  sample?: RGBSample;
  motionScore?: number;
  isLocked?: boolean;
  algorithm?: RPPGAlgorithm;
}

export interface SignalWorkerResult {
  signal: Float32Array;
  fft: FFTResult;
  bpm: BPMResult;
  quality: SignalQuality;
  trustScore: TrustScoreResult;
}

export interface EngineResult {
  timestamp: number;
  bpm: number | null;
  trustScore: number;
  signalQuality: SignalQuality;
  rppgSignal: Float32Array;
  fftSpectrum: FFTResult;
  landmarks: NormalizedPoint[];
  blendshapes?: import('../face/face.types.js').Blendshape[];
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  trackingState: FaceTrackingState;
  faceConfidence: number; // Real MediaPipe detection confidence (0–1)
  roi: ROIResult;
  motion: MotionState;
  algorithm: RPPGAlgorithm;
  measurementValid: boolean;
}
