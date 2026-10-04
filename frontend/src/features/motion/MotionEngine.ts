import type { NormalizedPoint } from '../face/face.types.js';
import type { MotionState } from './motion.types.js';

const STABLE_THRESHOLD = 0.008;
const EXCESSIVE_THRESHOLD = 0.025;

/**
 * MotionEngine — detects facial movement that could corrupt rPPG.
 *
 * Computes per-frame displacement of the facial centroid and a
 * set of key landmarks. High motion invalidates measurements.
 */
export class MotionEngine {
  private prevLandmarks: NormalizedPoint[] | null = null;
  private motionHistory: number[] = [];
  private readonly HISTORY_SIZE = 10;

  /** Key landmark indices to track for motion (sparse set for speed) */
  private readonly KEY_INDICES = [1, 9, 152, 33, 263, 61, 291]; // nose, chin, jaw, eyes, mouth

  update(landmarks: NormalizedPoint[]): MotionState {
    if (!this.prevLandmarks || this.prevLandmarks.length !== landmarks.length) {
      this.prevLandmarks = landmarks;
      return { motionScore: 0, stable: true, excessiveMotion: false };
    }

    // Compute centroid displacement
    const centroidDisp = this.computeCentroidDisplacement(landmarks, this.prevLandmarks);

    // Compute key-point displacement
    const keyDisp = this.computeKeyPointDisplacement(landmarks, this.prevLandmarks);

    // Composite motion score (weighted)
    const rawScore = centroidDisp * 0.4 + keyDisp * 0.6;

    // Smooth over history
    this.motionHistory.push(rawScore);
    if (this.motionHistory.length > this.HISTORY_SIZE) {
      this.motionHistory.shift();
    }

    const motionScore = this.motionHistory.reduce((a, b) => a + b, 0) / this.motionHistory.length;

    this.prevLandmarks = landmarks;

    return {
      motionScore,
      stable: motionScore < STABLE_THRESHOLD,
      excessiveMotion: motionScore > EXCESSIVE_THRESHOLD,
    };
  }

  reset(): void {
    this.prevLandmarks = null;
    this.motionHistory = [];
  }

  private computeCentroidDisplacement(
    curr: NormalizedPoint[],
    prev: NormalizedPoint[]
  ): number {
    let sumX = 0, sumY = 0;
    const n = curr.length;
    for (let i = 0; i < n; i++) {
      sumX += curr[i].x;
      sumY += curr[i].y;
    }
    const currCentroid = { x: sumX / n, y: sumY / n };

    let pSumX = 0, pSumY = 0;
    for (let i = 0; i < n; i++) {
      pSumX += prev[i].x;
      pSumY += prev[i].y;
    }
    const prevCentroid = { x: pSumX / n, y: pSumY / n };

    return Math.hypot(currCentroid.x - prevCentroid.x, currCentroid.y - prevCentroid.y);
  }

  private computeKeyPointDisplacement(
    curr: NormalizedPoint[],
    prev: NormalizedPoint[]
  ): number {
    const indices = this.KEY_INDICES.filter(i => i < curr.length);
    if (indices.length === 0) return 0;

    const total = indices.reduce((sum, idx) => {
      return sum + Math.hypot(curr[idx].x - prev[idx].x, curr[idx].y - prev[idx].y);
    }, 0);

    return total / indices.length;
  }
}
