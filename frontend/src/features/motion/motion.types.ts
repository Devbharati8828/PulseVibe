import type { NormalizedPoint } from '../face/face.types.js';

export interface MotionState {
  motionScore: number;      // 0.0 (still) to 1.0 (excessive)
  stable: boolean;          // motionScore < STABLE_THRESHOLD
  excessiveMotion: boolean; // motionScore > EXCESSIVE_THRESHOLD
}

export interface MotionEngine {
  update(landmarks: NormalizedPoint[]): MotionState;
  reset(): void;
}
