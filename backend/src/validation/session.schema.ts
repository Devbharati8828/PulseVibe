import { z } from 'zod';

const SignalQualityLabelEnum = z.enum(['POOR', 'FAIR', 'GOOD', 'EXCELLENT']);
const RPPGAlgorithmEnum = z.enum(['GREEN', 'CHROM', 'POS']);

export const CreateSessionSchema = z.object({
  id: z.string().uuid('id must be a valid UUID v4'),
  startedAt: z.number().int().positive('startedAt must be a positive integer (Unix ms)'),
  endedAt: z.number().int().positive('endedAt must be a positive integer (Unix ms)'),
  durationMs: z.number().int().nonnegative('durationMs must be non-negative'),
  bpm: z.number().min(20).max(300).nullable(),
  trustScore: z.number().min(0).max(1, 'trustScore must be 0–1'),
  signalQualityScore: z.number().min(0).max(1),
  signalQualityLabel: SignalQualityLabelEnum,
  algorithm: RPPGAlgorithmEnum,
  measurementValid: z.boolean(),
  notes: z.string().max(500).optional(),
}).refine(d => d.endedAt >= d.startedAt, {
  message: 'endedAt must be >= startedAt',
  path: ['endedAt'],
});

export const GetSessionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
  validOnly: z.coerce.boolean().optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type GetSessionsQuery = z.infer<typeof GetSessionsQuerySchema>;
