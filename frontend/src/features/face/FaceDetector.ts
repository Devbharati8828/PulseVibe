import {
  FaceDetector as MPFaceDetector,
  FilesetResolver,
  type Detection,
} from '@mediapipe/tasks-vision';
import type { FaceDetectionResult } from './face.types.js';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

/**
 * FaceDetector — wraps MediaPipe Tasks Vision FaceDetector.
 * Provides per-frame face detection with normalized bounding boxes.
 */
export class FaceDetector {
  private detector: MPFaceDetector | null = null;
  private lastTimestamp = -1;

  async initialize(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    this.detector = await MPFaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'CPU', // CPU avoids WebGL context conflict with Three.js Canvas
      },
      runningMode: 'VIDEO',
      minDetectionConfidence: 0.5,
      minSuppressionThreshold: 0.3,
    });
  }

  detectForVideo(videoElement: HTMLVideoElement, timestampMs: number): FaceDetectionResult {
    if (!this.detector) {
      return { detected: false, confidence: 0, boundingBox: null };
    }

    // Avoid duplicate timestamp (MediaPipe requirement)
    if (timestampMs === this.lastTimestamp) {
      return { detected: false, confidence: 0, boundingBox: null };
    }
    this.lastTimestamp = timestampMs;

    const result = this.detector.detectForVideo(videoElement, timestampMs);

    if (!result.detections || result.detections.length === 0) {
      return { detected: false, confidence: 0, boundingBox: null };
    }

    // Take the detection with highest confidence
    const best = result.detections.reduce((a: Detection, b: Detection) => {
      const aScore = a.categories?.[0]?.score ?? 0;
      const bScore = b.categories?.[0]?.score ?? 0;
      return aScore >= bScore ? a : b;
    });

    const bbox = best.boundingBox;
    const confidence = best.categories?.[0]?.score ?? 0;

    if (!bbox) {
      return { detected: true, confidence, boundingBox: null };
    }

    const vw = videoElement.videoWidth || 1;
    const vh = videoElement.videoHeight || 1;

    return {
      detected: true,
      confidence,
      boundingBox: {
        x: bbox.originX / vw,
        y: bbox.originY / vh,
        width: bbox.width / vw,
        height: bbox.height / vh,
      },
    };
  }

  close(): void {
    this.detector?.close();
    this.detector = null;
  }
}
