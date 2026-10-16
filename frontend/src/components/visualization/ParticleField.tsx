import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  baseRadius: number;
  speedY: number;
  driftSpeed: number;
  driftPhase: number;
  driftAmp: number;
  colorRgb: string;
  baseAlpha: number;
  layer: number;
  parallaxFactor: number;
  twinkle: boolean;
  twinkleSpeed: number;
  twinklePhase: number;
}

const PARTICLE_COUNT = 100;

// Curated palette of faint cyan, light sky blue, and blue-white tints
const COLOR_PALETTE = [
  '34, 211, 238',  // vibrant cyan glow
  '186, 230, 253', // soft sky blue
  '224, 242, 254', // icy blue-white
  '240, 249, 255', // crisp blue-white
  '147, 197, 253', // gentle periwinkle-blue
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

    // Parallax tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    // Check prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;

    // Helper to generate a particle in one of 3 depth layers
    const createParticle = (w: number, h: number, initialYRandom = true): Particle => {
      // Depth layer distribution:
      // ~50% Far (layer 0): small, dim, slow
      // ~35% Mid (layer 1): medium
      // ~15% Near (layer 2): larger, brighter, faster
      const rand = Math.random();
      let layer = 0;
      let baseRadius = 0.8;
      let baseAlpha = 0.18;
      let speedY = 0.22;
      let parallaxFactor = 0.015;

      if (rand > 0.85) {
        // Layer 2 - Near
        layer = 2;
        baseRadius = 1.9 + Math.random() * 0.8; // 1.9 - 2.7px
        baseAlpha = 0.35 + Math.random() * 0.18; // 0.35 - 0.53 (faint, not distracting)
        speedY = 0.65 + Math.random() * 0.35;    // 0.65 - 1.00 px/frame
        parallaxFactor = 0.07;
      } else if (rand > 0.50) {
        // Layer 1 - Mid
        layer = 1;
        baseRadius = 1.2 + Math.random() * 0.5; // 1.2 - 1.7px
        baseAlpha = 0.22 + Math.random() * 0.14; // 0.22 - 0.36
        speedY = 0.35 + Math.random() * 0.22;    // 0.35 - 0.57 px/frame
        parallaxFactor = 0.035;
      } else {
        // Layer 0 - Far
        layer = 0;
        baseRadius = 0.6 + Math.random() * 0.4; // 0.6 - 1.0px
        baseAlpha = 0.12 + Math.random() * 0.10; // 0.12 - 0.22
        speedY = 0.15 + Math.random() * 0.15;    // 0.15 - 0.30 px/frame
        parallaxFactor = 0.012;
      }

      const colorRgb = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
      const twinkle = Math.random() < 0.28; // ~28% gentle twinkle

      return {
        x: Math.random() * w,
        y: initialYRandom ? Math.random() * h : h + 10,
        baseRadius,
        speedY,
        driftSpeed: 0.0008 + Math.random() * 0.0012,
        driftPhase: Math.random() * Math.PI * 2,
        driftAmp: 0.2 + Math.random() * 0.35,
        colorRgb,
        baseAlpha,
        layer,
        parallaxFactor,
        twinkle,
        twinkleSpeed: 0.002 + Math.random() * 0.0025,
        twinklePhase: Math.random() * Math.PI * 2,
      };
    };

    let particles: Particle[] = [];

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

      // Re-initialize particles if empty, or wrap existing ones inside viewport
      if (particles.length === 0) {
        particles = Array.from({ length: PARTICLE_COUNT }, () => createParticle(width, height, true));
      } else {
        particles.forEach((p) => {
          if (p.x > width) p.x = Math.random() * width;
          if (p.y > height) p.y = Math.random() * height;
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

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          // Drift upward
          p.y -= p.speedY;

          // Subtle horizontal sine wobble
          p.x += Math.sin(time * p.driftSpeed + p.driftPhase) * p.driftAmp;

          // Wrap around top boundary
          if (p.y < -15) {
            p.y = height + 15;
            p.x = Math.random() * width;
          }
          // Wrap horizontal boundaries
          if (p.x < -20) p.x = width + 20;
          else if (p.x > width + 20) p.x = -20;
        }

        // Apply depth-dependent parallax offset
        const parallaxX = currentMouseX * p.parallaxFactor * 45;
        const parallaxY = currentMouseY * p.parallaxFactor * 30;

        const renderX = p.x + parallaxX;
        const renderY = p.y + parallaxY;

        // Twinkle calculation
        let alpha = p.baseAlpha;
        if (p.twinkle && !prefersReducedMotion) {
          const twinkleFactor = 0.65 + 0.35 * Math.sin(time * p.twinkleSpeed + p.twinklePhase);
          alpha = p.baseAlpha * twinkleFactor;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(renderX, renderY, p.baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.colorRgb}, ${alpha.toFixed(3)})`;
        ctx.fill();

        // Extra faint outer glow for Near layer particles
        if (p.layer === 2) {
          ctx.beginPath();
          ctx.arc(renderX, renderY, p.baseRadius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.colorRgb}, ${(alpha * 0.2).toFixed(3)})`;
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

    // Parallax mousemove listener
    const onMouseMove = (e: MouseEvent) => {
      // Normalize to [-1, 1] relative to viewport center
      targetMouseX = (e.clientX / width - 0.5) * 2;
      targetMouseY = (e.clientY / height - 0.5) * 2;
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
    document.addEventListener('visibilitychange', onVisibilityChange);
    motionQuery.addEventListener('change', onMotionChange);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
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
