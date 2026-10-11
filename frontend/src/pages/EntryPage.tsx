import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { AIFace } from '../components/ai-face/AIFace';
import { useEngineStore } from '../stores/useEngineStore';
import { useEffect } from 'react';

export default function EntryPage() {
  const navigate = useNavigate();
  const reset = useEngineStore((state) => state.reset);
  
  useEffect(() => {
    reset(); // Ensure engine is reset on entry
  }, [reset]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-center px-4 overflow-hidden -translate-y-3 sm:-translate-y-6 select-none">
      
      {/* 3D AI Persona Orb */}
      <div className="w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 mb-3 sm:mb-4 shrink-0">
        <AIFace mode="idle" />
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-mono-data font-bold text-cyan-glow text-glow-cyan tracking-[0.2em] mb-2 shrink-0">
        PULSEVIBE
      </h1>
      
      {/* Subtitle */}
      <p className="text-white/60 max-w-md mb-6 sm:mb-8 text-xs sm:text-sm tracking-wide leading-relaxed px-2 shrink-0">
        Contactless heart-rate estimation via AI computer vision and remote photoplethysmography (rPPG).
      </p>

      {/* Actions: INITIALIZE VISION CORE & VIEW HISTORY */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0 z-20">
        <Button
          size="lg"
          onClick={() => navigate('/measure')}
          className="w-full sm:w-auto font-mono-data tracking-wider px-6 sm:px-8 shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25"
        >
          INITIALIZE VISION CORE
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => navigate('/history')}
          className="w-full sm:w-auto font-mono-data tracking-wider px-6 sm:px-8 border-surface-700 hover:border-cyan-glow/50"
        >
          VIEW HISTORY
        </Button>
      </div>
      
    </div>
  );
}
