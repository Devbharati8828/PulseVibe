import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEngine } from '../hooks/useEngine';
import { useEngineStore } from '../stores/useEngineStore';
import { CameraView } from '../components/camera/CameraView';
import { FaceTrackingHUD } from '../components/camera/FaceTrackingHUD';
import { ROIOverlay } from '../components/camera/ROIOverlay';
import { ScanningRings } from '../components/camera/ScanningRings';
import { TrackingStatus } from '../components/camera/TrackingStatus';
import { AIFace } from '../components/ai-face/AIFace';
import { BPMPanel } from '../components/panels/BPMPanel';
import { TrustScorePanel } from '../components/panels/TrustScorePanel';
import { SignalQualityPanel } from '../components/panels/SignalQualityPanel';
import { SessionStatsPanel } from '../components/panels/SessionStatsPanel';
import { AIStatusLog } from '../components/status/AIStatusLog';
import { SystemStateIndicator } from '../components/status/SystemStateIndicator';
import { WaveformChart } from '../components/visualization/WaveformChart';
import { FFTSpectrumChart } from '../components/visualization/FFTSpectrumChart';
import { Button } from '../components/ui/button';
import { useSessionRecorder } from '../hooks/useSessionRecorder';

export default function MeasurementPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { start, stop } = useEngine(videoRef);
  const isRunning = useEngineStore((state) => state.isRunning);
  
  // Start session recording automatically
  useSessionRecorder();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return (
    <div className="flex flex-col h-full px-4 md:px-8 space-y-4 md:space-y-6">
      
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← ABORT
        </Button>
        
        <div className="flex space-x-4">
          {!isRunning ? (
            <Button onClick={start}>ENGAGE SCANNER</Button>
          ) : (
            <Button variant="destructive" onClick={() => stop()}>HALT</Button>
          )}
          <Button variant="outline" onClick={() => navigate('/lab')}>SIGNAL LAB</Button>
        </div>
      </div>

      <SystemStateIndicator />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 flex-1 min-h-0">
        
        {/* Left Column - Camera & HUD (Spans 7 cols on desktop) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex-1 relative rounded-lg overflow-hidden border border-surface-700 min-h-[300px]">
            <CameraView videoRef={videoRef}>
              <FaceTrackingHUD />
              <ROIOverlay />
              <ScanningRings />
              <TrackingStatus />
            </CameraView>
          </div>
          <AIStatusLog />
        </div>

        {/* Right Column - Data Panels (Spans 5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          
          {/* Top Row: Vision Core + BPM + Trust */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div className="col-span-2 sm:col-span-1 relative flex items-center justify-center bg-surface-900 rounded-lg border border-surface-800">
              <div className="absolute inset-0 pointer-events-none">
                <AIFace />
              </div>
              <span className="relative z-10 text-[10px] font-mono-data text-white/30 uppercase tracking-widest mt-auto mb-4">
                AI PERSONA
              </span>
            </div>
            
            <div className="col-span-2 sm:col-span-1 flex flex-col space-y-4">
              <BPMPanel />
              <TrustScorePanel />
            </div>
          </div>

          <SignalQualityPanel />
          <SessionStatsPanel />
          
        </div>
      </div>

      {/* Bottom Row - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 shrink-0">
        <WaveformChart />
        <FFTSpectrumChart />
      </div>

    </div>
  );
}
