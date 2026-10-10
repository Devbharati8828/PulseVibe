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
        // Comfortable medium-blue — not blinding, not dark
        skull: '#1a7ab5',
        emissive: '#0369a1',
        emissiveIntensity: 0.75 + Math.sin(t * 0.6) * 0.08,
        // Crisp white glowing crescent eyes — matches reference photo
        ring: '#ffffff',
        ringIntensity: 1.8 + Math.sin(t * 0.8) * 0.15,
        pupil: '#ffffff',
        pupilIntensity: 1.8,
      };
    case 'scanning':
      return {
        skull: '#1e90d0',
        emissive: '#0284c7',
        emissiveIntensity: 0.9 + Math.sin(t * 7) * 0.2,
        ring: '#bae6fd',
        ringIntensity: 1.8 + Math.sin(t * 9) * 0.3,
        pupil: '#e0f2fe',
        pupilIntensity: 1.8 + Math.sin(t * 9) * 0.3,
      };
    case 'locked':
    case 'acquiring':
      return {
        skull: '#2ca9e0',
        emissive: '#0284c7',
        emissiveIntensity: 1.1,
        ring: '#e0f2fe',
        ringIntensity: 2.0,
        pupil: '#f0f9ff',
        pupilIntensity: 2.0,
      };
    case 'processing':
      return {
        skull: '#1a7ab5',
        emissive: '#0369a1',
        emissiveIntensity: 0.9,
        ring: '#bae6fd',
        ringIntensity: 1.7,
        pupil: '#e0f2fe',
        pupilIntensity: 1.5 + Math.sin(t * 12) * 0.4,
      };
    case 'stabilized': {
      const pulse = Math.sin(t * Math.PI * 2 * bpmFreq);
      return {
        skull: '#0ea5e9',
        emissive: '#0284c7',
        emissiveIntensity: 0.8 + pulse * 0.3,
        ring: '#bae6fd',
        ringIntensity: 1.6 + pulse * 0.4,
        pupil: '#e0f2fe',
        pupilIntensity: 1.5 + pulse * 0.4,
      };
    }
    case 'alert':
      return {
        skull: '#c2550a',
        emissive: '#b45309',
        emissiveIntensity: 0.9 + Math.sin(t * 5) * 0.3,
        ring: '#fde68a',
        ringIntensity: 1.7,
        pupil: '#fef3c7',
        pupilIntensity: 1.4 + Math.sin(t * 6) * 0.3,
      };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface FaceGeometryProps {
  mode?: 'live' | 'idle';
}

