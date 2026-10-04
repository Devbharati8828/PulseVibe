import { TriangleAlert } from 'lucide-react';

export function MedicalDisclaimer() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-950/90 border-t border-surface-800 backdrop-blur-md">
      <div className="container mx-auto px-4 h-10 flex items-center justify-center space-x-3 text-white/50">
        <TriangleAlert size={14} className="text-amber-warn/70" />
        <span className="text-[11px] font-medium tracking-wide uppercase">
          PulseVibe is an experimental prototype — not a medical device. Not for diagnosis, treatment, or emergency decisions.
        </span>
      </div>
    </div>
  );
}
