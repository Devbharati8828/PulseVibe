/**
 * FaceGeometry.tsx
 *
 * Procedural 3D AI Face — the system's own persona/avatar.
 * Built entirely from primitive Three.js geometries (no external model file).
 *
 * Anatomy:
 *   - Skull volume : SphereGeometry (slightly Y-elongated)
 *   - Eye sockets  : TorusGeometry outlines with emissive glow
 *   - Eye pupils   : CircleGeometry emissive discs (primary emotion signal)
 *   - Chin taper   : CylinderGeometry (subtle jaw definition)
 *   - No mouth, no nose — silicon/android aesthetic
 *
 * All animation is driven by useFrame refs — zero React state re-renders
 * in the hot path.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEngineStore } from '../../stores/useEngineStore';
import type { FaceTrackingState } from '../../features/face/face.types';

// ─── State Normalisation ────────────────────────────────────────────────────

type DisplayState =
  | 'idle'
  | 'scanning'
  | 'locked'
  | 'acquiring'
  | 'processing'
  | 'stabilized'
  | 'alert'; // motion warning / lost

function toDisplayState(
  s: FaceTrackingState | string | undefined,
  motionWarning: boolean,
): DisplayState {
  if (motionWarning) return 'alert';
  switch (s) {
    case 'NO_FACE':
      return 'idle';
    case 'DETECTED':
      return 'scanning';
    case 'TRACKING':
      return 'locked';
    case 'STABILIZING':
      return 'acquiring';
    case 'LOCKED':
      return 'stabilized';
    // Legacy adapter keys (kept for safety)
    case 'idle':
      return 'idle';
    case 'scanning':
    case 'detected':
    case 'locking':
      return 'scanning';
    case 'locked':
      return 'locked';
    case 'acquiring':
      return 'acquiring';
    case 'processing':
      return 'processing';
    case 'stabilized':
      return 'stabilized';
    case 'lost':
      return 'alert';
    default:
      return 'idle';
  }
}

// ─── Scan-line Shader (injected into MeshStandardMaterial) ──────────────────

const SCAN_UNIFORMS = {
  uTime: { value: 0 },
  uScanActive: { value: 0 },
};

function patchMaterial(mat: THREE.MeshStandardMaterial) {
  mat.userData.uniforms = SCAN_UNIFORMS;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = SCAN_UNIFORMS.uTime;
    shader.uniforms.uScanActive = SCAN_UNIFORMS.uScanActive;

    shader.vertexShader = `
      varying vec3 vWorldPos;
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
    );

    shader.fragmentShader = `
      uniform float uTime;
      uniform float uScanActive;
      varying vec3 vWorldPos;
      ${shader.fragmentShader}
    `.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       // Horizontal scan line sweep
       float scanY = mod(vWorldPos.y + uTime * 0.8, 2.2) - 1.1;
       float line  = smoothstep(0.04, 0.0, abs(scanY)) * 0.35 * uScanActive;
       gl_FragColor.rgb += vec3(0.13, 0.82, 0.95) * line;`
    );
    mat.userData.shader = shader;
  };
  mat.needsUpdate = true;
}

// ─── Colour Targets Per State ────────────────────────────────────────────────

interface ColourTarget {
  skull: string;
  emissive: string;
  emissiveIntensity: number;
  ring: string;
  ringIntensity: number;
  pupil: string;
  pupilIntensity: number;
}

function getColourTarget(state: DisplayState, t: number, bpm: number): ColourTarget {
  const bpmFreq = (bpm || 72) / 60;
  switch (state) {
    case 'idle':
      return {
        skull: '#0d1a2a',
        emissive: '#0c3a5a',
        emissiveIntensity: 0.18 + Math.sin(t * 0.6) * 0.06,
        ring: '#0e7490',
        ringIntensity: 0.3,
        pupil: '#22d3ee',
        pupilIntensity: 0.5 + Math.sin(t * 0.5) * 0.15,
      };
    case 'scanning':
      return {
        skull: '#0c2440',
        emissive: '#0ea5e9',
        emissiveIntensity: 0.7 + Math.sin(t * 7) * 0.3,
        ring: '#22d3ee',
        ringIntensity: 1.0,
        pupil: '#67e8f9',
        pupilIntensity: 1.2 + Math.sin(t * 9) * 0.4,
      };
    case 'locked':
    case 'acquiring':
      return {
        skull: '#0a2035',
        emissive: '#0ea5e9',
        emissiveIntensity: 1.0,
        ring: '#38bdf8',
        ringIntensity: 1.4,
        pupil: '#7dd3fc',
        pupilIntensity: 1.8,
      };
    case 'processing':
      return {
        skull: '#061e30',
        emissive: '#06b6d4',
        emissiveIntensity: 0.9,
        ring: '#22d3ee',
        ringIntensity: 1.2,
        pupil: '#a5f3fc',
        pupilIntensity: 1.5 + Math.sin(t * 12) * 0.5, // rapid thought pulse
      };
    case 'stabilized': {
      const pulse = Math.sin(t * Math.PI * 2 * bpmFreq);
      return {
        skull: '#061a28',
        emissive: '#0891b2',
        emissiveIntensity: 0.8 + pulse * 0.3,
        ring: '#22d3ee',
        ringIntensity: 1.0 + pulse * 0.4,
        pupil: '#67e8f9',
        pupilIntensity: 1.2 + pulse * 0.5,
      };
    }
    case 'alert':
      return {
        skull: '#1a0e00',
        emissive: '#d97706',
        emissiveIntensity: 0.8 + Math.sin(t * 5) * 0.4, // amber pulse
        ring: '#f59e0b',
        ringIntensity: 1.2,
        pupil: '#fbbf24',
        pupilIntensity: 0.9 + Math.sin(t * 6) * 0.4,
      };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FaceGeometry() {
  // Engine state (read-only subscriptions)
  const trackingState = useEngineStore((s) => s.viewModel?.trackingState);
  const bpm = useEngineStore((s) => s.viewModel?.bpm ?? 72);
  const motionWarning = useEngineStore((s) => s.viewModel?.motionWarning ?? false);
  const faceBounds = useEngineStore((s) => s.viewModel?.faceBounds);
  const blendshapes = useEngineStore((s) => s.viewModel?.blendshapes);
  const landmarks = useEngineStore((s) => s.viewModel?.landmarks);

  // ── Refs for Three.js objects ─────────────────────────────────────────────
  const skullRef = useRef<THREE.Mesh>(null);
  const chinRef = useRef<THREE.Mesh>(null);
  const ringLRef = useRef<THREE.Mesh>(null);
  const ringRRef = useRef<THREE.Mesh>(null);
  const pupilLRef = useRef<THREE.Mesh>(null);
  const pupilRRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // ── Blink system (ref-based, zero re-renders) ─────────────────────────────
  const blinkRef = useRef({
    lastBlinkTime: 0,
    blinking: false,
    blinkProgress: 0, // 0 = open, 1 = closed
  });

  // ── Scan-line material ref ────────────────────────────────────────────────
  const skullMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // ── Head rotation target (for gaze / concern micro-motion) ───────────────
  const headTarget = useRef({ x: 0, y: 0, z: 0 });

  // ── Geometries (stable across renders) ───────────────────────────────────
  const skullGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 64, 64);
    // Elongate vertically for a synthetic skull silhouette
    g.applyMatrix4(new THREE.Matrix4().makeScale(0.78, 1.0, 0.72));
    return g;
  }, []);

  const chinGeo = useMemo(() => new THREE.CylinderGeometry(0.35, 0.18, 0.5, 32), []);
  const ringGeo = useMemo(() => new THREE.TorusGeometry(0.22, 0.018, 16, 64), []);
  const pupilGeo = useMemo(() => new THREE.CircleGeometry(0.1, 32), []);

  // ── Skull material (patched with scan-line shader) ────────────────────────
  const skullMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0d1a2a'),
      emissive: new THREE.Color('#0c3a5a'),
      emissiveIntensity: 0.18,
      roughness: 0.25,
      metalness: 0.85,
    });
    patchMaterial(m);
    skullMatRef.current = m;
    return m;
  }, []);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      skullGeo.dispose();
      chinGeo.dispose();
      ringGeo.dispose();
      pupilGeo.dispose();
      skullMat.dispose();
    };
  }, [skullGeo, chinGeo, ringGeo, pupilGeo, skullMat]);

  // ── Animation loop ────────────────────────────────────────────────────────
  useFrame((state, delta) => {
    state.invalidate(); // required: canvas is in frameloop='demand' mode
    const t = state.clock.getElapsedTime();
    const displayState = toDisplayState(trackingState as FaceTrackingState, motionWarning);
    const colours = getColourTarget(displayState, t, bpm ?? 72);

    // ── Update scan-line shader uniforms ────────────────────────────────────
    if (skullMatRef.current?.userData.shader) {
      skullMatRef.current.userData.shader.uniforms.uTime.value = t;
      skullMatRef.current.userData.shader.uniforms.uScanActive.value =
        THREE.MathUtils.lerp(
          skullMatRef.current.userData.shader.uniforms.uScanActive.value,
          displayState === 'processing' ? 1.0 : 0.0,
          delta * 2,
        );
    }

    // ── Head rotation targets ────────────────────────────────────────────────
    switch (displayState) {
      case 'idle':
        // Gentle bob
        headTarget.current.x = Math.sin(t * 0.4) * 0.04;
        headTarget.current.y = Math.sin(t * 0.3) * 0.03;
        headTarget.current.z = 0;
        break;
      case 'scanning':
        // Face turns toward camera / user
        headTarget.current.x = 0;
        headTarget.current.y = 0; // straight ahead
        headTarget.current.z = 0;
        break;
      case 'locked':
      case 'acquiring':
      case 'processing':
      case 'stabilized':
        // Nearly still — attentive, settled
        headTarget.current.x = Math.sin(t * 0.2) * 0.01;
        headTarget.current.y = Math.sin(t * 0.15) * 0.01;
        headTarget.current.z = 0;
        break;
      case 'alert':
        // Subtle concerned tilt
        headTarget.current.x = Math.sin(t * 2.5) * 0.05;
        headTarget.current.y = Math.sin(t * 1.8) * 0.04;
        headTarget.current.z = Math.sin(t * 2.0) * 0.03;
        break;
    }

    // ── Head movement target ────────────────────────────────────────────────
    let targetPosX = 0;
    let targetPosY = 0;
    
    if (faceBounds) {
      // Map normalized (0-1) bounds to spatial offset. 
      // Multiplier (2.0) defines the spatial range (± ~20-30px equivalent)
      targetPosX = (faceBounds.x + faceBounds.width / 2 - 0.5) * 2.0;
      targetPosY = (0.5 - (faceBounds.y + faceBounds.height / 2)) * 2.0;
    }

    if (groupRef.current) {
      // Position shifting
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetPosX, delta * 5);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetPosY, delta * 5);

      // Rotation shifting
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        headTarget.current.x,
        delta * 3,
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        headTarget.current.y,
        delta * 3,
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        headTarget.current.z,
        delta * 2,
      );
    }

    // ── Skull colours ────────────────────────────────────────────────────────
    if (skullRef.current) {
      const mat = skullRef.current.material as THREE.MeshStandardMaterial;
      mat.color.lerp(new THREE.Color(colours.skull), delta * 2);
      mat.emissive.lerp(new THREE.Color(colours.emissive), delta * 2);
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        colours.emissiveIntensity,
        delta * 3,
      );
    }

    // ── Eye ring colours ─────────────────────────────────────────────────────
    for (const ringRef of [ringLRef, ringRRef]) {
      if (ringRef.current) {
        const mat = ringRef.current.material as THREE.MeshStandardMaterial;
        mat.emissive.lerp(new THREE.Color(colours.ring), delta * 4);
        mat.emissiveIntensity = THREE.MathUtils.lerp(
          mat.emissiveIntensity,
          colours.ringIntensity,
          delta * 4,
        );
      }
    }

    // ── Blink system ─────────────────────────────────────────────────────────
    const blink = blinkRef.current;
    
    // Check blendshapes for blink intent
    let blinkLeft = blendshapes?.find(b => {
      const n = b.categoryName.toLowerCase();
      return n.includes('blink') && (n.includes('left') || n.includes('_l'));
    })?.score;
    
    let blinkRight = blendshapes?.find(b => {
      const n = b.categoryName.toLowerCase();
      return n.includes('blink') && (n.includes('right') || n.includes('_r'));
    })?.score;
    
    // Fallback to manual EAR (Eye Aspect Ratio) if blendshapes are missing
    if (blinkLeft === undefined || blinkRight === undefined) {
      if (landmarks && landmarks.length > 386) {
        // Vertical distance between upper and lower eyelids
        const leftEyeDist = Math.abs(landmarks[159].y - landmarks[145].y);
        const rightEyeDist = Math.abs(landmarks[386].y - landmarks[374].y);
        
        // Open eye dist is ~0.02 - 0.03. Closed is < 0.005
        blinkLeft = leftEyeDist < 0.008 ? 1.0 : 0.0;
        blinkRight = rightEyeDist < 0.008 ? 1.0 : 0.0;
      } else {
        blinkLeft = 0;
        blinkRight = 0;
      }
    }
    
    const isBlinkingIntent = blinkLeft > 0.3 || blinkRight > 0.3;

    // Trigger blink with 300ms debounce
    if (isBlinkingIntent && !blink.blinking && (t - blink.lastBlinkTime) > 0.3) {
      blink.blinking = true;
      blink.blinkProgress = 0;
      blink.lastBlinkTime = t;
    }

    if (blink.blinking) {
      // 200ms total duration for squash/shutter
      blink.blinkProgress += delta / 0.20;
      if (blink.blinkProgress >= 1) {
        blink.blinking = false;
        blink.blinkProgress = 0;
      }
    }

    // blinkProgress 0→0.5: squash (scale Y 1→0), 0.5→1: reopen (scale Y 0→1)
    const bP = blink.blinkProgress;
    const pupilScaleY = blink.blinking 
      ? (bP < 0.5 ? 1 - (bP / 0.5) : (bP - 0.5) / 0.5)
      : 1.0;

    // ── Pupil scale + colour ─────────────────────────────────────────────────
    for (const pRef of [pupilLRef, pupilRRef]) {
      if (pRef.current) {
        const mat = pRef.current.material as THREE.MeshStandardMaterial;
        pRef.current.scale.y = THREE.MathUtils.lerp(pRef.current.scale.y, pupilScaleY, delta * 20);
        // Eye widens on scanning/locked
        const eyeScale =
          displayState === 'scanning' || displayState === 'locked' ? 1.2
          : displayState === 'alert' ? 0.75
          : 1.0;
        pRef.current.scale.x = THREE.MathUtils.lerp(pRef.current.scale.x, eyeScale, delta * 4);

        mat.emissive.lerp(new THREE.Color(colours.pupil), delta * 6);
        mat.emissiveIntensity = THREE.MathUtils.lerp(
          mat.emissiveIntensity,
          colours.pupilIntensity,
          delta * 6,
        );
      }
    }
  });

  // Eye positions (local to group, relative to skull centre)
  const EYE_Y = 0.18;
  const EYE_X = 0.265;
  const EYE_Z = 0.68; // slightly forward of the skull surface centre

  return (
    <group ref={groupRef}>
      {/* ── Skull ──────────────────────────────────────────────────────── */}
      <mesh ref={skullRef} geometry={skullGeo} material={skullMat} />

      {/* ── Chin taper ─────────────────────────────────────────────────── */}
      <mesh ref={chinRef} geometry={chinGeo} position={[0, -0.88, 0]}>
        <meshStandardMaterial
          color="#0a1520"
          emissive="#0c3a5a"
          emissiveIntensity={0.1}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* ── Left eye socket ring ────────────────────────────────────────── */}
      <mesh ref={ringLRef} geometry={ringGeo} position={[-EYE_X, EYE_Y, EYE_Z]}>
        <meshStandardMaterial
          color="#061018"
          emissive="#0e7490"
          emissiveIntensity={0.3}
          roughness={0.1}
          metalness={1.0}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* ── Right eye socket ring ───────────────────────────────────────── */}
      <mesh ref={ringRRef} geometry={ringGeo} position={[EYE_X, EYE_Y, EYE_Z]}>
        <meshStandardMaterial
          color="#061018"
          emissive="#0e7490"
          emissiveIntensity={0.3}
          roughness={0.1}
          metalness={1.0}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* ── Left pupil disc ─────────────────────────────────────────────── */}
      <mesh ref={pupilLRef} geometry={pupilGeo} position={[-EYE_X, EYE_Y, EYE_Z + 0.005]}>
        <meshStandardMaterial
          color="#020a10"
          emissive="#22d3ee"
          emissiveIntensity={0.5}
          roughness={0.0}
          metalness={0.0}
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ── Right pupil disc ────────────────────────────────────────────── */}
      <mesh ref={pupilRRef} geometry={pupilGeo} position={[EYE_X, EYE_Y, EYE_Z + 0.005]}>
        <meshStandardMaterial
          color="#020a10"
          emissive="#22d3ee"
          emissiveIntensity={0.5}
          roughness={0.0}
          metalness={0.0}
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
