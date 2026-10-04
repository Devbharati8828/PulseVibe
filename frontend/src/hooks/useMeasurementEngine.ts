import { useState, useEffect, useRef, useCallback } from 'react';
import { PulseVibeEngine } from '../features/measurement/MeasurementEngine.js';
import { mapEngineOutputToViewModel } from '../adapters/engineAdapter.js';
import type { PulseViewModel } from '../adapters/types.js';

export function useMeasurementEngine(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const engineRef = useRef<PulseVibeEngine | null>(null);
  const [viewModel, setViewModel] = useState<PulseViewModel | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    engineRef.current = new PulseVibeEngine();
    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []);

  const startEngine = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !engineRef.current) return;
    setIsRunning(true);

    // Throttle React state updates to 10fps (100ms) to prevent UI freeze.
    // The engine still runs at 30–60fps internally; we just sample its output.
    const UPDATE_INTERVAL_MS = 100;

    engineRef.current.onResult((res) => {
      const now = performance.now();
      if (now - lastUpdateRef.current >= UPDATE_INTERVAL_MS) {
        lastUpdateRef.current = now;
        setViewModel(mapEngineOutputToViewModel(res));
      }
    });

    await engineRef.current.start(video);
  }, [videoRef]);

  const stopEngine = useCallback(() => {
    setIsRunning(false);
    engineRef.current?.stop();
    setViewModel(null);
  }, []);

  const resetEngine = useCallback(() => {
    engineRef.current?.reset();
    setViewModel(null);
  }, []);

  const setAlgorithm = useCallback((algo: 'CHROM' | 'GREEN' | 'POS') => {
    engineRef.current?.setAlgorithm(algo);
  }, []);

  return {
    viewModel,
    isRunning,
    startEngine,
    stopEngine,
    resetEngine,
    setAlgorithm,
  };
}
