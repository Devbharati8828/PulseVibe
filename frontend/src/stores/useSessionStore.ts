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
      if (!state.currentSession || !bpm || bpm <= 0) return state;

      const t = performance.now() - state.currentSession.startTime;
      return {
        currentSession: {
          ...state.currentSession,
          bpmSamples: [...state.currentSession.bpmSamples, { t, bpm }],
          trustSamples: [...state.currentSession.trustSamples, trust ?? 0],
        }
      };
    });
  },

  endSession: async () => {
    const { currentSession } = get();
    if (!currentSession) {
      return null;
    }

    const duration = performance.now() - currentSession.startTime;
    // Discard accidental micro-clicks (< 500ms)
    if (duration < 500) {
      set({ currentSession: null });
      return null;
    }

    const { bpmSamples, trustSamples, startTime } = currentSession;
    const hasSamples = bpmSamples.length > 0;
    const bpms = hasSamples ? bpmSamples.map(s => s.bpm) : [];
    
    const avgBpm = hasSamples ? bpms.reduce((a, b) => a + b, 0) / bpms.length : 0;
    const minBpm = hasSamples ? Math.min(...bpms) : 0;
    const maxBpm = hasSamples ? Math.max(...bpms) : 0;
    const avgTrust = (trustSamples && trustSamples.length > 0)
      ? trustSamples.reduce((a, b) => a + b, 0) / trustSamples.length
      : 0;
    
    let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    if (avgTrust > 0.8) quality = 'excellent';
    else if (avgTrust > 0.6) quality = 'good';
    else if (avgTrust > 0.4) quality = 'fair';

    const record: SessionRecord = {
      id: crypto.randomUUID(),
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      avgBpm,
      minBpm,
      maxBpm,
      avgTrust,
      signalQuality: quality,
      bpmTimeline: bpmSamples,
    };

    try {
      await db.saveSession(record);
    } catch (err) {
      console.error('[SessionStore] Error saving session to IndexedDB:', err);
    }

    try {
      await sessionsApi.saveSession(record);
    } catch (err) {
      console.warn('[SessionStore] Backend sync failed:', err);
    }

    await get().loadHistory();
    
    set({ currentSession: null });
    return record;
  },

  loadHistory: async () => {
    try {
      const history = await db.getAllSessions();
      // Sort newest first
      set({ history: (history || []).sort((a, b) => (b.startTime || 0) - (a.startTime || 0)) });
    } catch (err) {
      console.error('[SessionStore] loadHistory failed:', err);
    }
  },

  deleteSession: async (id) => {
    await db.deleteSession(id);
    await sessionsApi.deleteSession(id);
    await get().loadHistory();
  },
}));
