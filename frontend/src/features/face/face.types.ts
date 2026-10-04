// ─── Face Feature Types ────────────────────────────────────────────

export interface NormalizedPoint {
  x: number;  // 0.0 – 1.0 of video width
  y: number;  // 0.0 – 1.0 of video height
  z?: number; // depth (optional, from MediaPipe)
}

export interface FaceDetectionResult {
  detected: boolean;
  confidence: number;
  boundingBox: {
    x: number;     // normalized 0–1
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface FaceLandmarkResult {
  landmarks: NormalizedPoint[];
  detected: boolean;
}

/**
 * Tracking state machine:
 * NO_FACE → DETECTED → TRACKING → STABILIZING → LOCKED
 */
export type FaceTrackingState =
  | 'NO_FACE'
  | 'DETECTED'
  | 'TRACKING'
  | 'STABILIZING'
  | 'LOCKED'
  | 'idle'
  | 'scanning'
  | 'detected'
  | 'locking'
  | 'locked'
  | 'acquiring'
  | 'processing'
  | 'stabilized'
  | 'lost';

export interface FaceTrackingResult {
  state: FaceTrackingState;
  stableFrameCount: number;
  lostFrameCount: number;
  landmarks: NormalizedPoint[] | null;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  confidence: number;
}
