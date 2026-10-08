import { ReactNode } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface CameraViewProps {
  children?: ReactNode; // For overlay components
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function CameraView({ children, videoRef }: CameraViewProps) {
  const isSimulation = useSettingsStore((state) => state.simulationMode);

  // In a real app, this would use the useCamera hook to bind the stream to videoRef.
  // For the frontend-only mockup, we just show a placeholder if in simulation mode.

  return (
    <div className="relative w-full h-full bg-surface-900 rounded-lg overflow-hidden border border-surface-800">
      
      {!isSimulation ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-x-[-1]"
          playsInline
          muted
          autoPlay
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-surface-950">
          <span className="font-mono-data text-white/20 text-sm tracking-widest uppercase">
            Simulation Mode Active
          </span>
          <span className="font-mono-data text-white/10 text-xs mt-2">
            No Camera Feed
          </span>
        </div>
      )}

      {/* Overlays (Canvas HUD, ROI, etc.) */}
      <div className="absolute inset-0 pointer-events-none">
        {children}
      </div>

    </div>
  );
}
