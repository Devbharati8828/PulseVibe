import { useEffect, useRef, useCallback } from 'react';
import { useEngineStore } from '../stores/useEngineStore.js';
import { useUIStore } from '../stores/useUIStore.js';
import { useCamera } from '../features/camera/useCamera.js';
import { useMeasurementEngine } from './useMeasurementEngine.js';

export function useEngine(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const updateViewModel = useEngineStore(state => state.updateViewModel);
  const setRunning = useEngineStore(state => state.setEngineRunning);
  const activeAlgorithm = useEngineStore(state => state.activeAlgorithm);
  const addStatus = useUIStore(state => state.addStatus);
  const setVisionCoreState = useUIStore(state => state.setVisionCoreState);

  const { start: startCamera, stop: stopCamera, stream } = useCamera();
  const { startEngine, stopEngine, resetEngine, setAlgorithm, viewModel, isRunning } = useMeasurementEngine(videoRef);

  // Sync state to zustand store
  useEffect(() => {
    if (viewModel) {
      updateViewModel(viewModel);
      
      // Update UI state based on tracking
      if (viewModel.trackingState === 'NO_FACE') {
        setVisionCoreState('warning');
      } else if (viewModel.trackingState === 'LOCKED' || viewModel.trackingState === 'STABILIZING') {
        setVisionCoreState('active');
      } else {
        setVisionCoreState('idle');
      }
    }
  }, [viewModel, updateViewModel, setVisionCoreState]);

  // Sync algorithm changes
  useEffect(() => {
    setAlgorithm(activeAlgorithm);
  }, [activeAlgorithm, setAlgorithm]);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('Camera stream acquired. Tracks:', stream.getVideoTracks().map(t => `${t.label} (readyState: ${t.readyState})`));
      console.log('Attaching srcObject to UI video element...');
      videoRef.current.srcObject = stream;
      
      const onPlaying = () => {
        console.log(`Video element is playing (readyState: ${videoRef.current?.readyState}). Detection loop can run.`);
      };
      videoRef.current.addEventListener('playing', onPlaying, { once: true });
      
      videoRef.current.play().then(() => {
        console.log('play() resolved successfully.');
      }).catch(err => {
        console.error('Failed to play video element (autoplay blocked?):', err);
      });
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('playing', onPlaying);
        }
      }
    }
  }, [stream, videoRef]);

  const start = useCallback(async () => {
    try {
      // Mark as running immediately so Signal Lab and other views unlock
      setRunning(true);
      addStatus('Initializing camera...', 'info');
      await startCamera();
      
      addStatus('Starting measurement engine...', 'info');
      await startEngine();
      
      addStatus('Engine engaged', 'success');
    } catch (err: any) {
      console.error(err);
      setRunning(false); // revert on failure
      addStatus(err?.message || 'Failed to start engine', 'error');
    }
  }, [addStatus, startCamera, startEngine, setRunning]);

  const stop = useCallback((reason?: string) => {
    console.log(`[Diagnostic] stop() called in useEngine. Trace:`, new Error().stack);
    stopEngine();
    stopCamera();
    resetEngine();
    setRunning(false);
    setVisionCoreState('idle');
    addStatus('Engine halted', 'warning');
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
  }, [stopEngine, stopCamera, resetEngine, setRunning, setVisionCoreState, addStatus, videoRef]);

  return { start, stop, isRunning };
}
