import { useEngineStore } from '../stores/useEngineStore';

export function useFaceTracking() {
  const viewModel = useEngineStore(state => state.viewModel);
  
  return {
    landmarks: viewModel?.landmarks,
    faceBounds: viewModel?.faceBounds,
    confidence: viewModel?.faceConfidence,
    trackingState: viewModel?.trackingState,
    isDetected: viewModel?.faceDetected,
  };
}
