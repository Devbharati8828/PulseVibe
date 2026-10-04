-- Migration 001: Initial Schema
-- Applied automatically by backend/src/db/migrate.ts

USE pulsevibe;

CREATE TABLE IF NOT EXISTS pulse_sessions (
  id                    CHAR(36)       NOT NULL,
  started_at            BIGINT         NOT NULL,
  ended_at              BIGINT         NOT NULL,
  duration_ms           INT            NOT NULL,
  bpm                   FLOAT          NULL,
  trust_score           FLOAT          NOT NULL DEFAULT 0,
  signal_quality_score  FLOAT          NOT NULL DEFAULT 0,
  signal_quality_label  ENUM('POOR','FAIR','GOOD','EXCELLENT') NOT NULL DEFAULT 'POOR',
  algorithm             ENUM('GREEN','CHROM','POS') NOT NULL DEFAULT 'CHROM',
  measurement_valid     TINYINT(1)     NOT NULL DEFAULT 0,
  notes                 TEXT           NULL,
  created_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_started_at (started_at DESC),
  INDEX idx_bpm (bpm),
  INDEX idx_measurement_valid (measurement_valid),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS migration_history (
  id         INT          NOT NULL AUTO_INCREMENT,
  filename   VARCHAR(255) NOT NULL UNIQUE,
  applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
