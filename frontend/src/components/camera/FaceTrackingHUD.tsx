import { useEffect, useRef } from 'react';
import { useEngineStore } from '../../stores/useEngineStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { motion, AnimatePresence } from 'framer-motion';
import type { PulseViewModel } from '../../adapters/types';

// ─── Stable rAF canvas loop ────────────────────────────────────────────────
// The render loop is created ONCE on mount and reads all reactive data through
// refs so the rAF is never torn down on React re-renders.

// Key anatomical landmark indices for bright node rendering
// (eye corners, brow arch, nose tip/bridge, mouth corners, chin, cheekbones)
const MAJOR_LANDMARK_INDICES = [
  // Left eye corners + lid
  33, 133, 159, 145,
  // Right eye corners + lid
  263, 362, 386, 374,
  // Brow points
  70, 63, 105, 66,  // left brow
  296, 334, 293, 300, // right brow
  // Nose
  1, 2, 4, 197, 5,
  // Mouth corners + lip edges
  61, 291, 13, 14, 17,
  // Chin + jaw anchors
  199, 175,
  // Cheekbones
  234, 454,
];

// Center-of-face reference landmark indices used for distance-based opacity
const CENTER_LANDMARKS = [1, 13, 168]; // nose tip, upper lip, nose bridge

/** Returns (cx, cy) as normalised 0-1 centroid of the specified landmark indices */
function getFaceCentre(
  landmarks: { x: number; y: number }[],
  indices: number[]
): { cx: number; cy: number } {
  let sx = 0, sy = 0, n = 0;
  for (const i of indices) {
    if (landmarks[i]) { sx += landmarks[i].x; sy += landmarks[i].y; n++; }
  }
  return n > 0 ? { cx: sx / n, cy: sy / n } : { cx: 0.5, cy: 0.5 };
}

