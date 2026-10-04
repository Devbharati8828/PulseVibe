import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { CoreSphere } from './CoreSphere';
import { CoreParticles } from './CoreParticles';
import { CoreEffects } from './CoreEffects';

export function VisionCore() {
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);

  return (
    <div className="w-full h-full relative pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 1.5]} // Clamp pixel ratio for performance
        gl={{ antialias: false, alpha: true }} // Disable AA since we use bloom
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#22d3ee" />

        <Suspense fallback={null}>
          <CoreSphere />
          {!reducedMotion && <CoreParticles />}
          {!reducedMotion && <CoreEffects />}
        </Suspense>
      </Canvas>
    </div>
  );
}
