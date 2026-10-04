export type SignalQualityLabel = 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
export type RPPGAlgorithm = 'GREEN' | 'CHROM' | 'POS';

/** Shape as stored in MySQL */
export interface SessionRow {
  id: string;
  started_at: number;
  ended_at: number;
  duration_ms: number;
  bpm: number | null;
  trust_score: number;
  signal_quality_score: number;
  signal_quality_label: SignalQualityLabel;
  algorithm: RPPGAlgorithm;
  measurement_valid: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Shape the API receives (POST body) */
export interface CreateSessionDTO {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  bpm: number | null;
  trustScore: number;
  signalQualityScore: number;
  signalQualityLabel: SignalQualityLabel;
  algorithm: RPPGAlgorithm;
  measurementValid: boolean;
  notes?: string;
}

/** Shape returned to the client (camelCase) */
export interface SessionResponseDTO {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  bpm: number | null;
  trustScore: number;
  signalQualityScore: number;
  signalQualityLabel: SignalQualityLabel;
  algorithm: RPPGAlgorithm;
  measurementValid: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedSessionsResponse {
  data: SessionResponseDTO[];
  total: number;
  limit: number;
  offset: number;
}

/** Convert DB row → response DTO */
export function toResponseDTO(row: SessionRow): SessionResponseDTO {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    bpm: row.bpm,
    trustScore: row.trust_score,
    signalQualityScore: row.signal_quality_score,
    signalQualityLabel: row.signal_quality_label,
    algorithm: row.algorithm,
    measurementValid: Boolean(row.measurement_valid),
    notes: row.notes,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}
