import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { AIFace } from '../components/ai-face/AIFace';
import { ParticleField } from '../components/visualization/ParticleField';
import { useEngineStore } from '../stores/useEngineStore';
import { useEffect } from 'react';

export default function EntryPage() {
  const navigate = useNavigate();
  const reset = useEngineStore((state) => state.reset);
  
  useEffect(() => {
    reset(); // Ensure engine is reset on entry
  }, [reset]);

  return (
    <>
      <ParticleField />
      <div className="relative z-10 flex flex-col items-center justify-center h-[calc(100dvh-6.5rem)] max-h-[calc(100dvh-6.5rem)] text-center px-4 overflow-hidden">
      
      {/* Orb — tightened scale: fits compact laptops through large displays */}
      <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-52 md:h-52 lg:w-56 lg:h-56 mb-2 sm:mb-3 md:mb-4 shrink-0">
        <AIFace mode="idle" />
      </div>

      {/* Title — tightened margin and line-height */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-mono-data font-bold text-cyan-glow text-glow-cyan tracking-[0.2em] leading-tight mb-2 md:mb-2.5 shrink-0">
        PULSEVIBE
      </h1>
      
      {/* Tagline — tightened margin from mb-12 down to mb-5/mb-6 */}
      <p className="text-white/55 max-w-md mb-5 md:mb-6 text-xs sm:text-sm tracking-wide leading-relaxed shrink-0">
        Contactless heart-rate estimation via AI computer vision and remote photoplethysmography (rPPG).
      </p>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0">
        <Button size="lg" onClick={() => navigate('/measure')} className="w-full sm:w-auto">
          INITIALIZE VISION CORE
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate('/history')} className="w-full sm:w-auto">
          VIEW HISTORY
        </Button>
      </div>
      
    </div>
    </>
  );
}
