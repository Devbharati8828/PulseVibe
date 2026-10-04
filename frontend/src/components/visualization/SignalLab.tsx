import { useEngineStore } from '../../stores/useEngineStore';
import { WaveformChart } from './WaveformChart';
import { FFTSpectrumChart } from './FFTSpectrumChart';
import type { RPPGAlgorithm } from '../../features/rppg/rppg.types';

const ALGORITHMS: { key: RPPGAlgorithm; label: string; desc: string }[] = [
  { key: 'CHROM', label: 'CHROM', desc: 'Chrominance (de Haan 2013)' },
  { key: 'POS',   label: 'POS',   desc: 'Plane Orthogonal to Skin (Wang 2017)' },
  { key: 'GREEN', label: 'GREEN', desc: 'Green Channel (baseline)' },
];

export function SignalLab() {
  const isRunning       = useEngineStore((state) => state.isRunning);
  const viewModel       = useEngineStore((state) => state.viewModel);
  const activeAlgorithm = useEngineStore((state) => state.activeAlgorithm);
  const setAlgorithm    = useEngineStore((state) => state.setAlgorithm);

  // Show offline screen only when engine is not running AND no data exists
  const isOffline    = !isRunning && !viewModel;
  const isWarmingUp  = isRunning && !viewModel;

  if (isOffline) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full border border-surface-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-cyan-glow font-mono-data tracking-widest uppercase text-sm">
          Signal Lab Offline
        </span>
        <span className="text-white/40 text-xs text-center max-w-xs">
          Go to the scanner, start a measurement, then return here to view live signal analysis.
        </span>
      </div>
    );
  }

  const bpm         = viewModel?.bpm;
  const trustScore  = viewModel?.trustScore ?? 0;
  const quality     = viewModel?.signalQuality ?? 'poor';
  const qualityColor = viewModel?.signalQualityColor ?? 'text-red-400';
  const qualityLabel = viewModel?.signalQualityLabel ?? '—';
  const domFreq     = viewModel?.dominantFrequency;

  return (
    <div className="flex flex-col space-y-6 w-full max-w-5xl mx-auto p-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-surface-800 pb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-mono-data text-white font-bold tracking-widest">SIGNAL LAB</h2>
          <p className="text-xs text-white/50 mt-1">
            {isWarmingUp ? (
              <span className="text-amber-400 animate-pulse">● Warming up — acquiring signal...</span>
            ) : (
              <span className="text-emerald-400">● Live — real-time pipeline analysis</span>
            )}
          </p>
        </div>

        {/* ── Algorithm Selector (FUNCTIONAL) ── */}
        <div className="flex bg-surface-900 border border-surface-800 rounded p-1 gap-1">
          {ALGORITHMS.map((algo) => {
            const isActive = activeAlgorithm === algo.key;
            return (
              <button
                key={algo.key}
                title={algo.desc}
                onClick={() => setAlgorithm(algo.key)}
                className={`px-4 py-1.5 text-xs font-mono-data rounded transition-all duration-200 ${
                  isActive
                    ? 'bg-surface-800 text-cyan-glow shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                    : 'text-white/40 hover:text-white/80 hover:bg-surface-800/50'
                }`}
              >
                {algo.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Live Metric Badges ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* BPM */}
        <div className="flex flex-col items-center justify-center bg-surface-900 border border-surface-800 rounded-lg px-4 py-3 gap-1">
          <span className="text-[10px] font-mono-data text-white/40 uppercase tracking-widest">Heart Rate</span>
          <span className={`text-3xl font-mono-data font-bold ${bpm && bpm > 0 ? 'text-cyan-glow' : 'text-white/20'}`}>
            {bpm && bpm > 0 ? Math.round(bpm) : '—'}
          </span>
          <span className="text-[9px] text-white/30 font-mono-data">BPM</span>
        </div>

        {/* Trust */}
        <div className="flex flex-col items-center justify-center bg-surface-900 border border-surface-800 rounded-lg px-4 py-3 gap-1">
          <span className="text-[10px] font-mono-data text-white/40 uppercase tracking-widest">Trust Score</span>
          <span className={`text-3xl font-mono-data font-bold ${
            trustScore >= 0.8 ? 'text-emerald-400' :
            trustScore >= 0.6 ? 'text-cyan-400' :
            trustScore >= 0.4 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {isWarmingUp ? '—' : `${Math.round(trustScore * 100)}`}
          </span>
          <span className="text-[9px] text-white/30 font-mono-data">%</span>
        </div>

        {/* Signal Quality */}
        <div className="flex flex-col items-center justify-center bg-surface-900 border border-surface-800 rounded-lg px-4 py-3 gap-1">
          <span className="text-[10px] font-mono-data text-white/40 uppercase tracking-widest">Signal Quality</span>
          <span className={`text-xl font-mono-data font-bold uppercase ${qualityColor}`}>
            {isWarmingUp ? '—' : qualityLabel}
          </span>
          <span className="text-[9px] text-white/30 font-mono-data">RATING</span>
        </div>

        {/* Dominant Frequency */}
        <div className="flex flex-col items-center justify-center bg-surface-900 border border-surface-800 rounded-lg px-4 py-3 gap-1">
          <span className="text-[10px] font-mono-data text-white/40 uppercase tracking-widest">Dominant Freq</span>
          <span className={`text-3xl font-mono-data font-bold ${domFreq && domFreq > 0 ? 'text-purple-400' : 'text-white/20'}`}>
            {domFreq && domFreq > 0 ? domFreq.toFixed(2) : '—'}
          </span>
          <span className="text-[9px] text-white/30 font-mono-data">Hz</span>
        </div>
      </div>

      {/* ── Algorithm Info Banner ── */}
      <div className="flex items-center gap-3 bg-surface-900/60 border border-surface-800 rounded-lg px-4 py-2">
        <span className="text-[10px] font-mono-data text-white/30 uppercase tracking-widest">Active Algorithm:</span>
        <span className="text-xs font-mono-data text-cyan-glow font-semibold">{activeAlgorithm}</span>
        <span className="text-[10px] font-mono-data text-white/30">
          — {ALGORITHMS.find(a => a.key === activeAlgorithm)?.desc}
        </span>
      </div>

      {/* ── Live Signal Charts ── */}
      <WaveformChart />
      <FFTSpectrumChart />

      {/* ── Warming Up Banner ── */}
      {isWarmingUp && (
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-4 text-center">
          <p className="text-amber-400 font-mono-data text-xs tracking-widest animate-pulse uppercase">
            ⏳ Acquiring signal — keep face in frame and stay still...
          </p>
        </div>
      )}

    </div>
  );
}
