/**
 * FaceParticles.tsx
 *
 * Ambient particle cloud orbiting the AI Face.
 * Adapted from CoreParticles.tsx — same 150-point spherical distribution,
 * same state-driven rotation speed, with the addition of a tighter clustering
 * during processing / stabilized states.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useEngineStore } from '../../stores/useEngineStore';

export function FaceParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const trackingState = useEngineStore((s) => s.viewModel?.trackingState || 'idle');
  const motionWarning = useEngineStore((s) => s.viewModel?.motionWarning ?? false);

  const positions = useMemo(() => {
    const count = 150;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.4 + Math.random() * 1.8; // 1.4 – 3.2
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const t = state.clock.getElapsedTime();

    // Rotation speed
    let speed = 0.04;
    if (trackingState === 'processing' || trackingState === 'scanning' || trackingState === 'DETECTED') {
      speed = 0.18;
    } else if (trackingState === 'stabilized' || trackingState === 'LOCKED') {
      speed = 0.06;
    }

    pointsRef.current.rotation.y -= delta * speed;
    pointsRef.current.rotation.z += delta * (speed * 0.4);

    // Scale: cluster tighter during active states, drift out on alert
    let targetScale = 1.0;
    if (
      trackingState === 'processing' ||
      trackingState === 'stabilized' ||
      trackingState === 'LOCKED'
    ) {
      targetScale = 0.88 + Math.sin(t * 1.8) * 0.04;
    } else if (motionWarning || trackingState === 'lost') {
      targetScale = 1.15;
    }

    pointsRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 1.5);
  });

  // Particle colour: amber on alert, cyan otherwise
  const isAlert = motionWarning || trackingState === 'lost';
  const colour = isAlert ? '#f59e0b' : '#22d3ee';

  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial
        transparent
        color={colour}
        size={0.04}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.55}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}
