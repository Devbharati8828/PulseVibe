import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, '../../../database/migrations');

interface MigrationRow {
  filename: string;
}

async function ensureMigrationTable(): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS migration_history (
      id         INT          NOT NULL AUTO_INCREMENT,
      filename   VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function getAppliedMigrations(): Promise<string[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT filename FROM migration_history ORDER BY id ASC'
  );
  return (rows as MigrationRow[]).map(r => r.filename);
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationTable();
  const applied = await getAppliedMigrations();

  // Read migration files
  let files: string[] = [];
  try {
    const { readdirSync } = await import('fs');
    files = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();
  } catch {
    console.warn('[migrate] No migrations directory found — skipping');
    return;
  }

  for (const file of files) {
    if (applied.includes(file)) {
      console.log(`[migrate] Already applied: ${file}`);
      continue;
    }

    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const statement of statements) {
        await conn.execute(statement);
      }
      await conn.execute(
        'INSERT INTO migration_history (filename) VALUES (?)',
        [file]
      );
      await conn.commit();
      console.log(`[migrate] Applied: ${file}`);
    } catch (err) {
      await conn.rollback();
      console.error(`[migrate] Failed on: ${file}`, err);
      throw err;
    } finally {
      conn.release();
    }
  }
}

import mysql from 'mysql2/promise';
