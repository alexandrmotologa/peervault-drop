import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export interface SecretRecord {
  id: string;
  ciphertext: string;
  iv: string;
  burn_after_read: number;
  has_passphrase: number;
  passphrase_salt?: string | null;
  created_at: number;
  expires_at: number;
}

export interface CreateSecretParams {
  id: string;
  ciphertext: string;
  iv: string;
  burn_after_read: boolean;
  has_passphrase: boolean;
  passphrase_salt?: string;
  ttl_seconds: number;
}

export class SecretStore {
  private db: DatabaseSync;

  constructor(customDbPath?: string) {
    const dbPath = customDbPath || path.join(config.dataDir, 'secrets.sqlite');
    
    // Ensure directory exists if not using in-memory
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(dbPath);
    this.init();
  }

  private init() {
    // Enable Write-Ahead Logging for high concurrency
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA synchronous = NORMAL;');

    // Ephemeral secrets table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS secrets (
        id TEXT PRIMARY KEY,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        burn_after_read INTEGER NOT NULL DEFAULT 1,
        has_passphrase INTEGER NOT NULL DEFAULT 0,
        passphrase_salt TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_secrets_expires_at ON secrets(expires_at);
    `);
  }

  /**
   * Stores a new encrypted secret payload with TTL.
   */
  public saveSecret(params: CreateSecretParams): { id: string; expires_at: number } {
    const now = Date.now();
    const expiresAt = now + params.ttl_seconds * 1000;

    const stmt = this.db.prepare(`
      INSERT INTO secrets (
        id, ciphertext, iv, burn_after_read, has_passphrase, passphrase_salt, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      params.id,
      params.ciphertext,
      params.iv,
      params.burn_after_read ? 1 : 0,
      params.has_passphrase ? 1 : 0,
      params.passphrase_salt || null,
      now,
      expiresAt
    );

    return { id: params.id, expires_at: expiresAt };
  }

  /**
   * Atomically queries and retrieves secret.
   * If burn_after_read is 1, deletes record in the same atomic operation.
   * Returns null if not found or expired.
   */
  public getAndBurnSecret(id: string): SecretRecord | null {
    const now = Date.now();

    // Query active unexpired secret
    const selectStmt = this.db.prepare(`
      SELECT * FROM secrets WHERE id = ? AND expires_at > ?
    `);

    const record = selectStmt.get(id, now) as unknown as SecretRecord | undefined;

    if (!record) {
      return null;
    }

    // Atomic burn if burn_after_read enabled
    if (record.burn_after_read === 1) {
      const deleteStmt = this.db.prepare('DELETE FROM secrets WHERE id = ?');
      deleteStmt.run(id);
    }

    return record;
  }

  /**
   * Cleans up expired secrets older than current timestamp.
   * Returns the count of deleted secrets.
   */
  public pruneExpiredSecrets(): number {
    const now = Date.now();
    const deleteStmt = this.db.prepare('DELETE FROM secrets WHERE expires_at <= ?');
    const result = deleteStmt.run(now);
    return Number(result.changes);
  }

  /**
   * Closes database connection cleanly.
   */
  public close() {
    this.db.close();
  }
}

// Singleton default instance
export const secretStore = new SecretStore();
