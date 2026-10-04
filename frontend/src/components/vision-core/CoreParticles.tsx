import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useEngineStore } from '../../stores/useEngineStore';

export function CoreParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const trackingState = useEngineStore((state) => state.viewModel?.trackingState || 'idle');
  
  // Generate random points in a sphere
  const [positions, sizes] = useMemo(() => {
    const count = 150;
    const pos = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Random point on sphere surface/volume
      const r = 1.5 + Math.random() * 2; // radius between 1.5 and 3.5
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      
      siz[i] = Math.random() * 0.05 + 0.02;
    }
    return [pos, siz];
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    
    // Rotate entire particle cloud
    let speed = 0.05;
    if (trackingState === 'processing' || trackingState === 'scanning') speed = 0.2;
    
    pointsRef.current.rotation.y -= delta * speed;
    pointsRef.current.rotation.z += delta * (speed * 0.5);
    
    // Scale pulse
    if (trackingState === 'stabilized') {
      const t = state.clock.getElapsedTime();
      const s = 1 + Math.sin(t * 2) * 0.05;
      pointsRef.current.scale.set(s, s, s);
    } else {
      pointsRef.current.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
    }
  });

  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial
        transparent
        color="#22d3ee"
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}
