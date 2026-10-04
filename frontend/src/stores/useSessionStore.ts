import { create } from 'zustand';
import type { SessionRecord } from '../types';
import { db } from '../lib/db';
import { sessionsApi } from '../lib/api/sessionsApi';

interface ActiveSessionData {
  startTime: number;
  bpmSamples: { t: number; bpm: number }[];
  trustSamples: number[];
}

interface SessionState {
  currentSession: ActiveSessionData | null;
  history: SessionRecord[];
  
  startSession: () => void;
  recordSample: (bpm: number, trust: number) => void;
  endSession: () => Promise<SessionRecord | null>;
  loadHistory: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  history: [],

  startSession: () => {
    set({
      currentSession: {
        startTime: performance.now(),
        bpmSamples: [],
        trustSamples: [],
      }
    });
  },

  recordSample: (bpm, trust) => {
    set((state) => {
      if (!state.currentSession || trust < 0.6 || bpm === 0) return state;

      const t = performance.now() - state.currentSession.startTime;
      return {
        currentSession: {
          ...state.currentSession,
          bpmSamples: [...state.currentSession.bpmSamples, { t, bpm }],
          trustSamples: [...state.currentSession.trustSamples, trust],
        }
      };
    });
  },

  endSession: async () => {
    const { currentSession } = get();
    if (!currentSession || currentSession.bpmSamples.length === 0) {
      set({ currentSession: null });
      return null;
    }

    const { bpmSamples, trustSamples, startTime } = currentSession;
    const bpms = bpmSamples.map(s => s.bpm);
    
    const avgBpm = bpms.reduce((a, b) => a + b, 0) / bpms.length;
    const minBpm = Math.min(...bpms);
    const maxBpm = Math.max(...bpms);
    const avgTrust = trustSamples.reduce((a, b) => a + b, 0) / trustSamples.length;
    
    let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    if (avgTrust > 0.8) quality = 'excellent';
    else if (avgTrust > 0.6) quality = 'good';
    else if (avgTrust > 0.4) quality = 'fair';

    const record: SessionRecord = {
      id: crypto.randomUUID(),
      startTime: Date.now() - (performance.now() - startTime),
      endTime: Date.now(),
      duration: performance.now() - startTime,
      avgBpm,
      minBpm,
      maxBpm,
      avgTrust,
      signalQuality: quality,
      bpmTimeline: bpmSamples,
    };

    await db.saveSession(record);
    await sessionsApi.saveSession(record);
    await get().loadHistory();
    
    set({ currentSession: null });
    return record;
  },

  loadHistory: async () => {
    const history = await db.getAllSessions();
    // Sort newest first
    set({ history: history.sort((a, b) => b.startTime - a.startTime) });
  },

  deleteSession: async (id) => {
    await db.deleteSession(id);
    await sessionsApi.deleteSession(id);
    await get().loadHistory();
  },
}));
