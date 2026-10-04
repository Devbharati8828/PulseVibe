import type { SessionRecord } from '../../types/index.js';

const API_BASE = 'http://localhost:3001/api/v1';

/**
 * Backend API client for session synchronization.
 * Fails gracefully — app continues working via IndexedDB if backend is unreachable.
 */
export const sessionsApi = {
  /** Save a session to the backend */
  async saveSession(session: SessionRecord): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: session.id,
          startedAt: session.startTime,
          endedAt: session.endTime,
          durationMs: session.duration,
          bpm: session.avgBpm > 0 ? session.avgBpm : null,
          trustScore: session.avgTrust,
          signalQualityScore:
            session.signalQuality === 'excellent' ? 1.0 :
            session.signalQuality === 'good'      ? 0.8 :
            session.signalQuality === 'fair'      ? 0.5 : 0.2,
          signalQualityLabel: session.signalQuality.toUpperCase(),
          algorithm: 'CHROM',
          measurementValid: session.avgBpm > 0,
          notes: 'Synced from web client',
        }),
      });
      if (!res.ok) {
        console.warn('[API] Backend sync failed:', await res.text());
      }
    } catch (err) {
      console.warn('[API] Backend unreachable. Session saved locally only.', err);
    }
  },

  /** Delete a session from the backend */
  async deleteSession(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('[API] Backend delete failed. Deleted locally only.', err);
    }
  },
};
