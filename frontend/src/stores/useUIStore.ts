import { create } from 'zustand';
import type { StatusMessage, StatusMessageType, PanelId } from '../types';
import { CONSTANTS } from '../lib/constants';

interface UIState {
  statusMessages: StatusMessage[];
  visiblePanels: Set<PanelId>;
  visionCoreState: 'idle' | 'active' | 'warning';
  
  addStatus: (text: string, type?: StatusMessageType) => void;
  togglePanel: (id: PanelId) => void;
  setVisionCoreState: (state: 'idle' | 'active' | 'warning') => void;
}

export const useUIStore = create<UIState>((set) => ({
  statusMessages: [],
  visiblePanels: new Set(['bpm', 'trust', 'quality', 'stats', 'log']),
  visionCoreState: 'idle',

  addStatus: (text, type = 'info') => set((state) => {
    const newMessage: StatusMessage = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      text,
      type
    };
    const messages = [...state.statusMessages, newMessage].slice(-CONSTANTS.MAX_STATUS_LOG_ENTRIES);
    return { statusMessages: messages };
  }),

  togglePanel: (id) => set((state) => {
    const newVisible = new Set(state.visiblePanels);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    return { visiblePanels: newVisible };
  }),

  setVisionCoreState: (visionCoreState) => set({ visionCoreState }),
}));
