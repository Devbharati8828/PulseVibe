import { useEngineStore } from '../../stores/useEngineStore';
import { FloatingPanel } from '../panels/FloatingPanel';

export function FFTSpectrumChart() {
  const viewModel = useEngineStore((state) => state.viewModel);
  
  const spectrum = viewModel?.spectrum || [];
  const dominantFreq = viewModel?.dominantFrequency || 0;
  
  // Filter to valid display range (0 to 4 Hz)
  const displaySpectrum = spectrum.filter(bin => bin.frequency <= 4.0);
  
  return (
    <FloatingPanel title="FREQUENCY SPECTRUM (FFT)" className="h-48 w-full">
      <div className="relative w-full h-full flex items-end justify-between px-2 pt-4 pb-6">
        
        {displaySpectrum.length > 0 ? (
          displaySpectrum.map((bin, i) => {
            // Normalize height (very rough mapping for UI purposes)
            const height = Math.min(100, (bin.magnitude / 100) * 100);
            
            // Is this bin in the valid human HR range (0.7 - 4.0 Hz)?
            const isValidRange = bin.frequency >= 0.7 && bin.frequency <= 4.0;
            
            // Is this the dominant peak?
            const isDominant = Math.abs(bin.frequency - dominantFreq) < 0.1 && dominantFreq > 0;
            
            return (
              <div 
                key={i}
                className={`w-1 rounded-t-sm transition-all duration-300 ${
                  isDominant ? 'bg-cyan-glow glow-cyan z-10' : 
                  isValidRange ? 'bg-cyan-glow/40' : 
                  'bg-surface-700/50'
                }`}
                style={{ height: `${Math.max(2, height)}%` }}
              >
                {/* Tooltip/Label for dominant peak */}
                {isDominant && (
                  <div className="absolute top-0 -translate-x-1/2 whitespace-nowrap bg-surface-900 border border-cyan-glow/30 px-1.5 py-0.5 rounded text-[9px] font-mono-data text-cyan-glow">
                    {bin.frequency.toFixed(2)}Hz
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono-data text-xs text-white/30 uppercase tracking-widest">
              Processing FFT Buffer
            </span>
          </div>
        )}
        
        {/* X-Axis labels */}
        <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[9px] font-mono-data text-white/30">
          <span>0 Hz</span>
          <span>1 Hz (60 BPM)</span>
          <span>2 Hz (120 BPM)</span>
          <span>3 Hz</span>
          <span>4 Hz</span>
        </div>
        
        {/* Valid range background highlight (0.7 - 4.0 Hz) */}
        {/* Assuming linear scale 0-4Hz */}
        <div 
          className="absolute top-4 bottom-6 bg-cyan-glow/5 border-l border-r border-cyan-glow/20 pointer-events-none"
          style={{ 
            left: `${(0.7 / 4.0) * 100}%`, 
            width: `${((4.0 - 0.7) / 4.0) * 100}%` 
          }}
        />
        
      </div>
    </FloatingPanel>
  );
}
