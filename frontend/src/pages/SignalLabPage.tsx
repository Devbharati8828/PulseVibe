import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { SignalLab } from '../components/visualization/SignalLab';

export default function SignalLabPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="sticky top-0 z-50 bg-surface-950/80 backdrop-blur-md px-8 py-4 border-b border-surface-800 flex justify-between items-center">
        <Button variant="ghost" onClick={() => navigate('/measure')}>
          ← BACK TO SCANNER
        </Button>
      </div>

      <div className="flex-1 py-8">
        <SignalLab />
      </div>
    </div>
  );
}
