/**
 * AIFace.tsx
 *
 * Top-level R3F Canvas wrapper for the AI Face avatar.
 * Mirrors VisionCore.tsx in structure — drop-in replacement for the same
 * slot in MeasurementPage (right column, "AI PERSONA" cell).
 *
 * Lighting:
 *   - Ambient (soft fill)
 *   - Key light: warm white from upper-right (3, 3, 3)
 *   - Fill light: cool cyan from lower-left (-4, -3, -2)
 *   - Rim light: deep blue from behind (0, 0, -6)
 *
 * Performance notes:
 *   - dpr clamped to [1, 1.5]
 *   - antialias: false (Bloom provides perceived smoothness)
 *   - alpha: true (transparent background — same as VisionCore)
 */

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { FaceGeometry } from './FaceGeometry';
import { FaceParticles } from './FaceParticles';
import { FaceEffects } from './FaceEffects';

export function AIFace() {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  return (
    <div className="w-full h-full relative pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 40 }}
        dpr={[1, 1.2]}
        frameloop="demand"
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'low-power',
          failIfMajorPerformanceCaveat: false,
        }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          // Prevent context loss from crashing the page and corrupting
          // MediaPipe's WASM GPU state
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
          }, false);
        }}
      >
        {/* Lighting rig */}
        <ambientLight intensity={0.35} />
        {/* Key — warm white, upper right */}
        <pointLight position={[3, 3, 3]} intensity={1.2} color="#e8f4ff" />
        {/* Fill — cool cyan, lower left */}
        <pointLight position={[-4, -3, -2]} intensity={0.6} color="#22d3ee" />
        {/* Rim — deep blue, behind face */}
        <pointLight position={[0, 0, -6]} intensity={0.4} color="#0369a1" />

        <Suspense fallback={null}>
          <FaceGeometry />
          {!reducedMotion && <FaceParticles />}
          {!reducedMotion && <FaceEffects />}
        </Suspense>
      </Canvas>
    </div>
  );
}
