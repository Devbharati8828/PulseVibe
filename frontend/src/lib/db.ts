import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { SessionRecord } from '../types';
import { CONSTANTS } from './constants';

interface PulseVibeDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: SessionRecord;
    indexes: {
      'by-start-time': number;
      'by-avg-bpm': number;
    };
  };
}

class PulseVibeDB {
  private dbPromise: Promise<IDBPDatabase<PulseVibeDBSchema>>;

  constructor() {
    this.dbPromise = openDB<PulseVibeDBSchema>(CONSTANTS.DB_NAME, CONSTANTS.DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'id' });
          store.createIndex('by-start-time', 'startTime');
          store.createIndex('by-avg-bpm', 'avgBpm');
        }
      },
    });
  }

  async saveSession(session: SessionRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('sessions', session);
  }

  async getAllSessions(): Promise<SessionRecord[]> {
    const db = await this.dbPromise;
    try {
      const records = await db.getAllFromIndex('sessions', 'by-start-time');
      if (records && records.length > 0) return records;
    } catch {
      // Fallback if index query fails
    }
    return db.getAll('sessions');
  }

  async getSession(id: string): Promise<SessionRecord | undefined> {
    const db = await this.dbPromise;
    return db.get('sessions', id);
  }

  async deleteSession(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('sessions', id);
  }
}

export const db = new PulseVibeDB();
