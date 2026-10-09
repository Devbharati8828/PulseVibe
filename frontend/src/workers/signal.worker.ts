import { RPPGEngine } from '../features/rppg/RPPGEngine.js';
import { SignalProcessor } from '../features/signal/SignalProcessor.js';
import { FFT } from '../features/signal/FFT.js';
import { SignalQualityEngine } from '../features/signal/SignalQualityEngine.js';
import { BPMEngine } from '../features/measurement/BPMEngine.js';
import { TrustScoreEngine } from '../features/measurement/TrustScoreEngine.js';
import type { SignalWorkerMessage, SignalWorkerResult } from '../features/measurement/measurement.types.js';

const rppgEngine = new RPPGEngine();
const signalProcessor = new SignalProcessor();
const fft = new FFT(30); // assuming ~30 fps
const qualityEngine = new SignalQualityEngine(30);
const bpmEngine = new BPMEngine();
const trustScoreEngine = new TrustScoreEngine();

let stableFrames = 0;
const REQUIRED_STABLE = 30; // 1 second at 30 fps
const TARGET_SAMPLES = 512;

self.onmessage = (e: MessageEvent<SignalWorkerMessage>) => {
  const msg = e.data;

  if (msg.type === 'RESET') {
    rppgEngine.reset();
    bpmEngine.reset();
    stableFrames = 0;
    return;
  }

  if (msg.type === 'SET_ALGORITHM' && msg.algorithm) {
    rppgEngine.setAlgorithm(msg.algorithm);
    // Reset BPM + stable counter so stale readings from the old algorithm don't linger
    bpmEngine.reset();
    stableFrames = 0;
    return;
  }

  if (msg.type === 'PROCESS_SAMPLE' && msg.sample) {
    // 1. Add new pixel sample
    rppgEngine.addSample(msg.sample);

    if (msg.isLocked) stableFrames++;
    else stableFrames = Math.max(0, stableFrames - 1);

    // Only process if we have enough samples
    if (rppgEngine.getSampleCount() < 60) { // need at least ~2s of data for decent FFT
      return; 
    }

    // 2. Extract raw rPPG signal
    const rawSignal = rppgEngine.process();

    // 3. Clean/Filter signal
    const cleanSignal = signalProcessor.process(rawSignal);

    // 4. Perform FFT
    const fftResult = fft.compute(cleanSignal);

    // 5. Evaluate Quality
    const quality = qualityEngine.evaluate(
      fftResult,
      msg.motionScore ?? 0,
      msg.isLocked ?? false
    );

    // We compute BPM continuously so the user sees a reading, 
    // relying on the Trust Score UI to communicate low confidence.
    const validSignal = fftResult.dominantFrequency > 0;
    const bpmResult = bpmEngine.compute(fftResult.dominantFrequency, validSignal);

    // 7. Compute Trust Score
    const trustScore = trustScoreEngine.evaluate(
      quality,
      stableFrames,
      REQUIRED_STABLE,
      bpmResult.valid,
      rppgEngine.getSampleCount(),
      TARGET_SAMPLES
    );

    // 8. Send result back to main thread
    // We clone the arrays to avoid detaching them if we want to reuse them, 
    // or we can transfer them. Given small size (512 floats), copying is fine and avoids recreating.
    const result: SignalWorkerResult = {
      signal: new Float32Array(cleanSignal),
      fft: {
        frequencies: new Float32Array(fftResult.frequencies),
        magnitudes: new Float32Array(fftResult.magnitudes),
        dominantFrequency: fftResult.dominantFrequency,
      },
      bpm: bpmResult,
      quality,
      trustScore,
    };

    self.postMessage(result);
  }
};
