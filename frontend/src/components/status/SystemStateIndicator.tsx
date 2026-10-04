import { motion, AnimatePresence } from 'framer-motion';
import { Search, Lock, Activity, AlertTriangle, Play } from 'lucide-react';
import { useEngineStore } from '../../stores/useEngineStore';
import { cn } from '../../lib/cn';
import type { TrackingState } from '../../engine/types';

export function SystemStateIndicator() {
  const trackingState = useEngineStore((state) => state.viewModel?.trackingState || 'idle');
  const label = useEngineStore((state) => state.viewModel?.trackingStateLabel || 'SYSTEM IDLE');

  const getConfig = (state: TrackingState) => {
    switch (state) {
      case 'idle':
        return { icon: Play, color: 'text-surface-700', bg: 'bg-surface-800' };
      case 'scanning':
      case 'detected':
        return { icon: Search, color: 'text-cyan-glow', bg: 'bg-cyan-glow/10 border border-cyan-glow/30' };
      case 'locking':
      case 'locked':
        return { icon: Lock, color: 'text-cyan-glow glow-cyan', bg: 'bg-cyan-glow/20 border border-cyan-glow/50' };
      case 'acquiring':
      case 'processing':
        return { icon: Activity, color: 'text-amber-warn glow-amber', bg: 'bg-amber-warn/10 border border-amber-warn/30' };
      case 'stabilized':
        return { icon: Activity, color: 'text-green-ok', bg: 'bg-green-ok/20 border border-green-ok/50' };
      case 'lost':
        return { icon: AlertTriangle, color: 'text-red-alert', bg: 'bg-red-alert/20 border border-red-alert/50' };
      default:
        return { icon: Play, color: 'text-surface-700', bg: 'bg-surface-800' };
    }
  };

  const config = getConfig(trackingState);
  const Icon = config.icon;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={trackingState}
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          className={cn(
            "flex items-center space-x-2 px-3 py-1.5 rounded-full backdrop-blur-md",
            config.bg
          )}
        >
          <Icon className={cn("w-3 h-3", config.color)} />
          <span className={cn("text-[10px] font-mono-data font-bold tracking-widest", config.color)}>
            {label}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
