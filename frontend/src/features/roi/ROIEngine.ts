import type { NormalizedPoint } from '../face/face.types.js';
import type { ROIRegion, ROIResult } from './roi.types.js';

/**
 * MediaPipe Face Mesh landmark indices for the three ROI regions.
 *
 * Reference: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
 * (478-point model)
 */
export const LANDMARK_INDICES = {
  // Forehead region — top-center of face
  FOREHEAD: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  // Left cheek (from viewer's right)
  LEFT_CHEEK: [116, 123, 147, 213, 192, 214, 212, 202, 204, 194, 176, 149, 150, 169, 136, 150, 136, 172, 58, 132, 93],
  // Right cheek (from viewer's left)
  RIGHT_CHEEK: [345, 352, 376, 433, 416, 434, 432, 422, 424, 418, 400, 379, 378, 394, 365, 379, 365, 397, 288, 361, 323],
} as const;

const MIN_ROI_SIZE = 0.02; // minimum normalized size to be valid

/**
 * ROIEngine — derives ROI bounding boxes from MediaPipe landmarks.
 *
 * ROIs follow the face as it moves — never fixed screen coordinates.
 */
export class ROIEngine {
  computeROI(landmarks: NormalizedPoint[]): ROIResult {
    return {
      forehead: this.landmarksToROI(landmarks, LANDMARK_INDICES.FOREHEAD, 0.6, 0.7),
      leftCheek: this.landmarksToROI(landmarks, LANDMARK_INDICES.LEFT_CHEEK, 0.5, 0.7),
      rightCheek: this.landmarksToROI(landmarks, LANDMARK_INDICES.RIGHT_CHEEK, 0.5, 0.7),
    };
  }

  private landmarksToROI(
    landmarks: NormalizedPoint[],
    indices: readonly number[],
    widthScale: number,
    heightScale: number
  ): ROIRegion {
    const valid = indices.filter(i => i < landmarks.length);
    if (valid.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0, valid: false };
    }

    const pts = valid.map(i => landmarks[i]);
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Shrink the bounding box toward center to get a tighter, skin-heavy region
    const rawW = maxX - minX;
    const rawH = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const w = rawW * widthScale;
    const h = rawH * heightScale;

    const x = centerX - w / 2;
    const y = centerY - h / 2;

    // Clamp to [0, 1]
    const cx = Math.max(0, Math.min(1 - w, x));
    const cy = Math.max(0, Math.min(1 - h, y));

    const isValid = w >= MIN_ROI_SIZE && h >= MIN_ROI_SIZE && cx >= 0 && cy >= 0;

    return { x: cx, y: cy, width: w, height: h, valid: isValid };
  }
}
