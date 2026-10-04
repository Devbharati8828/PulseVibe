import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, IcosahedronGeometry, MeshStandardMaterial, MathUtils, Color } from 'three';
import { useEngineStore } from '../../stores/useEngineStore';
import type { TrackingState } from '../../engine/types';

export function CoreSphere() {
  const meshRef = useRef<Mesh>(null);
  const wireframeRef = useRef<Mesh>(null);
  
  const trackingState = useEngineStore((state) => state.viewModel?.trackingState || 'idle');
  const bpm = useEngineStore((state) => state.viewModel?.bpm || 72);
  
  // Base geometry
  const geometry = useMemo(() => new IcosahedronGeometry(1, 4), []);
  const wireframeGeometry = useMemo(() => new IcosahedronGeometry(1.05, 2), []);

  useFrame((state, delta) => {
    if (!meshRef.current || !wireframeRef.current) return;

    const t = state.clock.getElapsedTime();
    
    // Base rotation
    let rotSpeed = 0.1;
    if (trackingState === 'scanning' || trackingState === 'detected') rotSpeed = 0.5;
    if (trackingState === 'processing' || trackingState === 'acquiring') rotSpeed = 0.2;
    
    meshRef.current.rotation.y += delta * rotSpeed;
    meshRef.current.rotation.x += delta * (rotSpeed * 0.5);
    wireframeRef.current.rotation.y -= delta * (rotSpeed * 1.5);
    wireframeRef.current.rotation.x -= delta * rotSpeed;

    // Scale animation (Breathing / Pulsing)
    let targetScale = 1;
    if (trackingState === 'stabilized' || trackingState === 'processing') {
      // Pulse at BPM
      const freq = bpm / 60;
      const pulse = Math.sin(t * Math.PI * 2 * freq);
      targetScale = 1 + pulse * 0.05;
    } else if (trackingState === 'locked' || trackingState === 'acquiring') {
      targetScale = 1.1;
    }
    
    meshRef.current.scale.lerp({ x: targetScale, y: targetScale, z: targetScale } as any, 0.1);
    wireframeRef.current.scale.copy(meshRef.current.scale);

    // Color & Emissive transition
    const mat = meshRef.current.material as MeshStandardMaterial;
    const wireMat = wireframeRef.current.material as MeshStandardMaterial;
    
    let targetColor = '#0f172a'; // surface-900 (dim)
    let targetEmissive = '#000000';
    let targetEmissiveIntensity = 0.1;

    switch (trackingState) {
      case 'idle':
        targetColor = '#1e293b';
        targetEmissive = '#0ea5e9'; // dim blue
        targetEmissiveIntensity = 0.2;
        break;
      case 'scanning':
      case 'detected':
      case 'locking':
        targetColor = '#0284c7';
        targetEmissive = '#22d3ee'; // cyan
        targetEmissiveIntensity = 0.8 + Math.sin(t * 8) * 0.4; // rapid blink
        break;
      case 'locked':
      case 'acquiring':
        targetColor = '#0ea5e9';
        targetEmissive = '#22d3ee';
        targetEmissiveIntensity = 1.2;
        break;
      case 'processing':
      case 'stabilized':
        targetColor = '#22d3ee';
        targetEmissive = '#22d3ee';
        // Pulse glow with BPM
        const freq = bpm / 60;
        targetEmissiveIntensity = 1.0 + Math.sin(t * Math.PI * 2 * freq) * 0.5;
        break;
      case 'lost':
        targetColor = '#7f1d1d';
        targetEmissive = '#ef4444'; // red
        targetEmissiveIntensity = 1.5;
        break;
    }

    // Smoothly interpolate colors
    mat.color.lerp(new Color(targetColor), 0.05);
    mat.emissive.lerp(new Color(targetEmissive), 0.05);
    mat.emissiveIntensity = MathUtils.lerp(mat.emissiveIntensity, targetEmissiveIntensity, 0.05);
    
    wireMat.color.copy(mat.color);
    wireMat.emissive.copy(mat.emissive);
    wireMat.emissiveIntensity = mat.emissiveIntensity * 0.5;
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial 
          roughness={0.2}
          metalness={0.8}
          color="#1e293b"
          emissive="#0ea5e9"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      <mesh ref={wireframeRef} geometry={wireframeGeometry}>
        <meshStandardMaterial 
          wireframe
          transparent
          opacity={0.3}
          color="#1e293b"
          emissive="#0ea5e9"
          emissiveIntensity={0.1}
        />
      </mesh>
    </group>
  );
}
