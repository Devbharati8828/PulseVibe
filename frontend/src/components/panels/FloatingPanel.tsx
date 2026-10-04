import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface FloatingPanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function FloatingPanel({ title, children, className, delay = 0 }: FloatingPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        delay 
      }}
      className={cn("glass-panel relative flex flex-col overflow-hidden", className)}
    >
      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-glow/50" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-glow/50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-glow/50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-glow/50" />

      {title && (
        <div className="px-3 py-1.5 border-b border-white/[0.05] bg-white/[0.02]">
          <span className="font-mono-data text-[10px] uppercase tracking-widest text-white/50">
            {title}
          </span>
        </div>
      )}
      
      <div className="flex-1 p-4 relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
