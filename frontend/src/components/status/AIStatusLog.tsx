import { useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { StatusMessageItem } from './StatusMessage';
import { FloatingPanel } from '../panels/FloatingPanel';

export function AIStatusLog() {
  const messages = useUIStore((state) => state.statusMessages);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <FloatingPanel title="SYSTEM LOG" delay={0.5} className="h-48">
      <div className="h-full overflow-y-auto pr-2 custom-scrollbar flex flex-col space-y-1">
        {messages.length === 0 ? (
          <div className="text-xs font-mono-data text-white/20 mt-auto">Waiting for events...</div>
        ) : (
          messages.map((msg) => (
            <StatusMessageItem key={msg.id} message={msg} />
          ))
        )}
        <div ref={endRef} />
      </div>
    </FloatingPanel>
  );
}
