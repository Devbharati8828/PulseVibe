// ─── Camera Engine Types ───────────────────────────────────────────

export interface CameraConstraints {
  deviceId?: string;
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput';
}

export type CameraErrorCode =
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_FOUND'
  | 'OVERCONSTRAINED'
  | 'NOT_READABLE'
  | 'UNKNOWN';

export interface CameraError {
  code: CameraErrorCode;
  message: string;
  originalError?: unknown;
}

export interface CameraEngine {
  start(constraints?: CameraConstraints): Promise<MediaStream>;
  stop(): void;
  getStream(): MediaStream | null;
  getVideoElement(): HTMLVideoElement | null;
  listDevices(): Promise<CameraDevice[]>;
  switchDevice(deviceId: string): Promise<void>;
  isReady(): boolean;
}
