import {
  FaceLandmarker as MPFaceLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import type { FaceLandmarkResult, NormalizedPoint } from './face.types.js';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/**
 * FaceLandmarker — wraps MediaPipe Tasks Vision FaceLandmarker.
 * Produces 478 normalized landmark points per frame.
 */
export class FaceLandmarker {
  private landmarker: MPFaceLandmarker | null = null;
  private lastTimestamp = -1;

  async initialize(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    this.landmarker = await MPFaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'CPU', // CPU avoids WebGL context conflict with Three.js Canvas
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
  }

  detectForVideo(videoElement: HTMLVideoElement, timestampMs: number): FaceLandmarkResult {
    if (!this.landmarker) {
      return { landmarks: [], detected: false };
    }

    if (timestampMs === this.lastTimestamp) {
      return { landmarks: [], detected: false };
    }
    this.lastTimestamp = timestampMs;

    const result = this.landmarker.detectForVideo(videoElement, timestampMs);

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      return { landmarks: [], detected: false };
    }

    const points: NormalizedPoint[] = result.faceLandmarks[0].map(lm => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
    }));

    return { landmarks: points, detected: true };
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
