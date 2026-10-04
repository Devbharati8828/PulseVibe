import pool from '../db/pool.js';
import type { SessionRow, CreateSessionDTO } from '../types/session.types.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface FindSessionsOptions {
  limit: number;
  offset: number;
  validOnly?: boolean;
}

export class SessionRepository {
  async create(dto: CreateSessionDTO): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO pulse_sessions
        (id, started_at, ended_at, duration_ms, bpm, trust_score,
         signal_quality_score, signal_quality_label, algorithm, measurement_valid, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.id,
        dto.startedAt,
        dto.endedAt,
        dto.durationMs,
        dto.bpm,
        dto.trustScore,
        dto.signalQualityScore,
        dto.signalQualityLabel,
        dto.algorithm,
        dto.measurementValid ? 1 : 0,
        dto.notes ?? null,
      ]
    );
  }

  async findById(id: string): Promise<SessionRow | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM pulse_sessions WHERE id = ? LIMIT 1',
      [id]
    );
    return (rows[0] as SessionRow) ?? null;
  }

  async findAll(opts: FindSessionsOptions): Promise<{ rows: SessionRow[]; total: number }> {
    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];

    if (opts.validOnly) {
      conditions.push('measurement_valid = 1');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM pulse_sessions ${where}`,
      params
    );
    const total = (countRows[0] as { total: number }).total;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM pulse_sessions ${where} ORDER BY started_at DESC LIMIT ? OFFSET ?`,
      [...params, opts.limit, opts.offset]
    );

    return { rows: rows as SessionRow[], total };
  }

  async deleteById(id: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM pulse_sessions WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async deleteAll(): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM pulse_sessions'
    );
    return result.affectedRows;
  }
}

export const sessionRepository = new SessionRepository();
