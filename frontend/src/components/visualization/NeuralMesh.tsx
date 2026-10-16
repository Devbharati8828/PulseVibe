import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  colorRgb: string;
  baseAlpha: number;
  pulse: boolean;
  pulseSpeed: number;
  pulsePhase: number;
}

interface Signal {
  fromIndex: number;
  toIndex: number;
  progress: number;
  speed: number;
  colorRgb: string;
}

const NODE_COUNT = 50;
const MAX_CONNECTION_DIST = 150;
const MAX_SIGNALS = 3;

// Palette of faint cybernetic cyan, icy blue, and crisp blue-white
const NODE_COLORS = [
  '34, 211, 238',  // cyan
  '186, 230, 253', // soft sky blue
  '224, 242, 254', // icy blue-white
  '147, 197, 253', // gentle blue
  '240, 249, 255', // crisp white-blue
];

export function NeuralMesh() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number | null = null;
    let isPaused = false;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Prefers-reduced-motion detection
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;

    // Dynamic orb exclusion / attenuation zone
    // On the landing page, the orb is horizontally centered and placed in the upper-middle
    let orbCenterX = 0;
    let orbCenterY = 0;
    let orbInnerRadius = 100;
    let orbOuterRadius = 240;

    const updateOrbZone = (w: number, h: number) => {
      orbCenterX = w / 2;
      // Orb is centered vertically around 36% down from top
      orbCenterY = h * 0.36;
      orbInnerRadius = Math.min(w, h) * 0.14;
      orbOuterRadius = Math.min(w, h) * 0.28;
    };

    // Calculate attenuation factor (0 = completely clear near orb center, 1 = full opacity far away)
    const getOrbAttenuation = (x: number, y: number): number => {
      const dx = x - orbCenterX;
      const dy = y - orbCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= orbInnerRadius) return 0.05;
      if (dist >= orbOuterRadius) return 1.0;
      // Smooth cubic ease between inner and outer boundary
      const t = (dist - orbInnerRadius) / (orbOuterRadius - orbInnerRadius);
      return 0.05 + 0.95 * (t * t * (3 - 2 * t));
    };

    // Create a node
    const createNode = (w: number, h: number): Node => {
      // Very slow drift speed between 0.08 and 0.22 px/frame
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.08 + Math.random() * 0.14;
      const pulse = Math.random() < 0.26; // ~26% of nodes gently pulse

      return {
        x: Math.random() * (w - 40) + 20,
        y: Math.random() * (h - 40) + 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        baseRadius: 1.1 + Math.random() * 0.9, // 1.1 - 2.0px
        colorRgb: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
        baseAlpha: 0.22 + Math.random() * 0.18, // 0.22 - 0.40
        pulse,
        pulseSpeed: 0.0018 + Math.random() * 0.0022,
        pulsePhase: Math.random() * Math.PI * 2,
      };
    };

    let nodes: Node[] = [];
    let signals: Signal[] = [];
    let lastSignalSpawnTime = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      updateOrbZone(width, height);

      if (nodes.length === 0) {
        nodes = Array.from({ length: NODE_COUNT }, () => createNode(width, height));
      } else {
        nodes.forEach((n) => {
          if (n.x > width - 20) n.x = width - 30;
          if (n.y > height - 20) n.y = height - 30;
        });
      }
    };

    resize();

    // Spawn a signal pulse between two connected nodes
    const maybeSpawnSignal = (time: number) => {
      if (prefersReducedMotion || signals.length >= MAX_SIGNALS) return;
      if (time - lastSignalSpawnTime < 1800) return; // cooldown

      // Find valid connected node pairs
      const validPairs: { i: number; j: number }[] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 30 && dist < MAX_CONNECTION_DIST) {
            // Prefer pairs with good visibility
            const att = Math.min(
              getOrbAttenuation(nodes[i].x, nodes[i].y),
              getOrbAttenuation(nodes[j].x, nodes[j].y),
            );
            if (att > 0.35) {
              validPairs.push({ i, j });
            }
          }
        }
      }

      if (validPairs.length > 0) {
        const pair = validPairs[Math.floor(Math.random() * validPairs.length)];
        const flip = Math.random() > 0.5;
        signals.push({
          fromIndex: flip ? pair.i : pair.j,
          toIndex: flip ? pair.j : pair.i,
          progress: 0,
          speed: 0.007 + Math.random() * 0.008, // smooth traversal
          colorRgb: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
        });
        lastSignalSpawnTime = time;
      }
    };

    // Render frame
    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // 1. Update node positions & soft boundary reflection
      if (!prefersReducedMotion) {
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          n.x += n.vx;
          n.y += n.vy;

          // Soft bounce at edges
          if (n.x < 15) {
            n.x = 15;
            n.vx = Math.abs(n.vx);
          } else if (n.x > width - 15) {
            n.x = width - 15;
            n.vx = -Math.abs(n.vx);
          }

          if (n.y < 15) {
            n.y = 15;
            n.vy = Math.abs(n.vy);
          } else if (n.y > height - 15) {
            n.y = height - 15;
            n.vy = -Math.abs(n.vy);
          }
        }

        maybeSpawnSignal(time);
      }

      // Pre-compute node screen positions and orb attenuation
      const nodeData = new Array(nodes.length);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const orbAtt = getOrbAttenuation(n.x, n.y);
        nodeData[i] = { x: n.x, y: n.y, att: orbAtt };
      }

      // 2. Draw connecting lines
      ctx.lineWidth = 0.65;
      for (let i = 0; i < nodes.length; i++) {
        const na = nodes[i];
        const da = nodeData[i];

        for (let j = i + 1; j < nodes.length; j++) {
          const nb = nodes[j];
          const db = nodeData[j];

          const dx = db.x - da.x;
          const dy = db.y - da.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_CONNECTION_DIST) {
            // Opacity fades with distance (1 at 0 dist -> 0 at MAX_CONNECTION_DIST)
            const distFade = 1 - dist / MAX_CONNECTION_DIST;
            // Combined orb clearance attenuation
            const combinedOrbAtt = Math.min(da.att, db.att);
            // Ultra-subtle line opacity (capped at ~0.14)
            const lineAlpha = distFade * 0.14 * combinedOrbAtt;

            if (lineAlpha > 0.005) {
              ctx.beginPath();
              ctx.moveTo(da.x, da.y);
              ctx.lineTo(db.x, db.y);
              ctx.strokeStyle = `rgba(${na.colorRgb}, ${lineAlpha.toFixed(3)})`;
              ctx.stroke();
            }
          }
        }
      }

      // 3. Draw active signals traveling along lines
      if (!prefersReducedMotion) {
        for (let sIdx = signals.length - 1; sIdx >= 0; sIdx--) {
          const sig = signals[sIdx];
          sig.progress += sig.speed;

          if (sig.progress >= 1.0) {
            signals.splice(sIdx, 1);
            continue;
          }

          const na = nodes[sig.fromIndex];
          const nb = nodes[sig.toIndex];
          if (!na || !nb) continue;

          // Check if nodes are still connected
          const dx = nb.x - na.x;
          const dy = nb.y - na.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > MAX_CONNECTION_DIST * 1.1) {
            signals.splice(sIdx, 1);
            continue;
          }

          // Interpolate current signal position
          const p = sig.progress;
          const sx = na.x + dx * p;
          const sy = na.y + dy * p;

          // Parabolic fade at endpoints (0 at start/end, peak at middle)
          const endpointFade = Math.sin(p * Math.PI);
          const orbAtt = getOrbAttenuation(sx, sy);
          const sigAlpha = endpointFade * 0.45 * orbAtt;

          if (sigAlpha > 0.01) {
            // Faint traveling pulse dot
            ctx.beginPath();
            ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${sig.colorRgb}, ${sigAlpha.toFixed(3)})`;
            ctx.fill();

            // Tiny outer glow for pulse
            ctx.beginPath();
            ctx.arc(sx, sy, 3.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${sig.colorRgb}, ${(sigAlpha * 0.25).toFixed(3)})`;
            ctx.fill();
          }
        }
      }

      // 4. Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const d = nodeData[i];

        // Soft pulse calculation
        let radius = n.baseRadius;
        let alpha = n.baseAlpha * d.att;

        if (n.pulse && !prefersReducedMotion) {
          const pulseFactor = 0.75 + 0.25 * Math.sin(time * n.pulseSpeed + n.pulsePhase);
          alpha *= pulseFactor;
          radius *= 0.9 + 0.2 * pulseFactor;
        }

        if (alpha > 0.01) {
          // Core node
          ctx.beginPath();
          ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${n.colorRgb}, ${alpha.toFixed(3)})`;
          ctx.fill();

          // Soft halo for pulsing nodes
          if (n.pulse && d.att > 0.4) {
            ctx.beginPath();
            ctx.arc(d.x, d.y, radius * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${n.colorRgb}, ${(alpha * 0.18).toFixed(3)})`;
            ctx.fill();
          }
        }
      }
    };

    // Animation loop
    const loop = (time: number) => {
      if (isPaused) return;

      render(time);

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    if (prefersReducedMotion) {
      render(0);
    } else {
      animationFrameId = requestAnimationFrame(loop);
    }

    // Visibility change handler (pause when tab is hidden)
    const onVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      } else {
        isPaused = false;
        if (!prefersReducedMotion && animationFrameId === null) {
          animationFrameId = requestAnimationFrame(loop);
        }
      }
    };

    // Reduced motion preference handler
    const onMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
      if (prefersReducedMotion) {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        render(0);
      } else if (!isPaused && animationFrameId === null) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    motionQuery.addEventListener('change', onMotionChange);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionQuery.removeEventListener('change', onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
