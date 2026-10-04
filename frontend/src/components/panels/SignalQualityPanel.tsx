import { useEngineStore } from '../../stores/useEngineStore';
import { FloatingPanel } from './FloatingPanel';

export function SignalQualityPanel() {
  const viewModel = useEngineStore((state) => state.viewModel);
  
  const regions = viewModel?.roiRegions || [];
  
  // Need to pass signalStrength through from engine to adapter. 
  // For now, we'll mock the region strengths based on trust score for visualization.
  const trust = viewModel?.trustScore || 0;
  
  const regionData = [
    { name: 'FOREHEAD', strength: trust * 0.95, isPrimary: true },
    { name: 'L CHEEK', strength: trust * 0.75, isPrimary: false },
    { name: 'R CHEEK', strength: trust * 0.85, isPrimary: false },
  ];

  return (
    <FloatingPanel title="REGION ANALYSIS" delay={0.3} className="w-full">
      <div className="flex flex-col space-y-3 py-2">
        {regionData.map((region) => (
          <div key={region.name} className="flex items-center text-xs font-mono-data">
            <div className="w-20 text-white/50 tracking-wider">
              {region.name}
            </div>
            <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden mx-3">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  region.strength > 0.8 ? 'bg-cyan-glow glow-cyan' : 
                  region.strength > 0.5 ? 'bg-amber-warn' : 
                  'bg-red-alert'
                }`}
                style={{ width: `${Math.max(5, region.strength * 100)}%` }}
              />
            </div>
            <div className="w-12 text-right text-white/30">
              {region.isPrimary && <span className="text-cyan-glow text-[9px] border border-cyan-glow/30 px-1 rounded">PRI</span>}
            </div>
          </div>
        ))}
      </div>
    </FloatingPanel>
  );
}
