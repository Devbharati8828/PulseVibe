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

  // Idle = 0.0 so no bloom rays shoot out on startup before face is tracked
  const intensity = isActive ? 1.4 : isScanning ? 0.8 : isAlert ? 0.9 : 0.0;
  const radius = isScanning ? 0.6 : isAlert ? 0.5 : 0.3;

  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.3}
        mipmapBlur
        intensity={intensity}
        radius={radius}
      />
      <Vignette eskil={false} offset={0.08} darkness={0.45} />
    </EffectComposer>
  );
}
