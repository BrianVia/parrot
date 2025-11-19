import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import type { TranscriptionResult } from './transcription/types';

export interface StoredTranscription {
  id: number;
  text: string;
  language: string;
  duration: number;
  service: string;
  createdAt: string;
}

export class TranscriptionDatabase {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'transcriptions.db');
    this.db = new Database(dbPath);

    this.initSchema();
  }

  private initSchema(): void {
    // Main table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transcriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        language TEXT,
        duration INTEGER,
        service TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at
      ON transcriptions(created_at DESC)
    `);

    // Full-text search table
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS transcriptions_fts
      USING fts5(text, content=transcriptions, content_rowid=id)
    `);

    // Triggers to keep FTS in sync
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS transcriptions_ai
      AFTER INSERT ON transcriptions BEGIN
        INSERT INTO transcriptions_fts(rowid, text) VALUES (new.id, new.text);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS transcriptions_ad
      AFTER DELETE ON transcriptions BEGIN
        INSERT INTO transcriptions_fts(transcriptions_fts, rowid, text)
        VALUES('delete', old.id, old.text);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS transcriptions_au
      AFTER UPDATE ON transcriptions BEGIN
        INSERT INTO transcriptions_fts(transcriptions_fts, rowid, text)
        VALUES('delete', old.id, old.text);
        INSERT INTO transcriptions_fts(rowid, text) VALUES (new.id, new.text);
      END
    `);
  }

  insert(result: TranscriptionResult, service: string): number {
    const stmt = this.db.prepare(`
      INSERT INTO transcriptions (text, language, duration, service)
      VALUES (?, ?, ?, ?)
    `);

    const info = stmt.run(
      result.text,
      result.language,
      Math.round(result.duration),
      service
    );

    return info.lastInsertRowid as number;
  }

  getRecent(limit: number = 50): StoredTranscription[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        text,
        language,
        duration,
        service,
        created_at as createdAt
      FROM transcriptions
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return stmt.all(limit) as StoredTranscription[];
  }

  search(query: string, limit: number = 50): StoredTranscription[] {
    const stmt = this.db.prepare(`
      SELECT
        t.id,
        t.text,
        t.language,
        t.duration,
        t.service,
        t.created_at as createdAt
      FROM transcriptions t
      JOIN transcriptions_fts fts ON t.id = fts.rowid
      WHERE transcriptions_fts MATCH ?
      ORDER BY t.created_at DESC
      LIMIT ?
    `);

    return stmt.all(query, limit) as StoredTranscription[];
  }

  getById(id: number): StoredTranscription | undefined {
    const stmt = this.db.prepare(`
      SELECT
        id,
        text,
        language,
        duration,
        service,
        created_at as createdAt
      FROM transcriptions
      WHERE id = ?
    `);

    return stmt.get(id) as StoredTranscription | undefined;
  }

  delete(id: number): void {
    const stmt = this.db.prepare('DELETE FROM transcriptions WHERE id = ?');
    stmt.run(id);
  }

  clear(): void {
    this.db.exec('DELETE FROM transcriptions');
  }

  close(): void {
    this.db.close();
  }
}
