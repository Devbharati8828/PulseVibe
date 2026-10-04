-- Seed Data (Development Only — DO NOT run in production)
USE pulsevibe;

INSERT IGNORE INTO pulse_sessions (
  id, started_at, ended_at, duration_ms,
  bpm, trust_score, signal_quality_score, signal_quality_label,
  algorithm, measurement_valid, notes
) VALUES
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (UNIX_TIMESTAMP(NOW()) - 7200) * 1000,
  (UNIX_TIMESTAMP(NOW()) - 7200 + 32) * 1000,
  32000, 72.4, 0.87, 0.85, 'GOOD', 'CHROM', 1, 'Morning reading'
),
(
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  (UNIX_TIMESTAMP(NOW()) - 3600) * 1000,
  (UNIX_TIMESTAMP(NOW()) - 3600 + 28) * 1000,
  28000, 68.1, 0.92, 0.91, 'EXCELLENT', 'POS', 1, NULL
),
(
  'c3d4e5f6-a7b8-9012-cdef-012345678902',
  (UNIX_TIMESTAMP(NOW()) - 1800) * 1000,
  (UNIX_TIMESTAMP(NOW()) - 1800 + 15) * 1000,
  15000, NULL, 0.35, 0.30, 'POOR', 'GREEN', 0, 'Poor lighting - invalid'
);