export function FaceTrackingHUD() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs the loop reads every frame — always current, never stale
  const viewModelRef   = useRef<PulseViewModel | null>(null);
  const showMeshRef    = useRef<boolean>(true);

  const viewModel  = useEngineStore((state) => state.viewModel);
  const showFaceMesh = useSettingsStore((state) => state.showFaceMesh);

  useEffect(() => { viewModelRef.current = viewModel; },    [viewModel]);
  useEffect(() => { showMeshRef.current  = showFaceMesh; }, [showFaceMesh]);

  // ── Stable rAF loop — runs once on mount ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;

    const render = () => {
      // Keep pixel buffer in sync with CSS layout
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const vm   = viewModelRef.current;
      const show = showMeshRef.current;

      if (!vm || !show) { rafId = requestAnimationFrame(render); return; }

      const { landmarks, faceBounds, trackingState } = vm;
      const W = canvas.width;
      const H = canvas.height;

      const isActive =
        trackingState === 'DETECTED'    ||
        trackingState === 'TRACKING'    ||
        trackingState === 'STABILIZING' ||
        trackingState === 'LOCKED';

      // ── 1. Dense tessellation mesh with centre-weighted glow ─────────────
      if (landmarks && isActive && FaceLandmarker.FACE_LANDMARKS_TESSELATION) {
        // Compute face centre in normalised space for distance-based opacity
        const { cx, cy } = getFaceCentre(landmarks, CENTER_LANDMARKS);

        // Pre-sort connections into centre / edge buckets so we can batch
        // by opacity, keeping draw calls minimal (2 strokes total).
        const inner: [number, number, number, number][] = []; // [x0,y0,x1,y1]
        const outer: [number, number, number, number][] = [];

        for (const conn of FaceLandmarker.FACE_LANDMARKS_TESSELATION) {
          const s = landmarks[conn.start];
          const e = landmarks[conn.end];
          if (!s || !e) continue;

          // Mid-point distance from centre (normalised)
          const mx = (s.x + e.x) * 0.5;
          const my = (s.y + e.y) * 0.5;
          const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);

          (dist < 0.18 ? inner : outer).push([s.x * W, s.y * H, e.x * W, e.y * H]);
        }

        // Inner (bright) strokes
        ctx.save();
        ctx.lineWidth   = 0.65;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.30)';
        ctx.shadowColor = 'rgba(34, 211, 238, 0.55)';
        ctx.shadowBlur  = 5;
        ctx.beginPath();
        for (const [x0, y0, x1, y1] of inner) {
          ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        }
        ctx.stroke();
        ctx.restore();

        // Outer (faded) strokes
        ctx.save();
        ctx.lineWidth   = 0.55;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.10)';
        ctx.shadowColor = 'rgba(34, 211, 238, 0.15)';
        ctx.shadowBlur  = 2;
        ctx.beginPath();
        for (const [x0, y0, x1, y1] of outer) {
          ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        }
        ctx.stroke();
        ctx.restore();

        // ── 2. Major landmark nodes — larger, brighter, glowing ────────────
        ctx.save();
        ctx.shadowColor = 'rgba(34, 211, 238, 1)';
        ctx.shadowBlur  = 14;
        ctx.fillStyle   = 'rgba(255, 255, 255, 0.90)';
        for (const idx of MAJOR_LANDMARK_INDICES) {
          const pt = landmarks[idx];
          if (!pt) continue;
          // Nodes near centre are slightly larger
          const dist = Math.sqrt((pt.x - cx) ** 2 + (pt.y - cy) ** 2);
          const r    = dist < 0.18 ? 1.9 : 1.4;
          ctx.beginPath();
          ctx.arc(pt.x * W, pt.y * H, r, 0, 2 * Math.PI);
          ctx.fill();
        }
        ctx.restore();
      }

      // ── 3. Corner brackets ───────────────────────────────────────────────
      if (faceBounds && trackingState !== 'NO_FACE') {
        const { x, y, width, height } = faceBounds;
        const bx  = x      * W;
        const by  = y      * H;
        const bw  = width  * W;
        const bh  = height * H;
        const arm = Math.min(18, bw * 0.1);

        const col = (trackingState === 'LOCKED' || trackingState === 'STABILIZING')
          ? '#22d3ee' : '#f59e0b';

        ctx.save();
        ctx.strokeStyle = col;
        ctx.lineWidth   = 2;
        ctx.shadowBlur  = 14;
        ctx.shadowColor = col;

        ctx.beginPath(); ctx.moveTo(bx, by + arm); ctx.lineTo(bx, by); ctx.lineTo(bx + arm, by); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx + bw - arm, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + arm); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, by + bh - arm); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + arm, by + bh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx + bw - arm, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - arm); ctx.stroke();

        ctx.restore();
      }

      rafId = requestAnimationFrame(render);
    };

    render(); // kick off — only ever called once
    return () => cancelAnimationFrame(rafId);
  }, []); // ← stable: reads refs each frame

  // ── HUD panel (React / Framer Motion layer) ──────────────────────────────
  const isVisible =
    !!viewModel &&
    !!viewModel.faceBounds &&
    showFaceMesh &&
    viewModel.trackingState !== 'NO_FACE';

  let hudLabel = '';
  let hudValue = '';

  if (viewModel) {
    const ts = viewModel.trackingState;
    if (ts === 'DETECTED' || ts === 'TRACKING') {
      hudLabel = 'FACE SCANNING';
      hudValue  = `${Math.round(viewModel.faceConfidence * 100)}%`;
    } else if (ts === 'STABILIZING') {
      hudLabel = 'FACE LOCKED';
      hudValue  = `${Math.round(viewModel.faceConfidence * 100)}%`;
    } else if (ts === 'LOCKED') {
      hudLabel = `SIGNAL · ${viewModel.signalQualityLabel}`;
      hudValue  = viewModel.trustScoreFormatted;
    }
  }

  // Position: upper-right of bounding box, never over eyes/mouth
  const hudLeft = viewModel?.faceBounds
    ? Math.min((viewModel.faceBounds.x + viewModel.faceBounds.width + 0.03) * 100, 76)
    : 0;
  const hudTop = viewModel?.faceBounds
    ? Math.max((viewModel.faceBounds.y + 0.05) * 100, 6)
    : 0;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="scan-hud"
            initial={{ opacity: 0, scale: 0.85, y: -4 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.85, y: -4 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30, mass: 0.75 }}
            className="absolute"
            style={{ left: `${hudLeft}%`, top: `${hudTop}%` }}
          >
            {/* ── Hex-ish scan panel ── */}
            <div
              className="relative flex items-center gap-2 px-3 py-2"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.70) 0%, rgba(8,30,40,0.65) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(34,211,238,0.28)',
                borderRadius: '6px 14px 6px 14px', // subtle hex feel
                boxShadow: '0 0 18px rgba(34,211,238,0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              {/* Corner tick — top-left */}
              <span
                className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/60"
                style={{ borderRadius: '0 0 4px 0' }}
              />
              {/* Corner tick — bottom-right */}
              <span
                className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/60"
                style={{ borderRadius: '4px 0 0 0' }}
              />

              {/* Rotating hex ring icon */}
              <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
                <motion.svg
                  viewBox="0 0 24 24"
                  className="absolute inset-0 w-full h-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                >
                  <polygon
                    points="12,2 20,7 20,17 12,22 4,17 4,7"
                    fill="none"
                    stroke="rgba(34,211,238,0.45)"
                    strokeWidth="1"
                  />
                </motion.svg>
                {/* Pulse dot */}
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              {/* Text block */}
              <div className="flex flex-col leading-none min-w-[70px]">
                <span
                  className="text-[8px] font-semibold tracking-[0.18em] uppercase"
                  style={{ color: 'rgba(34,211,238,0.80)' }}
                >
                  {hudLabel}
                </span>
                <motion.span
                  key={hudValue}
                  initial={{ opacity: 0.4, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-sm font-bold font-mono text-white mt-0.5"
                >
                  {hudValue}
                </motion.span>
              </div>
            </div>

            {/* Connector line from panel toward face centre */}
            <svg
              className="absolute"
              style={{ top: '50%', right: '100%', transform: 'translateY(-50%)', overflow: 'visible', width: 20, height: 1 }}
            >
              <line
                x1="0" y1="0" x2="20" y2="0"
                stroke="rgba(34,211,238,0.30)"
                strokeWidth="1"
                strokeDasharray="3 2"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
