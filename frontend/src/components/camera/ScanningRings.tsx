import { motion, AnimatePresence } from 'framer-motion';
import { useEngineStore } from '../../stores/useEngineStore';
import { useSettingsStore } from '../../stores/useSettingsStore';

export function ScanningRings() {
  const trackingState = useEngineStore((state) => state.viewModel?.trackingState);
  const faceBounds = useEngineStore((state) => state.viewModel?.faceBounds);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);

  if (reducedMotion || !faceBounds) return null;

  const isLocking = trackingState === 'detected' || trackingState === 'locking';

  // Position rings at center of face bounds
  const top = `${(faceBounds.y + faceBounds.height / 2) * 100}%`;
  const left = `${(faceBounds.x + faceBounds.width / 2) * 100}%`;

  return (
    <AnimatePresence>
      {isLocking && (
        <div 
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 mix-blend-screen"
          style={{ top, left }}
        >
          {/* Outer Ring */}
          <motion.div
            initial={{ scale: 3, opacity: 0, rotate: 0 }}
            animate={{ scale: 1.5, opacity: 0.3, rotate: 180 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-cyan-glow border-dashed"
          />
          
          {/* Inner Ring */}
          <motion.div
            initial={{ scale: 2, opacity: 0, rotate: 90 }}
            animate={{ scale: 1, opacity: 0.8, rotate: -90 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 15, delay: 0.1 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-cyan-glow border-t-transparent glow-cyan"
          />
          
          {/* Target Reticle */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4"
          >
            <div className="w-full h-full relative">
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] -translate-x-1/2 bg-cyan-glow" />
              <div className="absolute left-0 right-0 top-1/2 h-[1px] -translate-y-1/2 bg-cyan-glow" />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
