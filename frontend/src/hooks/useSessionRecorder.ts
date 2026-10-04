import { useEffect, useRef } from 'react';
import { useSessionStore } from '../stores/useSessionStore';
import { useEngineStore } from '../stores/useEngineStore';

/**
 * useSessionRecorder — automatically manages the full session lifecycle.
 *
 * - Calls startSession() when engine starts running
 * - Calls recordSample() on every valid locked BPM measurement
 * - Calls endSession() when engine stops, saving data to IndexedDB
 */
export function useSessionRecorder() {
  const isRunning = useEngineStore(state => state.isRunning);
  const viewModel = useEngineStore(state => state.viewModel);

  const startSession = useSessionStore(state => state.startSession);
  const recordSample = useSessionStore(state => state.recordSample);
  const endSession   = useSessionStore(state => state.endSession);

  // Track whether we actually started a session (to avoid duplicate starts)
  const sessionStartedRef = useRef(false);

  // Start/end session based on isRunning
  useEffect(() => {
    if (isRunning) {
      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true;
        startSession();
      }
    } else {
      if (sessionStartedRef.current) {
        sessionStartedRef.current = false;
        // End the session and save it — this persists to IndexedDB
        endSession().then((record) => {
          if (record) {
            console.log(`[SessionRecorder] Session saved: ${record.id}, avgBpm=${record.avgBpm.toFixed(1)}`);
          } else {
            console.log('[SessionRecorder] Session ended but no samples recorded — not saved.');
          }
        });
      }
    }
  }, [isRunning, startSession, endSession]);

  // Record samples when locked + valid BPM
  useEffect(() => {
    if (
      isRunning &&
      viewModel &&
      viewModel.trackingState === 'LOCKED' &&
      viewModel.bpm !== null &&
      viewModel.bpm > 0 &&
      viewModel.trustScore >= 0.5
    ) {
      recordSample(viewModel.bpm, viewModel.trustScore);
    }
  }, [isRunning, viewModel?.bpm, viewModel?.trustScore, viewModel?.trackingState, recordSample]);

  return null; // pure logic hook
}
