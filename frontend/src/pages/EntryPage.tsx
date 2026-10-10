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
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      
      <div className="w-64 h-64 mb-8">
        <AIFace mode="idle" />
      </div>

      <h1 className="text-4xl md:text-6xl font-mono-data font-bold text-cyan-glow text-glow-cyan tracking-[0.2em] mb-4">
        PULSEVIBE
      </h1>
      
      <p className="text-white/50 max-w-md mb-12 text-sm tracking-wide leading-relaxed">
        Contactless heart-rate estimation via AI computer vision and remote photoplethysmography (rPPG).
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button size="lg" onClick={() => navigate('/measure')} className="w-full sm:w-auto">
          INITIALIZE VISION CORE
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate('/history')} className="w-full sm:w-auto">
          VIEW HISTORY
        </Button>
      </div>
      
    </div>
  );
}
