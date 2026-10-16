import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  colorRgb: string;
  baseAlpha: number;
  pulseSpeed: number;
  pulsePhase: number;
  layer: number;
  parallaxFactor: number;
}

const NODE_COUNT = 85;
const MAX_CONNECT_DIST = 120;
const MAX_CONNECT_DIST_SQ = MAX_CONNECT_DIST * MAX_CONNECT_DIST;

// Faint cyan, soft electric blue, and crisp blue-white tints for neural junctions
const COLOR_PALETTE = [
  '34, 211, 238',  // cyber cyan
  '56, 189, 248',  // sky electric blue
  '125, 211, 252', // soft celestial blue
  '224, 242, 254', // icy blue-white
];

export function ParticleField() {
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

    // Mouse parallax tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    // Mouse proximity tracking (in screen coordinates)
    let mouseScreenX = -9999;
    let mouseScreenY = -9999;
    let mouseActive = false;
    let mouseTimeout: any = null;

    // Check prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;

    // Helper to generate a neural node
    const createNode = (w: number, h: number): Node => {
      const rand = Math.random();
      let layer = 0;
      let baseRadius = 1.0;
      let baseAlpha = 0.22;
      let vy = -(0.12 + Math.random() * 0.16); // slow upward drift
      let vx = (Math.random() - 0.5) * 0.12;   // subtle horizontal drift
      let parallaxFactor = 0.015;

      if (rand > 0.70) {
        // Foreground junction — slightly brighter, pulses visibly
        layer = 2;
        baseRadius = 1.8 + Math.random() * 0.6;
        baseAlpha = 0.40 + Math.random() * 0.15;
        vy = -(0.25 + Math.random() * 0.25);
        parallaxFactor = 0.045;
      } else if (rand > 0.35) {
        // Midground junction
        layer = 1;
        baseRadius = 1.2 + Math.random() * 0.4;
        baseAlpha = 0.25 + Math.random() * 0.12;
        vy = -(0.18 + Math.random() * 0.18);
        parallaxFactor = 0.025;
      } else {
        // Deep background junction — faint, slow
        layer = 0;
        baseRadius = 0.8 + Math.random() * 0.3;
        baseAlpha = 0.14 + Math.random() * 0.08;
        vy = -(0.10 + Math.random() * 0.12);
        parallaxFactor = 0.012;
      }

      const colorRgb = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];

      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx,
        vy,
        baseRadius,
        colorRgb,
        baseAlpha,
        pulseSpeed: 0.0015 + Math.random() * 0.002,
        pulsePhase: Math.random() * Math.PI * 2,
        layer,
        parallaxFactor,
      };
    };

    let nodes: Node[] = [];

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

      // Re-initialize or clamp nodes
      if (nodes.length === 0) {
        nodes = Array.from({ length: NODE_COUNT }, () => createNode(width, height));
      } else {
        nodes.forEach((n) => {
          if (n.x > width) n.x = Math.random() * width;
          if (n.y > height) n.y = Math.random() * height;
        });
      }
    };

    resize();

    // Render a single frame
    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse parallax interpolation
      currentMouseX += (targetMouseX - currentMouseX) * 0.04;
      currentMouseY += (targetMouseY - currentMouseY) * 0.04;

      // Temporary arrays to hold calculated render positions
      const renderedPositions: { x: number; y: number; alpha: number; pulse: number; node: Node }[] = [];

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        if (!prefersReducedMotion) {
          // Continuous slow drift
          n.x += n.vx;
          n.y += n.vy;

          // Wrap top boundary
          if (n.y < -15) {
            n.y = height + 15;
            n.x = Math.random() * width;
          }
          // Wrap horizontal boundaries
          if (n.x < -20) n.x = width + 20;
          else if (n.x > width + 20) n.x = -20;
        }

        // Apply depth-dependent parallax offset
        const renderX = n.x + currentMouseX * n.parallaxFactor * 40;
        const renderY = n.y + currentMouseY * n.parallaxFactor * 25;

        // Gentle pulse calculation
        const pulse = prefersReducedMotion
          ? 1.0
          : 0.75 + 0.25 * Math.sin(time * n.pulseSpeed + n.pulsePhase);

        const currentAlpha = n.baseAlpha * pulse;

        renderedPositions.push({
          x: renderX,
          y: renderY,
          alpha: currentAlpha,
          pulse,
          node: n,
        });
      }

      // ── 1. Draw connecting circuit/neural mesh lines between nearby nodes ────
      ctx.lineWidth = 0.75;
      const count = renderedPositions.length;

      for (let i = 0; i < count; i++) {
        const p1 = renderedPositions[i];

        for (let j = i + 1; j < count; j++) {
          const p2 = renderedPositions[j];

          const dx = p2.x - p1.x;
          // Quick bounding box check before calculating square distance
          if (Math.abs(dx) > MAX_CONNECT_DIST) continue;

          const dy = p2.y - p1.y;
          if (Math.abs(dy) > MAX_CONNECT_DIST) continue;

          const distSq = dx * dx + dy * dy;
          if (distSq < MAX_CONNECT_DIST_SQ) {
            const dist = Math.sqrt(distSq);
            // Proximity ratio (1.0 = right next to each other, 0.0 = at threshold)
            const proximity = 1 - dist / MAX_CONNECT_DIST;

            // Faint opacity so the mesh never competes with the central AI face orb
            const lineAlpha = proximity * 0.11 * ((p1.alpha + p2.alpha) / 2);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(34, 211, 238, ${lineAlpha.toFixed(4)})`;
            ctx.stroke();
          }
        }

        // Optional subtle interactive line to mouse cursor if within range
        if (mouseActive) {
          const mdx = mouseScreenX - p1.x;
          const mdy = mouseScreenY - p1.y;
          if (Math.abs(mdx) < 130 && Math.abs(mdy) < 130) {
            const mDistSq = mdx * mdx + mdy * mdy;
            if (mDistSq < 130 * 130) {
              const mDist = Math.sqrt(mDistSq);
              const mProximity = 1 - mDist / 130;
              const mLineAlpha = mProximity * 0.14;

              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(mouseScreenX, mouseScreenY);
              ctx.strokeStyle = `rgba(56, 189, 248, ${mLineAlpha.toFixed(4)})`;
              ctx.stroke();
            }
          }
        }
      }

      // ── 2. Draw neural junction nodes and pulsing glow cores ─────────────────
      for (let i = 0; i < count; i++) {
        const p = renderedPositions[i];
        const n = p.node;

        // Central junction point
        ctx.beginPath();
        ctx.arc(p.x, p.y, n.baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.colorRgb}, ${p.alpha.toFixed(3)})`;
        ctx.fill();

        // Pulsing halo at connection nexus (layers 1 & 2)
        if (n.layer > 0) {
          const haloRadius = n.baseRadius * (1.8 + p.pulse * 0.8);
          const haloAlpha = p.alpha * 0.18;

          ctx.beginPath();
          ctx.arc(p.x, p.y, haloRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${n.colorRgb}, ${haloAlpha.toFixed(3)})`;
          ctx.fill();
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

    // Start loop or render static if reduced motion
    if (prefersReducedMotion) {
      render(0);
    } else {
      animationFrameId = requestAnimationFrame(loop);
    }

    // Mousemove listener for parallax & proximity
    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / width - 0.5) * 2;
      targetMouseY = (e.clientY / height - 0.5) * 2;
      mouseScreenX = e.clientX;
      mouseScreenY = e.clientY;
      mouseActive = true;

      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(() => {
        mouseActive = false;
      }, 2500);
    };

    const onMouseLeave = () => {
      mouseActive = false;
      targetMouseX = 0;
      targetMouseY = 0;
    };

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

    // Reduced motion preference change handler
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
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    motionQuery.addEventListener('change', onMotionChange);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      clearTimeout(mouseTimeout);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
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
