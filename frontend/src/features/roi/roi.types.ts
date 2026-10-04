export interface ROIRegion {
  x: number;       // normalized 0–1 (top-left)
  y: number;
  width: number;
  height: number;
  valid: boolean;  // false if out of bounds or too small
}

export interface ROIResult {
  forehead: ROIRegion;
  leftCheek: ROIRegion;
  rightCheek: ROIRegion;
}
