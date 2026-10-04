import { useEffect, useState } from 'react';

export function HUDFrame() {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {/* Top Left Bracket */}
      <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-cyan-glow opacity-50" />
      
      {/* Top Right Bracket */}
      <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-cyan-glow opacity-50" />
      
      {/* Bottom Left Bracket */}
      <div className="absolute bottom-12 left-4 w-12 h-12 border-b-2 border-l-2 border-cyan-glow opacity-50" />
      
      {/* Bottom Right Bracket */}
      <div className="absolute bottom-12 right-4 w-12 h-12 border-b-2 border-r-2 border-cyan-glow opacity-50" />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-8 bg-gradient-to-b from-surface-950/80 to-transparent">
        <div className="flex flex-col">
          <span className="text-cyan-glow font-mono-data tracking-[0.2em] text-sm text-glow-cyan font-bold">
            PULSEVIBE // VISION CORE
          </span>
          <span className="text-white/30 font-mono-data text-[10px] tracking-widest mt-1">
            v1.0.0-EXPERIMENTAL
          </span>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-cyan-glow animate-pulse-glow" />
            <span className="font-mono-data text-cyan-glow text-xs tracking-wider">ONLINE</span>
          </div>
          <span className="font-mono-data text-white/70 text-sm tracking-wider">
            {time}
          </span>
        </div>
      </div>

      {/* Scan Line Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(34,211,238,0.05)_50%,transparent_100%)] h-[10vh] animate-scan-line" />
    </div>
  );
}
