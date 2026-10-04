import { create } from 'zustand';
import type { PulseViewModel } from '../adapters/types.js';
import type { EngineResult } from '../features/measurement/measurement.types.js';
import type { RPPGAlgorithm } from '../features/rppg/rppg.types.js';
import type { PulseSession } from '../types/index.js';

interface EngineState {
  // Engine UI State
  isRunning: boolean;
  activeAlgorithm: RPPGAlgorithm;
  
  // Data
  viewModel: PulseViewModel | null;
  bpmHistory: number[];
  
  // Session management
  currentSession: PulseSession | null;
  sessionHistory: PulseSession[];
  
  // Actions
  setEngineRunning: (running: boolean) => void;
  setAlgorithm: (algo: RPPGAlgorithm) => void;
  updateViewModel: (vm: PulseViewModel | null) => void;
  startSession: () => void;
  endSession: () => void;
  reset: () => void;
}

export const useEngineStore = create<EngineState>((set) => ({
  isRunning: false,
  activeAlgorithm: 'CHROM',
  viewModel: null,
  bpmHistory: [],
  
  currentSession: null,
  sessionHistory: [],

  setEngineRunning: (running) => set({ isRunning: running }),
  setAlgorithm: (algo) => set({ activeAlgorithm: algo }),
  updateViewModel: (vm) => set((state) => {
    let newHistory = state.bpmHistory;
    if (vm && vm.bpm && vm.bpm > 0 && vm.trustScore >= 0.4) {
      newHistory = [...state.bpmHistory, vm.bpm].slice(-300);
    }
    return {
      viewModel: vm,
      bpmHistory: newHistory,
    };
  }),
  
  startSession: () => set(() => ({
    currentSession: {
      id: crypto.randomUUID(),
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      avgBpm: 0,
      avgTrust: 0,
      signalQuality: 'fair'
    }
  })),
  
  endSession: () => set((state) => {
    if (!state.currentSession) return state;
    const endedSession = {
      ...state.currentSession,
      endTime: Date.now(),
      duration: Date.now() - state.currentSession.startTime,
      avgBpm: state.viewModel?.bpm ?? 0,
      avgTrust: state.viewModel?.trustScore ?? 0,
      signalQuality: state.viewModel?.signalQuality ?? 'poor'
    };
    return {
      currentSession: null,
      sessionHistory: [endedSession, ...state.sessionHistory]
    };
  }),
  
  reset: () => set({ viewModel: null, bpmHistory: [], isRunning: false }),
}));
