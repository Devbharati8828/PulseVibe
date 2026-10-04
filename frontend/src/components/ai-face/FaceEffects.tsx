/**
 * FaceEffects.tsx
 *
 * Post-processing for the AI Face canvas.
 * Direct port of CoreEffects.tsx — Bloom + Vignette driven by engine state.
 * Bloom intensity is higher during processing/stabilized to give the face
 * a luminous, ethereal quality.
 */

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useEngineStore } from '../../stores/useEngineStore';

export function FaceEffects() {
  const trackingState = useEngineStore((s) => s.viewModel?.trackingState || 'idle');
  const motionWarning = useEngineStore((s) => s.viewModel?.motionWarning ?? false);

  const isActive =
    trackingState === 'stabilized' ||
    trackingState === 'processing' ||
    trackingState === 'LOCKED';

  const isAlert = motionWarning || trackingState === 'lost';
  const isScanning =
    trackingState === 'scanning' ||
    trackingState === 'detected' ||
    trackingState === 'locking' ||
    trackingState === 'DETECTED';

  const intensity = isActive ? 1.6 : isScanning ? 1.1 : 0.7;
  const radius = isScanning ? 0.9 : isAlert ? 0.7 : 0.4;

  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.15}
        mipmapBlur
        intensity={intensity}
        radius={radius}
      />
      <Vignette eskil={false} offset={0.08} darkness={0.45} />
    </EffectComposer>
  );
}
