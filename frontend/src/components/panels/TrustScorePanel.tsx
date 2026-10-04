import { useEngineStore } from '../../stores/useEngineStore';
import { FloatingPanel } from './FloatingPanel';

export function TrustScorePanel() {
  const viewModel = useEngineStore((state) => state.viewModel);
  
  const score = viewModel?.trustScore || 0;
  const percentage = viewModel?.trustScoreFormatted || '0%';
  const label = viewModel?.signalQualityLabel || 'AWAITING SIGNAL';
  const colorClass = viewModel?.signalQualityColor || 'text-surface-700';

  // SVG arc calculation
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - score * circumference;

  let strokeColor = '#1e293b'; // surface-700
  if (score > 0.7) strokeColor = '#10b981'; // green-ok
  else if (score > 0.4) strokeColor = '#f59e0b'; // amber-warn
  else if (score > 0) strokeColor = '#ef4444'; // red-alert

  return (
    <FloatingPanel title="TRUST SCORE" delay={0.2} className="min-w-[200px]">
      <div className="flex flex-col items-center py-2">
        
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Background Ring */}
          <svg className="absolute inset-0 transform -rotate-90" width="96" height="96">
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              className="text-surface-800"
            />
            {/* Foreground Ring */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke={strokeColor}
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
              style={{ filter: `drop-shadow(0 0 4px ${strokeColor}40)` }}
            />
          </svg>
          
          <span className="font-mono-data text-2xl font-medium text-white/90">
            {percentage}
          </span>
        </div>

        <div className="mt-4 flex flex-col items-center">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono-data mb-1">
            Signal Quality
          </span>
          <span className={`text-xs font-bold tracking-wider ${colorClass} transition-colors duration-300`}>
            {label}
          </span>
        </div>

      </div>
    </FloatingPanel>
  );
}
