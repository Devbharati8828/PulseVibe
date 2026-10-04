export const CONSTANTS = {
  // Engine & Processing
  SAMPLE_RATE: 30, // fps
  BUFFER_SIZE: 256, // frames (approx 8.5 seconds at 30fps)
  BPM_MIN: 42, // 0.7 Hz
  BPM_MAX: 240, // 4.0 Hz
  
  // Quality & Trust
  TRUST_THRESHOLD: 0.3, // minimum trust score to display BPM (low to allow warmup period)
  FACE_LOCK_CONFIDENCE: 0.6, // minimum MediaPipe confidence to lock face
  
  // UI & Visualization
  WAVEFORM_DISPLAY_SECONDS: 8,
  MAX_STATUS_LOG_ENTRIES: 100,
  
  // Database
  DB_NAME: 'pulsevibe-sessions',
  DB_VERSION: 1,
} as const;
