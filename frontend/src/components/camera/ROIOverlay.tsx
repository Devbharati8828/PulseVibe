import { useEffect, useRef } from 'react';
import { useEngineStore } from '../../stores/useEngineStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { LANDMARK_INDICES } from '../../features/roi/ROIEngine';

export function ROIOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewModel = useEngineStore((state) => state.viewModel);
  const showROIRegions = useSettingsStore((state) => state.showROIRegions);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let pulsePhase = 0;

    const render = () => {
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!viewModel || !showROIRegions || !viewModel.roiRegions) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const { trackingState } = viewModel;
      if (trackingState === 'idle' || trackingState === 'scanning' || trackingState === 'detected') {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      pulsePhase += 0.05;
      const alpha = 0.1 + Math.sin(pulsePhase) * 0.05;
      
      const { landmarks, roiRegions } = viewModel;

      if (landmarks && landmarks.length > 0) {
        const regionsToDraw = [
          { name: 'Forehead', indices: LANDMARK_INDICES.FOREHEAD, labelRegion: roiRegions.find((r: any) => r.name === 'Forehead') },
          { name: 'Left Cheek', indices: LANDMARK_INDICES.LEFT_CHEEK, labelRegion: roiRegions.find((r: any) => r.name === 'Left Cheek') },
          { name: 'Right Cheek', indices: LANDMARK_INDICES.RIGHT_CHEEK, labelRegion: roiRegions.find((r: any) => r.name === 'Right Cheek') },
        ];

        regionsToDraw.forEach(region => {
          if (!region.labelRegion) return;
          
          const validIndices = region.indices.filter(i => i < landmarks.length);
          if (validIndices.length === 0) return;

          const pts = validIndices.map(i => ({ x: landmarks[i].x * w, y: landmarks[i].y * h }));

          // Draw connecting mesh lines
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
            // Add cross connections for a "mesh" look
            if (i > 2 && i % 3 === 0) {
              ctx.lineTo(pts[i - 2].x, pts[i - 2].y);
              ctx.moveTo(pts[i].x, pts[i].y);
            }
          }
          ctx.closePath();

          ctx.strokeStyle = `rgba(34, 211, 238, ${alpha * 4})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();

          // Draw glowing dots
          ctx.fillStyle = `rgba(34, 211, 238, ${alpha * 8 + 0.2})`;
          pts.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          });

          // Label
          if (region.labelRegion && region.labelRegion.points && region.labelRegion.points.length > 0) {
            const minX = Math.min(...region.labelRegion.points.map((p: any) => p.x * w));
            const minY = Math.min(...region.labelRegion.points.map((p: any) => p.y * h));
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '10px "JetBrains Mono"';
            ctx.fillText(region.name.toUpperCase(), minX, minY - 4);
          }
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [viewModel, showROIRegions]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
    />
  );
}
