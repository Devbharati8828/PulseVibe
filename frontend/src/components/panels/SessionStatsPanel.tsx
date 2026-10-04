import { useSessionStore } from '../../stores/useSessionStore';
import { FloatingPanel } from './FloatingPanel';
import { formatDuration } from '../../lib/formatters';

export function SessionStatsPanel() {
  const currentSession = useSessionStore((state) => state.currentSession);
  
  if (!currentSession) {
    return null; // Don't show if not actively measuring
  }

  const bpms = currentSession.bpmSamples.map(s => s.bpm);
  const avg = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : 0;
  const min = bpms.length ? Math.round(Math.min(...bpms)) : 0;
  const max = bpms.length ? Math.round(Math.max(...bpms)) : 0;
  
  // Calculate duration locally to avoid rapid state updates in the store just for the clock
  const durationMs = performance.now() - currentSession.startTime;

  return (
    <FloatingPanel title="SESSION STATS" delay={0.4} className="w-full">
      <div className="grid grid-cols-4 gap-4 py-2 text-center font-mono-data">
        
        <div className="flex flex-col">
          <span className="text-[9px] text-white/40 mb-1 tracking-widest">DURATION</span>
          <span className="text-cyan-glow">{formatDuration(durationMs)}</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-[9px] text-white/40 mb-1 tracking-widest">AVG</span>
          <span className="text-white/90">{avg || '—'}</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-[9px] text-white/40 mb-1 tracking-widest">MIN</span>
          <span className="text-white/60">{min || '—'}</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-[9px] text-white/40 mb-1 tracking-widest">MAX</span>
          <span className="text-white/60">{max || '—'}</span>
        </div>

      </div>
    </FloatingPanel>
  );
}
