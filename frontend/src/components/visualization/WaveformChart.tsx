import { useEngineStore } from '../../stores/useEngineStore';
import { FloatingPanel } from '../panels/FloatingPanel';
import { GlowingLine } from './GlowingLine';

export function WaveformChart() {
  const viewModel = useEngineStore((state) => state.viewModel);
  const isReliable = viewModel && viewModel.trustScore >= 0.4;
  
  // Use a fallback empty array if no data
  const data = viewModel?.filteredWaveform || [];

  return (
    <FloatingPanel title="LIVE rPPG SIGNAL" className="h-48 w-full">
      <div className="relative w-full h-full">
        {data.length > 0 ? (
          <GlowingLine 
            data={data} 
            color={isReliable ? '#22d3ee' : '#f59e0b'} // cyan or amber
            glowIntensity={isReliable ? 16 : 8}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono-data text-xs text-white/30 uppercase tracking-widest">
              Awaiting Signal Data
            </span>
          </div>
        )}
        
        {/* Subtle grid/axis overlay */}
        <div className="absolute inset-0 pointer-events-none border-t border-b border-surface-800" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-surface-800 border-dashed" />
      </div>
    </FloatingPanel>
  );
}
