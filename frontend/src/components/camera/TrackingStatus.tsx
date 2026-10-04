import { motion, AnimatePresence } from 'framer-motion';
import { useEngineStore } from '../../stores/useEngineStore';

export function TrackingStatus() {
  const viewModel = useEngineStore((state) => state.viewModel);
  const faceBounds = viewModel?.faceBounds;
  const confidence = viewModel?.faceConfidence || 0;
  const trackingState = viewModel?.trackingState;

  if (!faceBounds || trackingState === 'idle' || trackingState === 'scanning') {
    return null;
  }

  // Position to the right of the face bounds
  const left = `${(faceBounds.x + faceBounds.width) * 100 + 2}%`;
  const top = `${faceBounds.y * 100}%`;

  const isLocked = trackingState === 'locked' || trackingState === 'acquiring' || trackingState === 'processing' || trackingState === 'stabilized';
  
  const labelColor = isLocked ? 'text-cyan-glow glow-cyan' : 'text-amber-warn glow-amber';
  const labelText = isLocked ? 'LOCKED' : 'TRACKING';

  return (
    <AnimatePresence>
      <motion.div
        layoutId="tracking-status"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        className="absolute flex flex-col pointer-events-none"
        style={{ left, top }}
      >
        <span className={`font-mono-data text-[10px] font-bold tracking-widest ${labelColor}`}>
          [{labelText}]
        </span>
        <span className="font-mono-data text-[9px] text-white/50 tracking-wider mt-0.5">
          CONF: {Math.round(confidence * 100)}%
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
