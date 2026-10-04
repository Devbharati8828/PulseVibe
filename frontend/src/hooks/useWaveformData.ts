import { useState, useEffect } from 'react';
import { useEngineStore } from '../stores/useEngineStore';
import { CONSTANTS } from '../lib/constants';

export function useWaveformData() {
  const viewModel = useEngineStore((state) => state.viewModel);
  const isRunning = useEngineStore((state) => state.isRunning);
  
  const [data, setData] = useState<number[]>([]);

  useEffect(() => {
    if (!isRunning) {
      setData([]);
      return;
    }

    if (viewModel && viewModel.filteredWaveform.length > 0) {
      // In a real app, we'd append to a rolling buffer.
      // Since the engine mock returns the full buffer each frame, we just use it directly.
      // However, we want it to look like it's scrolling, so we might slice it or 
      // rely on the engine to provide a rolling window. 
      // The mock currently returns an empty array, so let's generate a fake rolling window
      // if it's empty and we are simulating, just to show the chart working.
      
      if (viewModel.isSimulation && viewModel.filteredWaveform.every(v => v === 0)) {
        // Generate a fake scrolling waveform for visual testing
        const t = performance.now() / 1000;
        const freq = (viewModel.bpm || 72) / 60;
        const newData = Array(100).fill(0).map((_, i) => {
          const timeOffset = t - (100 - i) * 0.03; // ~30fps
          const pulse = Math.sin(timeOffset * freq * Math.PI * 2);
          const dicroic = Math.sin(timeOffset * freq * Math.PI * 2 + Math.PI / 4) * 0.3;
          const noise = (Math.random() - 0.5) * 0.1;
          return pulse + dicroic + noise;
        });
        setData(newData);
      } else {
        setData(viewModel.filteredWaveform);
      }
    }
  }, [viewModel, isRunning]);

  return data;
}
