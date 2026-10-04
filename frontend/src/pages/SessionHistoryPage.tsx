import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/useSessionStore';
import { Button } from '../components/ui/button';
import { FloatingPanel } from '../components/panels/FloatingPanel';
import { formatDuration } from '../lib/formatters';

export default function SessionHistoryPage() {
  const navigate = useNavigate();
  const history = useSessionStore((state) => state.history);
  const loadHistory = useSessionStore((state) => state.loadHistory);
  const deleteSession = useSessionStore((state) => state.deleteSession);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const qualityConfig: Record<string, { label: string; className: string }> = {
    excellent: { label: 'EXCELLENT', className: 'text-emerald-400 border-emerald-400/50 bg-emerald-400/10' },
    good:      { label: 'GOOD',      className: 'text-cyan-400 border-cyan-400/50 bg-cyan-400/10' },
    fair:      { label: 'FAIR',      className: 'text-amber-400 border-amber-400/50 bg-amber-400/10' },
    poor:      { label: 'POOR',      className: 'text-red-400 border-red-400/50 bg-red-400/10' },
  };

  return (
    <div className="container mx-auto px-4 max-w-4xl flex flex-col space-y-6 pb-12">

      {/* Header */}
      <div className="flex justify-between items-center border-b border-surface-800 pb-4 pt-2">
        <div>
          <h2 className="text-2xl font-mono-data text-white font-bold tracking-widest text-glow-cyan">
            SESSION ARCHIVE
          </h2>
          <p className="text-xs text-white/50 mt-1 uppercase tracking-wider">
            {history.length === 0 ? 'No records' : `${history.length} session${history.length !== 1 ? 's' : ''} stored locally`}
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← RETURN TO CORE
        </Button>
      </div>

      {/* Empty state */}
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-full border border-surface-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="font-mono-data text-white/30 text-sm tracking-widest uppercase">
            No Records Found
          </span>
          <p className="text-white/20 text-xs text-center max-w-xs">
            Complete a measurement session to see your history here. Sessions are saved locally in your browser.
          </p>
          <Button onClick={() => navigate('/measure')} className="mt-2">
            Start a Measurement
          </Button>
        </div>
      ) : (
        <div className="flex flex-col space-y-3">
          {history.map((session, idx) => {
            const qc = qualityConfig[session.signalQuality] ?? qualityConfig.poor;
            const bpmValid = session.avgBpm > 0;

            return (
              <FloatingPanel key={session.id} className="w-full">
                <div className="flex items-center justify-between gap-4 flex-wrap">

                  {/* Left: index + date */}
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-xs font-mono-data text-white/20 shrink-0">
                      #{String(history.length - idx).padStart(3, '0')}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Date</span>
                      <span className="font-mono-data text-sm text-white whitespace-nowrap">
                        {new Date(session.startTime).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Middle metrics */}
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Duration</span>
                      <span className="font-mono-data text-cyan-glow font-semibold">
                        {formatDuration(session.duration)}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Avg BPM</span>
                      <span className={`font-mono-data text-2xl font-bold ${bpmValid ? 'text-white' : 'text-white/20'}`}>
                        {bpmValid ? session.avgBpm.toFixed(0) : '—'}
                      </span>
                    </div>

                    {bpmValid && (
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Range</span>
                        <span className="font-mono-data text-sm text-white/60">
                          {session.minBpm.toFixed(0)} – {session.maxBpm.toFixed(0)}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col items-center">
                      <span className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Trust</span>
                      <span className="font-mono-data text-sm text-emerald-400">
                        {(session.avgTrust * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Right: quality badge + delete */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-bold tracking-widest px-2.5 py-1 border rounded ${qc.className}`}>
                      {qc.label}
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteSession(session.id)}
                    >
                      DELETE
                    </Button>
                  </div>

                </div>
              </FloatingPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
