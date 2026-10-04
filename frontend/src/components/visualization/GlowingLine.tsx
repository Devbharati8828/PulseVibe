import { useEffect, useRef } from 'react';

interface GlowingLineProps {
  data: number[];
  color?: string; // hex or rgba
  glowIntensity?: number;
  lineWidth?: number;
  height?: number; // optionally force height, otherwise uses parent container
}

export function GlowingLine({ 
  data, 
  color = '#22d3ee', // cyan-glow
  glowIntensity = 12, 
  lineWidth = 2 
}: GlowingLineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Handle resize
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!data || data.length === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const margin = 10;
      
      // Auto-scale Y axis
      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = (max - min) || 1; // avoid div by 0

      // Map data to coordinates
      const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * w;
        const normalizedY = (val - min) / range;
        // Invert Y because canvas 0 is top
        const y = margin + (1 - normalizedY) * (h - margin * 2); 
        return { x, y };
      });

      // Pass 1: Glow (thick, blurred)
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        // Simple linear interpolation (can use bezier for smoothing later)
        ctx.lineTo(points[i].x, points[i].y);
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      
      ctx.shadowColor = color;
      ctx.shadowBlur = glowIntensity;
      ctx.stroke();
      
      // Pass 2: Core (sharp, bright)
      ctx.shadowBlur = 0;
      ctx.lineWidth = lineWidth * 0.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Pass 3: Fill gradient below line
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, `${color}40`); // 25% opacity approx
      gradient.addColorStop(1, 'transparent');
      
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fillStyle = gradient;
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [data, color, glowIntensity, lineWidth]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
    />
  );
}