export function FaceGeometry({ mode = 'live' }: FaceGeometryProps) {
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

  // ── Intro sequence blink ref (idle mode only) ─────────────────────────────
  // Fired once at the end of the intro choreography sequence
  const introBlinkRef = useRef({ triggered: false, progress: 0 });

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

  const chinGeo = useMemo(() => new THREE.CylinderGeometry(0.35, 0.2, 0.55, 32), []);
  // Sized to fit comfortably inside the skull silhouette with clean proportions:
  // radius 0.20, tube 0.018, 270° arc (gap at bottom)
  const ringGeo = useMemo(
    () => new THREE.TorusGeometry(0.20, 0.018, 16, 80, Math.PI * 1.5),
    [],
  );

  // Circular eyes/pupils — small spheres that protrude from the face surface
  // Using SphereGeometry instead of CircleGeometry avoids z-clipping with the skull
  const pupilGeo = useMemo(() => new THREE.SphereGeometry(0.075, 16, 16), []);

  // ── Skull material (patched with scan-line shader) ────────────────────────
  // Comfortable sky blue — soft, not blinding, matches reference photo
  const skullMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e88e5'),
      emissive: new THREE.Color('#0284c7'),
      emissiveIntensity: 0.55,
      roughness: 0.4,
      metalness: 0.1,
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

    // ── IDLE MODE — choreographed intro then loop ─────────────────────────────
    if (mode === 'idle') {
      const colours = getColourTarget('idle', t, 72);

      if (skullMatRef.current?.userData.shader) {
        skullMatRef.current.userData.shader.uniforms.uTime.value = t;
        skullMatRef.current.userData.shader.uniforms.uScanActive.value = 0.0;
      }

      // ── Intro choreography (first 8 seconds after mount) ──────────────────
      // Phase 0-1.0s : look left  (rotY = -0.7)
      // Phase 1.0-2.0s: look right (rotY = +0.7)
      // Phase 2.0-3.0s: return to center
      // Phase 3.0-5.0s: full 360° spin
      // Phase 5.0-6.5s: settle at center, slight nod
      // Phase 6.5-7.0s: blink
      // Phase 7.0+   : normal slow sinusoidal idle

      // Smooth easing helper
      const easeInOut = (x: number) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

      let rotX = 0, rotY = 0, rotZ = 0;
      let driftX = 0, driftY = 0, driftZ = 0;
      let breathScale = 1.0;
      let idlePupilScaleY = 1.0;

      const INTRO_DURATION = 7.0; // total choreography seconds

      if (t < 1.0) {
        // Phase 1: Look left
        const p = easeInOut(Math.min(t / 0.5, 1.0)); // ramp in first 0.5s
        rotY = -0.75 * p;
        rotX = 0.04 * p;
      } else if (t < 2.0) {
        // Phase 2: Swing to look right
        const p = easeInOut((t - 1.0));
        rotY = -0.75 + 1.5 * p; // -0.75 → +0.75
        rotX = 0.04 * (1 - p);
      } else if (t < 3.0) {
        // Phase 3: Return to center
        const p = easeInOut(t - 2.0);
        rotY = 0.75 * (1 - p);
      } else if (t < 5.0) {
        // Phase 4: Full 360° spin
        const p = (t - 3.0) / 2.0; // 0→1 over 2 seconds
        rotY = p * Math.PI * 2; // 0 → 2π full rotation
        breathScale = 1.0 + 0.04 * Math.sin(p * Math.PI * 4); // exciting pulse
      } else if (t < 6.5) {
        // Phase 5: Settle — gentle bounce back to center
        const p = easeInOut((t - 5.0) / 1.5);
        const overshoot = Math.sin(p * Math.PI * 2.5) * (1 - p) * 0.15;
        rotY = overshoot;
        rotX = Math.sin(p * Math.PI) * 0.06;
        breathScale = 1.0 + 0.03 * Math.sin(t * 2.0);
      } else if (t < 7.0) {
        // Phase 6: Blink — squash pupils only
        const p = (t - 6.5) / 0.5; // 0→1
        idlePupilScaleY = p < 0.4
          ? 1 - (p / 0.4) * 0.9       // close
          : (p - 0.4) / 0.6 * 0.9 + 0.1; // open
        breathScale = 1.0 + 0.02 * Math.sin(t * 1.5);
      } else {
        // Phase 7: Normal slow sinusoidal idle loop
        const tLoop = t - INTRO_DURATION;
        rotY = Math.sin(tLoop * 0.45) * 0.32;
        rotX = Math.sin(tLoop * 0.30) * 0.05;
        rotZ = Math.sin(tLoop * 0.25) * 0.02;
        driftX = Math.sin(tLoop * 0.6) * 0.06;
        driftY = Math.cos(tLoop * 0.7) * 0.05;
        driftZ = Math.sin(tLoop * 0.5) * 0.04;
        breathScale = 1.0 + Math.sin(tLoop * 1.5) * 0.035;
        idlePupilScaleY = 1.0;
      }

      if (groupRef.current) {
        groupRef.current.position.set(driftX, driftY, driftZ);
        groupRef.current.rotation.set(rotX, rotY, rotZ);
        groupRef.current.scale.set(breathScale, breathScale, breathScale);
      }

      // Skull & chin material colors
      if (skullRef.current) {
        const mat = skullRef.current.material as THREE.MeshStandardMaterial;
        mat.color.lerp(new THREE.Color(colours.skull), delta * 2);
        mat.emissive.lerp(new THREE.Color(colours.emissive), delta * 2);
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, colours.emissiveIntensity, delta * 3);
      }
      if (chinRef.current) {
        const mat = chinRef.current.material as THREE.MeshStandardMaterial;
        mat.color.lerp(new THREE.Color(colours.skull), delta * 2);
        mat.emissive.lerp(new THREE.Color(colours.emissive), delta * 2);
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, colours.emissiveIntensity * 0.7, delta * 3);
      }

      // Eye rings & circular pupils: glow + pupil blink during intro phase 6
      for (const rRef of [ringLRef, ringRRef]) {
        if (rRef.current) {
          rRef.current.scale.y = 1.0; // Never squash arcs
          const mat = rRef.current.material as THREE.MeshStandardMaterial;
          mat.emissive.lerp(new THREE.Color(colours.ring), delta * 4);
          mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, colours.ringIntensity, delta * 4);
        }
      }
      for (const pRef of [pupilLRef, pupilRRef]) {
        if (pRef.current) {
          pRef.current.scale.y = THREE.MathUtils.lerp(pRef.current.scale.y, idlePupilScaleY, delta * 25);
          const mat = pRef.current.material as THREE.MeshStandardMaterial;
          mat.emissive.lerp(new THREE.Color(colours.pupil), delta * 4);
          mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, colours.pupilIntensity, delta * 4);
        }
      }

      return;
    }
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

    // ── Head pose from face landmarks (yaw / pitch / roll) ──────────────────
    // Uses key MediaPipe face mesh points:
    //   4  = nose tip
    //   33 = right eye outer corner (from camera POV)
    //  263 = left  eye outer corner (from camera POV)
    //  152 = chin bottom
    //   10 = forehead center
    if (landmarks && landmarks.length > 263) {
      const nose  = landmarks[4];
      const eyeR  = landmarks[33];   // camera-right eye outer
      const eyeL  = landmarks[263];  // camera-left  eye outer

      // Eye midpoint (horizontal centre of face)
      const eyeMidX = (eyeR.x + eyeL.x) / 2;
      const eyeMidY = (eyeR.y + eyeL.y) / 2;

      // ── YAW  (turn left / right) — only rotation we mirror ───────────────
      // Nose drifts away from eye midpoint when face turns
      const rawYaw = (nose.x - eyeMidX) * 6.0;
      headTarget.current.y = THREE.MathUtils.clamp(rawYaw, -1.2, 1.2);

      // Pitch and roll are intentionally disabled — face stays upright/centered
      headTarget.current.x = 0;
      headTarget.current.z = 0;
    } else {
      // Fallback idle animation when no face detected
      switch (displayState) {
        case 'idle':
          headTarget.current.x = Math.sin(t * 0.4) * 0.04;
          headTarget.current.y = Math.sin(t * 0.3) * 0.03;
          headTarget.current.z = 0;
          break;
        case 'alert':
          headTarget.current.x = Math.sin(t * 2.5) * 0.05;
          headTarget.current.y = Math.sin(t * 1.8) * 0.04;
          headTarget.current.z = Math.sin(t * 2.0) * 0.03;
          break;
        default:
          headTarget.current.x = Math.sin(t * 0.2) * 0.01;
          headTarget.current.y = Math.sin(t * 0.15) * 0.01;
          headTarget.current.z = 0;
      }
    }

    // ── Head movement target (position) ─────────────────────────────────────
    let targetPosX = 0;
    let targetPosY = 0;
    
    if (faceBounds) {
      targetPosX = (faceBounds.x + faceBounds.width / 2 - 0.5) * 2.0;
      targetPosY = (0.5 - (faceBounds.y + faceBounds.height / 2)) * 2.0;
    }

    if (groupRef.current) {
      // Position shifting
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetPosX, delta * 5);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetPosY, delta * 5);

      // Rotation — smooth lerp toward head pose target
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        headTarget.current.x,
        delta * 6,
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        headTarget.current.y,
        delta * 6,
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        headTarget.current.z,
        delta * 5,
      );
    }

    // ── Skull & Chin colours ─────────────────────────────────────────────────
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
    if (chinRef.current) {
      const mat = chinRef.current.material as THREE.MeshStandardMaterial;
      mat.color.lerp(new THREE.Color(colours.skull), delta * 2);
      mat.emissive.lerp(new THREE.Color(colours.emissive), delta * 2);
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        colours.emissiveIntensity * 0.7,
        delta * 3,
      );
    }

    // ── Eye ring & pupil colours ─────────────────────────────────────────────
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
    for (const pRef of [pupilLRef, pupilRRef]) {
      if (pRef.current) {
        const mat = pRef.current.material as THREE.MeshStandardMaterial;
        mat.emissive.lerp(new THREE.Color(colours.pupil), delta * 4);
        mat.emissiveIntensity = THREE.MathUtils.lerp(
          mat.emissiveIntensity,
          colours.pupilIntensity,
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

    // ── Pupil blink: squash vertically when blinking ──────────────────
    const bP = blink.blinkProgress;
    const pupilScaleY = blink.blinking
      ? (bP < 0.5 ? 1 - (bP / 0.5) * 0.85 : ((bP - 0.5) / 0.5) * 0.85 + 0.15)
      : 1.0;

    for (const rRef of [ringLRef, ringRRef]) {
      if (rRef.current) {
        rRef.current.scale.y = 1.0; // Never squash arcs
      }
    }
    for (const pRef of [pupilLRef, pupilRRef]) {
      if (pRef.current) {
        pRef.current.scale.y = THREE.MathUtils.lerp(pRef.current.scale.y, pupilScaleY, delta * 20);
      }
    }
  });

  // Eye positions — proportionate placement within the skull contour
  const EYE_Y = 0.18;
  const EYE_X = 0.23;
  const EYE_Z = 0.65;

  // Circular pupil positions — aligned perfectly with the arc center to look straight ahead
  // Skull Z-surface at (EYE_X=0.23, PUPIL_Y=0.18) ≈ 0.67, so 0.74 is safely outside
  const PUPIL_Y = 0.18;   // aligned perfectly with EYE_Y center
  const PUPIL_Z = 0.74;  // clearly in front of the skull surface

  // Arc length is 1.5π (270°). Gap original center = 315°.
  // Rotating by -45° (-Math.PI * 0.25) places:
  // - Arch peak at exactly 90° (top)
  // - Gap at exactly 270° (bottom)
  const EYE_ROT_Z = -Math.PI * 0.25;

  return (
    <group ref={groupRef}>
      {/* ── Skull ──────────────────────────────────────────────────────────── */}
      <mesh ref={skullRef} geometry={skullGeo} material={skullMat} />

      {/* ── Chin taper — same comfortable sky-blue as skull ─────────────── */}
      <mesh ref={chinRef} geometry={chinGeo} position={[0, -0.88, 0]}>
        <meshStandardMaterial
          color="#1e88e5"
          emissive="#0284c7"
          emissiveIntensity={0.55}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* ── Left eye arc — partial-arc crescent, arched at top ──────────── */}
      <mesh
        ref={ringLRef}
        geometry={ringGeo}
        position={[-EYE_X, EYE_Y, EYE_Z]}
        rotation={[0, -0.22, EYE_ROT_Z]}
      >
        <meshStandardMaterial
          color="#f0f9ff"
          emissive="#ffffff"
          emissiveIntensity={1.8}
          roughness={0.08}
          metalness={0.0}
          transparent
          opacity={1.0}
        />
      </mesh>

      {/* ── Left eye circle (pupil) — small sphere on face surface ─────── */}
      <mesh
        ref={pupilLRef}
        geometry={pupilGeo}
        position={[-EYE_X, PUPIL_Y, PUPIL_Z]}
      >
        <meshStandardMaterial
          color="#f0f9ff"
          emissive="#ffffff"
          emissiveIntensity={2.2}
          roughness={0.05}
          metalness={0.0}
        />
      </mesh>

      {/* ── Right eye arc — symmetric arch, arched at top ───────────────── */}
      <mesh
        ref={ringRRef}
        geometry={ringGeo}
        position={[EYE_X, EYE_Y, EYE_Z]}
        rotation={[0, 0.22, EYE_ROT_Z]}
      >
        <meshStandardMaterial
          color="#f0f9ff"
          emissive="#ffffff"
          emissiveIntensity={1.8}
          roughness={0.08}
          metalness={0.0}
          transparent
          opacity={1.0}
        />
      </mesh>

      {/* ── Right eye circle (pupil) — small sphere on face surface ────── */}
      <mesh
        ref={pupilRRef}
        geometry={pupilGeo}
        position={[EYE_X, PUPIL_Y, PUPIL_Z]}
      >
        <meshStandardMaterial
          color="#f0f9ff"
          emissive="#ffffff"
          emissiveIntensity={2.2}
          roughness={0.05}
          metalness={0.0}
        />
      </mesh>

    </group>
  );
}

