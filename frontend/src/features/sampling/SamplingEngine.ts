import type { ROIResult } from '../roi/roi.types.js';

export interface RGBSample {
  timestamp: number;
  r: number;
  g: number;
  b: number;
}

/**
 * SamplingEngine — samples real pixel data from facial ROI regions.
 *
 * Uses Canvas 2D API to read pixel values from the current video frame.
 * Returns weighted-average RGB across all valid ROIs.
 *
 * No random data. No fake signals. All values come from real camera pixels.
 */
export class SamplingEngine {
  private canvas: OffscreenCanvas | HTMLCanvasElement;
  private ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;
  private readonly CANVAS_SIZE = 640; // internal canvas resolution

  constructor() {
    // Use OffscreenCanvas if available (Web Worker friendly)
    if (typeof OffscreenCanvas !== 'undefined') {
      this.canvas = new OffscreenCanvas(this.CANVAS_SIZE, this.CANVAS_SIZE);
      this.ctx = (this.canvas as OffscreenCanvas).getContext('2d') as OffscreenCanvasRenderingContext2D;
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.CANVAS_SIZE;
      this.canvas.height = this.CANVAS_SIZE;
      this.ctx = (this.canvas as HTMLCanvasElement).getContext('2d');
    }
  }

  /**
   * Sample pixels from the video frame using ROI coordinates.
   *
   * @param videoElement - Live video element
   * @param roi - Normalized ROI regions from ROIEngine
   * @param timestamp - Current timestamp in ms
   */
  sample(videoElement: HTMLVideoElement, roi: ROIResult, timestamp: number): RGBSample | null {
    if (!this.ctx || videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return null;
    }

    const vw = videoElement.videoWidth;
    const vh = videoElement.videoHeight;
    if (vw === 0 || vh === 0) return null;

    // Draw current video frame onto our canvas
    this.ctx.drawImage(videoElement, 0, 0, this.CANVAS_SIZE, this.CANVAS_SIZE);

    const scaleX = this.CANVAS_SIZE / vw;
    const scaleY = this.CANVAS_SIZE / vh;

    const regions = [
      { roi: roi.forehead, weight: 1.5 },    // Forehead weighted higher (strongest signal)
      { roi: roi.leftCheek, weight: 1.0 },
      { roi: roi.rightCheek, weight: 1.0 },
    ].filter(r => r.roi.valid);

    if (regions.length === 0) return null;

    let totalR = 0, totalG = 0, totalB = 0;
    let totalWeight = 0;

    for (const { roi: region, weight } of regions) {
      const px = Math.round(region.x * this.CANVAS_SIZE);
      const py = Math.round(region.y * this.CANVAS_SIZE);
      const pw = Math.max(1, Math.round(region.width * this.CANVAS_SIZE));
      const ph = Math.max(1, Math.round(region.height * this.CANVAS_SIZE));

      // Clamp to canvas bounds
      const cx = Math.max(0, Math.min(px, this.CANVAS_SIZE - 1));
      const cy = Math.max(0, Math.min(py, this.CANVAS_SIZE - 1));
      const cw = Math.max(1, Math.min(pw, this.CANVAS_SIZE - cx));
      const ch = Math.max(1, Math.min(ph, this.CANVAS_SIZE - cy));

      const imageData = this.ctx.getImageData(cx, cy, cw, ch);
      const { r, g, b } = this.computeMeanRGB(imageData.data);

      totalR += r * weight;
      totalG += g * weight;
      totalB += b * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) return null;

    return {
      timestamp,
      r: totalR / totalWeight,
      g: totalG / totalWeight,
      b: totalB / totalWeight,
    };
  }

  private computeMeanRGB(data: Uint8ClampedArray): { r: number; g: number; b: number } {
    let r = 0, g = 0, b = 0;
    const pixelCount = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      // skip alpha (data[i+3])
    }
    return {
      r: r / pixelCount,
      g: g / pixelCount,
      b: b / pixelCount,
    };
  }
}
