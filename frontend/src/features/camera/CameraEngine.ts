import type {
  CameraConstraints,
  CameraDevice,
  CameraError,
  CameraErrorCode,
  CameraEngine as ICameraEngine,
} from './camera.types.js';

/**
 * CameraEngine — manages camera access, streams, and device selection.
 * All measurement frames are read from the videoElement this engine provides.
 */
export class CameraEngine implements ICameraEngine {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;

  /** Resolution ladder — tries highest quality first, falls back gracefully */
  private readonly RESOLUTION_LADDER: Array<{ width: number; height: number }> = [
    { width: 1280, height: 720 },
    { width: 640,  height: 480 },
    { width: 320,  height: 240 },
  ];

  async start(constraints?: CameraConstraints): Promise<MediaStream> {
    this.stop(); // clean up any existing stream

    const stream = await this.tryGetStream(constraints);
    this.stream = stream;

    // Create or reuse hidden video element
    if (!this.videoElement) {
      this.videoElement = document.createElement('video');
      this.videoElement.setAttribute('playsinline', '');
      this.videoElement.muted = true;
      this.videoElement.autoplay = true;
    }

    this.videoElement.srcObject = stream;
    await this.videoElement.play();

    return stream;
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  isReady(): boolean {
    return (
      this.stream !== null &&
      this.videoElement !== null &&
      this.videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    );
  }

  async listDevices(): Promise<CameraDevice[]> {
    // Request permission first so labels are populated
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(t => t.stop());
    } catch {
      // ignore — labels may be empty if permission not granted
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'videoinput')
      .map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
        kind: 'videoinput' as const,
      }));
  }

  async switchDevice(deviceId: string): Promise<void> {
    await this.start({ deviceId });
  }

  // ─── Private helpers ──────────────────────────────────────────────

  private async tryGetStream(
    opts?: CameraConstraints
  ): Promise<MediaStream> {
    if (opts?.deviceId) {
      // Specific device — use directly without ladder
      return navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: opts.deviceId },
          width: { ideal: opts.width ?? 1280 },
          height: { ideal: opts.height ?? 720 },
        },
        audio: false,
      });
    }

    let lastError: unknown;

    // Try resolution ladder
    for (const res of this.RESOLUTION_LADDER) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: opts?.facingMode ?? 'user',
            width: { ideal: res.width },
            height: { ideal: res.height },
          },
          audio: false,
        });
      } catch (err) {
        lastError = err;
        if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'NotFoundError')) {
          throw this.mapError(err, 'UNKNOWN');
        }
        // otherwise try next resolution
      }
    }

    throw this.mapError(lastError || new Error('All resolutions failed'), 'OVERCONSTRAINED');
  }

  private mapError(err: unknown, defaultCode: CameraErrorCode): CameraError {
    if (err instanceof DOMException) {
      const code: CameraErrorCode =
        err.name === 'NotAllowedError' ? 'PERMISSION_DENIED' :
        err.name === 'NotFoundError' ? 'DEVICE_NOT_FOUND' :
        err.name === 'OverconstrainedError' ? 'OVERCONSTRAINED' :
        err.name === 'NotReadableError' ? 'NOT_READABLE' :
        'UNKNOWN';
      return { code, message: err.message, originalError: err };
    }
    return {
      code: defaultCode,
      message: err instanceof Error ? err.message : 'Unknown camera error',
      originalError: err,
    };
  }
}
