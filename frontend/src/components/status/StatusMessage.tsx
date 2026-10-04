import { motion } from 'framer-motion';
import type { StatusMessage } from '../../types';
import { cn } from '../../lib/cn';

export function StatusMessageItem({ message }: { message: StatusMessage }) {
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });

  const colorMap = {
    info: 'text-cyan-glow/60',
    success: 'text-green-ok/80',
    warning: 'text-amber-warn/80',
    error: 'text-red-alert/90',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex text-[11px] font-mono-data leading-relaxed tracking-wider"
    >
      <span className="text-white/30 mr-2 shrink-0">[{time}]</span>
      <span className={cn(colorMap[message.type])}>
        {message.text}
        {message.id === 'latest' && <span className="animate-typewriter-blink ml-1">_</span>}
      </span>
    </motion.div>
  );
}
