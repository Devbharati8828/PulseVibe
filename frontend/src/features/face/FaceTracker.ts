import type { FaceTrackingState, FaceTrackingResult, NormalizedPoint } from './face.types.js';

interface TrackingConfig {
  /** Frames required before transitioning from TRACKING → STABILIZING */
  trackingFramesRequired: number;
  /** Frames required before transitioning from STABILIZING → LOCKED */
  stabilizingFramesRequired: number;
  /** Consecutive lost frames before reverting to NO_FACE */
  lostFramesThreshold: number;
  /** Maximum centroid displacement (normalized) to remain in STABILIZING */
  stabilityThreshold: number;
}

const DEFAULT_CONFIG: TrackingConfig = {
  trackingFramesRequired: 10,
  stabilizingFramesRequired: 20,
  lostFramesThreshold: 15,
  stabilityThreshold: 0.06, // relaxed from 0.02 to allow natural movement
};

/**
 * FaceTracker — implements the face tracking state machine.
 *
 * NO_FACE → DETECTED → TRACKING → STABILIZING → LOCKED
 *
 * Never transitions to LOCKED from a single good frame.
 * Requires stable sequences to advance.
 */
export class FaceTracker {
  private state: FaceTrackingState = 'NO_FACE';
  private stableFrames = 0;
  private lostFrames = 0;
  private config: TrackingConfig;

  // Used for stability calculation
  private centroidHistory: { x: number; y: number }[] = [];
  private readonly CENTROID_WINDOW = 10;

  constructor(config?: Partial<TrackingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  update(
    detected: boolean,
    landmarks: NormalizedPoint[] | null,
    boundingBox: { x: number; y: number; width: number; height: number } | null,
    confidence: number,
    blendshapes?: import('./face.types.js').Blendshape[]
  ): FaceTrackingResult {
    if (!detected || landmarks === null || landmarks.length === 0) {
      return this.handleLost(landmarks, boundingBox, confidence, blendshapes);
    }

    this.lostFrames = 0;

    const centroid = this.computeCentroid(landmarks);
    this.centroidHistory.push(centroid);
    if (this.centroidHistory.length > this.CENTROID_WINDOW) {
      this.centroidHistory.shift();
    }

    switch (this.state) {
      case 'NO_FACE':
        this.state = 'DETECTED';
        this.stableFrames = 1;
        break;

      case 'DETECTED':
        this.stableFrames++;
        if (this.stableFrames >= this.config.trackingFramesRequired) {
          this.state = 'TRACKING';
          this.stableFrames = 0;
        }
        break;

      case 'TRACKING':
        this.stableFrames++;
        if (this.stableFrames >= this.config.trackingFramesRequired) {
          this.state = 'STABILIZING';
          this.stableFrames = 0;
        }
        break;

      case 'STABILIZING': {
        const stable = this.isPositionStable();
        if (stable) {
          this.stableFrames++;
          if (this.stableFrames >= this.config.stabilizingFramesRequired) {
            this.state = 'LOCKED';
            this.stableFrames = this.config.stabilizingFramesRequired;
          }
        } else {
          // Motion detected — reset stabilizing counter but don't go back
          this.stableFrames = Math.max(0, this.stableFrames - 2);
        }
        break;
      }

      case 'LOCKED':
        // Maintain lock if position stays stable
        if (!this.isPositionStable()) {
          this.state = 'STABILIZING';
          this.stableFrames = Math.floor(this.config.stabilizingFramesRequired / 2);
        }
        break;
    }

    return {
      state: this.state,
      stableFrameCount: this.stableFrames,
      lostFrameCount: this.lostFrames,
      landmarks,
      blendshapes,
      boundingBox,
      confidence,
    };
  }

  reset(): void {
    this.state = 'NO_FACE';
    this.stableFrames = 0;
    this.lostFrames = 0;
    this.centroidHistory = [];
  }

  getState(): FaceTrackingState {
    return this.state;
  }

  private handleLost(
    landmarks: NormalizedPoint[] | null,
    boundingBox: { x: number; y: number; width: number; height: number } | null,
    confidence: number,
    blendshapes?: import('./face.types.js').Blendshape[]
  ): FaceTrackingResult {
    this.lostFrames++;
    this.stableFrames = 0;

    if (this.lostFrames >= this.config.lostFramesThreshold) {
      this.state = 'NO_FACE';
      this.centroidHistory = [];
    } else if (this.state === 'LOCKED' || this.state === 'STABILIZING') {
      // Brief loss — stay in TRACKING to allow quick recovery
      this.state = 'TRACKING';
      this.stableFrames = this.config.trackingFramesRequired / 2;
    } else if (this.state === 'TRACKING') {
      this.state = 'DETECTED';
    } else if (this.state === 'DETECTED') {
      this.state = 'NO_FACE';
    }

    return {
      state: this.state,
      stableFrameCount: this.stableFrames,
      lostFrameCount: this.lostFrames,
      landmarks,
      blendshapes,
      boundingBox,
      confidence,
    };
  }

  private computeCentroid(landmarks: NormalizedPoint[]): { x: number; y: number } {
    const sum = landmarks.reduce(
      (acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }),
      { x: 0, y: 0 }
    );
    return { x: sum.x / landmarks.length, y: sum.y / landmarks.length };
  }

  private isPositionStable(): boolean {
    if (this.centroidHistory.length < 2) return true;

    const recent = this.centroidHistory.slice(-5);
    const maxDisplacement = recent.reduce((maxD, pt, i) => {
      if (i === 0) return maxD;
      const prev = recent[i - 1];
      const d = Math.hypot(pt.x - prev.x, pt.y - prev.y);
      return Math.max(maxD, d);
    }, 0);

    return maxDisplacement <= this.config.stabilityThreshold;
  }
}
