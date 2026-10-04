import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionsService } from '../src/services/sessions.service.js';
import { sessionRepository } from '../src/repositories/sessions.repository.js';
import type { CreateSessionDTO } from '../src/types/session.types.js';

vi.mock('../src/repositories/sessions.repository.js', () => ({
  sessionRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    deleteById: vi.fn(),
    deleteAll: vi.fn(),
  },
}));

const mockSession: CreateSessionDTO = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  startedAt: 1000000000000,
  endedAt:   1000000032000,
  durationMs: 32000,
  bpm: 72.4,
  trustScore: 0.87,
  signalQualityScore: 0.85,
  signalQualityLabel: 'GOOD',
  algorithm: 'CHROM',
  measurementValid: true,
  notes: 'Test session',
};

describe('SessionsService', () => {
  const service = new SessionsService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a session when it does not exist', async () => {
    vi.mocked(sessionRepository.findById)
      .mockResolvedValueOnce(null)  // first call — doesn't exist
      .mockResolvedValueOnce({     // second call — after insert
        ...mockSession,
        started_at: mockSession.startedAt,
        ended_at: mockSession.endedAt,
        duration_ms: mockSession.durationMs,
        trust_score: mockSession.trustScore,
        signal_quality_score: mockSession.signalQualityScore,
        signal_quality_label: mockSession.signalQualityLabel,
        measurement_valid: true,
        notes: mockSession.notes ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      } as any);

    vi.mocked(sessionRepository.create).mockResolvedValueOnce(undefined);

    const result = await service.createSession(mockSession);

    expect(sessionRepository.create).toHaveBeenCalledOnce();
    expect(result.id).toBe(mockSession.id);
    expect(result.bpm).toBe(72.4);
    expect(result.measurementValid).toBe(true);
  });

  it('returns existing session without re-inserting (idempotent)', async () => {
    vi.mocked(sessionRepository.findById).mockResolvedValueOnce({
      ...mockSession,
      started_at: mockSession.startedAt,
      ended_at: mockSession.endedAt,
      duration_ms: mockSession.durationMs,
      trust_score: mockSession.trustScore,
      signal_quality_score: mockSession.signalQualityScore,
      signal_quality_label: mockSession.signalQualityLabel,
      measurement_valid: true,
      notes: null,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    await service.createSession(mockSession);

    expect(sessionRepository.create).not.toHaveBeenCalled();
  });

  it('returns null for non-existent session', async () => {
    vi.mocked(sessionRepository.findById).mockResolvedValueOnce(null);
    const result = await service.getSession('does-not-exist');
    expect(result).toBeNull();
  });

  it('deleteSession returns false when not found', async () => {
    vi.mocked(sessionRepository.deleteById).mockResolvedValueOnce(false);
    const result = await service.deleteSession('ghost-id');
    expect(result).toBe(false);
  });
});
