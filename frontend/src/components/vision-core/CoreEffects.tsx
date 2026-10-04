import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useEngineStore } from '../../stores/useEngineStore';

export function CoreEffects() {
  const trackingState = useEngineStore((state) => state.viewModel?.trackingState || 'idle');
  
  const intensity = trackingState === 'stabilized' || trackingState === 'processing' ? 1.5 : 0.8;
  const radius = trackingState === 'scanning' ? 0.8 : 0.4;

  return (
    <EffectComposer>
      <Bloom 
        luminanceThreshold={0.2} 
        mipmapBlur 
        intensity={intensity} 
        radius={radius}
      />
      <Vignette eskil={false} offset={0.1} darkness={0.4} />
    </EffectComposer>
  );
}
