import type { PulseViewModel } from '../adapters/types';
import type { SignalQuality } from '../engine/types';

export interface SessionRecord {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // ms
  avgBpm: number;
  minBpm: number;
  maxBpm: number;
  avgTrust: number;
  signalQuality: SignalQuality;
  bpmTimeline: { t: number; bpm: number }[];
}

export interface PulseSession {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  avgBpm: number;
  avgTrust: number;
  signalQuality: SignalQuality;
}

export type StatusMessageType = 'info' | 'success' | 'warning' | 'error';

export interface StatusMessage {
  id: string;
  timestamp: number;
  text: string;
  type: StatusMessageType;
}

export type PanelId = 'bpm' | 'trust' | 'quality' | 'stats' | 'log';

// Re-export specific types for convenience
export type { PulseViewModel, SignalQuality };
