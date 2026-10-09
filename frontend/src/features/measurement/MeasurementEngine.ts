import { FaceDetector } from '../face/FaceDetector.js';
import { FaceLandmarker } from '../face/FaceLandmarker.js';
import { FaceTracker } from '../face/FaceTracker.js';
import { MotionEngine } from '../motion/MotionEngine.js';
import { ROIEngine } from '../roi/ROIEngine.js';
import { SamplingEngine } from '../sampling/SamplingEngine.js';
import type { RPPGAlgorithm } from '../rppg/rppg.types.js';
import type { EngineResult, SignalWorkerMessage, SignalWorkerResult } from './measurement.types.js';

// We import the worker file using Vite's worker syntax
import SignalWorker from '../../workers/signal.worker.ts?worker';

export class PulseVibeEngine {
  private faceDetector: FaceDetector;
  private faceLandmarker: FaceLandmarker;
  private faceTracker: FaceTracker;
  private motionEngine: MotionEngine;
  private roiEngine: ROIEngine;
  private samplingEngine: SamplingEngine;
  
  private worker: Worker | null = null;
  private rAFId = 0;
  private isRunning = false;
  private videoElement: HTMLVideoElement | null = null;

  private latestResult: EngineResult | null = null;
  private onResultCallback: ((result: EngineResult) => void) | null = null;

  private algorithm: RPPGAlgorithm = 'CHROM';

  // Last known state from worker
  private workerResult: SignalWorkerResult | null = null;

  constructor() {
    this.faceDetector = new FaceDetector();
    this.faceLandmarker = new FaceLandmarker();
    this.faceTracker = new FaceTracker();
    this.motionEngine = new MotionEngine();
    this.roiEngine = new ROIEngine();
    this.samplingEngine = new SamplingEngine();
  }

  async start(video: HTMLVideoElement): Promise<void> {
    if (this.isRunning) return;
    this.videoElement = video;

    try {
      await this.faceDetector.initialize();
      await this.faceLandmarker.initialize();
    } catch (err) {
      console.error('[Diagnostic] MediaPipe init failed:', err);
      throw new Error('MediaPipe initialization failed: ' + (err instanceof Error ? err.message : String(err)));
    }

    this.worker = new SignalWorker();
    this.worker.onmessage = (e: MessageEvent<SignalWorkerResult>) => {
      this.workerResult = e.data;
    };

    this.isRunning = true;
    this.loop();
  }

  stop(reason: string = 'unknown'): void {
    console.log(`[Diagnostic] Engine halted. Reason: ${reason}`);
    this.isRunning = false;
    cancelAnimationFrame(this.rAFId);
    
    this.faceDetector.close();
    this.faceLandmarker.close();
    this.faceTracker.reset();
    this.motionEngine.reset();
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  setAlgorithm(algo: RPPGAlgorithm): void {
    this.algorithm = algo;
    if (this.worker) {
      this.worker.postMessage({ type: 'SET_ALGORITHM', algorithm: algo });
    }
  }

  reset(): void {
    this.faceTracker.reset();
    this.motionEngine.reset();
    this.latestResult = null;
    this.workerResult = null;
    if (this.worker) {
      this.worker.postMessage({ type: 'RESET' });
    }
  }

  getLatestResult(): EngineResult | null {
    return this.latestResult;
  }

  onResult(cb: (result: EngineResult) => void): void {
    this.onResultCallback = cb;
  }

  private loop = () => {
    if (!this.isRunning || !this.videoElement || this.videoElement.readyState < 2) {
      this.rAFId = requestAnimationFrame(this.loop);
      return;
    }

    const timestamp = performance.now();

    // 1. Detect Face & Landmarks
    // Use the same timestamp — each detector has its own lastTimestamp guard internally.
    // We subtract 1ms from landmarker so both always advance independently.
    const landmarking = this.faceLandmarker.detectForVideo(this.videoElement, timestamp);
    const detection = this.faceDetector.detectForVideo(this.videoElement, timestamp - 0.5);
    
    // Diagnostic logging for Face Detection (Throttle to once per second)
    if (timestamp % 1000 < 20) {
      console.log(`[Diagnostic] FaceLandmarker returned ${landmarking.landmarks?.length || 0} landmarks. Detector confidence: ${detection.confidence}`);
    }

    // 2. Update Face Tracker
    const tracking = this.faceTracker.update(
      landmarking.detected,
      landmarking.landmarks.length > 0 ? landmarking.landmarks : null,
      detection.boundingBox,
      detection.confidence,
      landmarking.blendshapes
    );

    let motion = { motionScore: 0, stable: true, excessiveMotion: false };
    let roi = {
      forehead: { x:0, y:0, width:0, height:0, valid:false },
      leftCheek: { x:0, y:0, width:0, height:0, valid:false },
      rightCheek: { x:0, y:0, width:0, height:0, valid:false },
    };

    // 3. ROI & Sampling (Start from TRACKING state to reduce warmup time)
    if (tracking.state === 'TRACKING' || tracking.state === 'STABILIZING' || tracking.state === 'LOCKED') {
      if (tracking.landmarks) {
        motion = this.motionEngine.update(tracking.landmarks);
        roi = this.roiEngine.computeROI(tracking.landmarks);
        
        // Sample pixels for all active tracking states
        const sample = this.samplingEngine.sample(this.videoElement, roi, timestamp);
          
        if (timestamp % 1000 < 20) {
          console.log(`[Diagnostic] ROI Sampled: forehead valid=${roi.forehead.valid}, leftCheek valid=${roi.leftCheek.valid}. Sample pushed: ${!!sample}`);
        }
          
        if (sample && this.worker) {
          const isLocked = tracking.state === 'LOCKED';
          const msg: SignalWorkerMessage = {
            type: 'PROCESS_SAMPLE',
            sample,
            motionScore: motion.motionScore,
            isLocked,
            algorithm: this.algorithm
          };
          this.worker.postMessage(msg);
        }
      }
    } else {
      this.motionEngine.reset();
    }

    // 4. Assemble EngineResult
    const wRes = this.workerResult;
    this.latestResult = {
      timestamp,
      bpm: wRes?.bpm.bpm ?? null,
      trustScore: wRes?.trustScore.score ?? 0,
      signalQuality: wRes?.quality ?? { score: 0, label: 'POOR', reasons: [] },
      rppgSignal: wRes?.signal ?? new Float32Array(),
      fftSpectrum: wRes?.fft ?? { frequencies: new Float32Array(), magnitudes: new Float32Array(), dominantFrequency: 0 },
      landmarks: tracking.landmarks ?? [],
      blendshapes: tracking.blendshapes,
      boundingBox: tracking.boundingBox,
      trackingState: tracking.state,
      faceConfidence: detection.confidence,
      roi,
      motion,
      algorithm: this.algorithm,
      measurementValid: wRes?.bpm.valid ?? false
    };

    if (this.onResultCallback) {
      this.onResultCallback(this.latestResult);
    }

    this.rAFId = requestAnimationFrame(this.loop);
  };
}
