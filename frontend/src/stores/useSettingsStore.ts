import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  cameraDeviceId: string;
  algorithm: 'green' | 'chrom' | 'pos';
  simulationMode: boolean;
  reducedMotion: boolean;
  showFaceMesh: boolean;
  showROIRegions: boolean;
  
  setCameraDeviceId: (id: string) => void;
  setAlgorithm: (algo: 'green' | 'chrom' | 'pos') => void;
  setSimulationMode: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setShowFaceMesh: (enabled: boolean) => void;
  setShowROIRegions: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cameraDeviceId: '',
      algorithm: 'chrom',
      simulationMode: false, // Default off, user must enable
      reducedMotion: false,
      showFaceMesh: true,
      showROIRegions: true,

      setCameraDeviceId: (id) => set({ cameraDeviceId: id }),
      setAlgorithm: (algo) => set({ algorithm: algo }),
      setSimulationMode: (enabled) => set({ simulationMode: enabled }),
      setReducedMotion: (enabled) => set({ reducedMotion: enabled }),
      setShowFaceMesh: (enabled) => set({ showFaceMesh: enabled }),
      setShowROIRegions: (enabled) => set({ showROIRegions: enabled }),
    }),
    {
      name: 'pulsevibe-settings',
    }
  )
);
