import { Heart, Activity } from 'lucide-react';
import { useEngineStore } from '../../stores/useEngineStore';
import { FloatingPanel } from './FloatingPanel';
import { cn } from '../../lib/cn';

export function BPMPanel() {
  const viewModel = useEngineStore((state) => state.viewModel);
  const isRunning = useEngineStore((state) => state.isRunning);

  const bpm = viewModel?.bpm;
  const trustScore = viewModel?.trustScore ?? 0;
  const trackingState = viewModel?.trackingState;

  // Determine display state
  const hasValidBpm = bpm !== null && bpm > 0;
  const isReliable = trustScore >= 0.4; // Show BPM at 40%+ confidence
  const isWarming = isRunning && !hasValidBpm;
  const isHigh = hasValidBpm && bpm > 100;
  const isLow = hasValidBpm && bpm < 60;

  // Only show the number when trust is 40%+
  const bpmDisplay = (hasValidBpm && isReliable) ? Math.round(bpm!).toString() : '—';
  const animationDuration = (hasValidBpm && isReliable && bpm! > 0) ? `${60 / bpm!}s` : '1s';

  // Status label below the number
  let statusLabel = 'AWAITING SIGNAL';
  if (!isRunning) statusLabel = 'ENGINE OFF';
  else if (trackingState === 'NO_FACE') statusLabel = 'NO FACE DETECTED';
  else if (trackingState === 'DETECTED' || trackingState === 'TRACKING') statusLabel = 'ACQUIRING SIGNAL…';
  else if (trackingState === 'STABILIZING') statusLabel = 'STABILIZING…';
  else if (isWarming) statusLabel = 'WARMING UP…';
  else if (hasValidBpm && !isReliable) statusLabel = 'LOW CONFIDENCE';
  else if (hasValidBpm && isReliable && trustScore < 0.6) statusLabel = 'FAIR CONFIDENCE';
  else if (hasValidBpm && trustScore >= 0.6 && trustScore < 0.8) statusLabel = 'GOOD CONFIDENCE';
  else if (hasValidBpm && trustScore >= 0.8) statusLabel = 'HIGH CONFIDENCE';

  return (
    <FloatingPanel title="HEART RATE" delay={0.1} className="min-w-[200px]">
      <div className="flex flex-col items-center justify-center py-4 gap-2">
        <div className="flex items-center space-x-3">
          <Heart
            className={cn(
              "w-6 h-6 transition-colors duration-500",
              !isRunning ? "text-white/20" :
              !hasValidBpm ? "text-white/30" :
              isHigh || isLow ? "text-amber-400" :
              isReliable ? "text-cyan-400" : "text-cyan-400/60"
            )}
            style={{
              animation: hasValidBpm ? `pulse-glow ${animationDuration} ease-in-out infinite` : 'none'
            }}
          />
          <span
            className={cn(
              "text-6xl font-mono-data font-bold tracking-tighter transition-colors duration-300",
              !isRunning ? "text-white/20" :
              !hasValidBpm ? "text-white/25" :
              isHigh || isLow ? "text-amber-400" :
              isReliable ? "text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" :
              "text-cyan-400/70"
            )}
          >
            {bpmDisplay}
          </span>
        </div>

        {/* Trust bar */}
        {isRunning && (
          <div className="w-full px-2 mt-1">
            <div className="flex justify-between text-[9px] font-mono-data text-white/30 mb-0.5">
              <span>CONFIDENCE</span>
              <span>{Math.round(trustScore * 100)}%</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  trustScore >= 0.8 ? "bg-emerald-400" :
                  trustScore >= 0.6 ? "bg-cyan-400" :
                  trustScore >= 0.4 ? "bg-amber-400" : "bg-white/30"
                )}
                style={{ width: `${Math.round(trustScore * 100)}%` }}
              />
            </div>
          </div>
        )}

        <span className="text-[10px] font-mono-data uppercase tracking-[0.25em] text-white/40">
          {statusLabel}
        </span>
      </div>
    </FloatingPanel>
  );
}
