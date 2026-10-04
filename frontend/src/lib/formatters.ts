import { CONSTANTS } from './constants';
import type { SignalQuality } from '../engine/types'; // will be created in Phase 2

export function formatBPM(bpm: number, trustScore: number): string {
  if (bpm === 0 || bpm === null) {
    return '—';
  }
  return Math.round(bpm).toString();
}

export function formatTrustScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function formatSignalQuality(quality: SignalQuality): string {
  return quality.toUpperCase();
}
