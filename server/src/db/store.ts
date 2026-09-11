import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import { config } from '../config.js';

export interface SecretRecord {
  id: string;
  ciphertext: string;
  iv: string;
  burn_after_read: number;
  has_passphrase: number;
  passphrase_salt?: string | null;
  is_file: number;
  revocation_token_hash: string;
  status: 'active' | 'burned' | 'expired';
  burned_at?: number | null;
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
  is_file?: boolean;
  ttl_seconds: number;
}

export interface SaveSecretResult {
  id: string;
  expires_at: number;
  revocation_token: string;
}

export interface SecretStatusResult {
  id: string;
  status: 'active' | 'burned' | 'expired' | 'not_found';
  created_at?: number;
  expires_at?: number;
  burned_at?: number | null;
  is_file?: boolean;
}

export class SecretStore {
  private db: DatabaseSync;

  constructor(customDbPath?: string) {
    const dbPath = customDbPath || path.join(config.dataDir, 'secrets.sqlite');

    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(dbPath);
    this.init();
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private init() {
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA synchronous = NORMAL;');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS secrets (
        id TEXT PRIMARY KEY,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        burn_after_read INTEGER NOT NULL DEFAULT 1,
        has_passphrase INTEGER NOT NULL DEFAULT 0,
        passphrase_salt TEXT,
        is_file INTEGER NOT NULL DEFAULT 0,
        revocation_token_hash TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        burned_at INTEGER,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);

    // Ensure backwards compatibility with any existing tables before indexing
    try {
      this.db.exec(`ALTER TABLE secrets ADD COLUMN is_file INTEGER NOT NULL DEFAULT 0;`);
    } catch {}
    try {
      this.db.exec(`ALTER TABLE secrets ADD COLUMN revocation_token_hash TEXT NOT NULL DEFAULT '';`);
    } catch {}
    try {
      this.db.exec(`ALTER TABLE secrets ADD COLUMN status TEXT NOT NULL DEFAULT 'active';`);
    } catch {}
    try {
      this.db.exec(`ALTER TABLE secrets ADD COLUMN burned_at INTEGER;`);
    } catch {}

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_secrets_expires_at ON secrets(expires_at);
      CREATE INDEX IF NOT EXISTS idx_secrets_status ON secrets(status);
    `);
  }

  /**
   * Stores encrypted payload, generating a secure revocation token for the sender.
   */
  public saveSecret(params: CreateSecretParams): SaveSecretResult {
    const now = Date.now();
    const expiresAt = now + params.ttl_seconds * 1000;
    const revocationToken = nanoid(32);
    const tokenHash = this.hashToken(revocationToken);

    const stmt = this.db.prepare(`
      INSERT INTO secrets (
        id, ciphertext, iv, burn_after_read, has_passphrase, passphrase_salt,
        is_file, revocation_token_hash, status, burned_at, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NULL, ?, ?)
    `);

    stmt.run(
      params.id,
      params.ciphertext,
      params.iv,
      params.burn_after_read ? 1 : 0,
      params.has_passphrase ? 1 : 0,
      params.passphrase_salt || null,
      params.is_file ? 1 : 0,
      tokenHash,
      now,
      expiresAt
    );

    return {
      id: params.id,
      expires_at: expiresAt,
      revocation_token: revocationToken
    };
  }

  /**
   * Atomically queries and retrieves secret.
   * If burn_after_read is 1, zeroes out ciphertext and marks record as burned.
   */
  public getAndBurnSecret(id: string): SecretRecord | null {
    const now = Date.now();

    const selectStmt = this.db.prepare(`
      SELECT * FROM secrets WHERE id = ? AND status = 'active' AND expires_at > ?
    `);

    const record = selectStmt.get(id, now) as unknown as SecretRecord | undefined;

    if (!record) {
      return null;
    }

    // Atomic burn: immediately destroy ciphertext and mark status as burned
    if (record.burn_after_read === 1) {
      const burnStmt = this.db.prepare(`
        UPDATE secrets SET ciphertext = '', iv = '', status = 'burned', burned_at = ? WHERE id = ?
      `);
      burnStmt.run(now, id);
    }

    return record;
  }

  /**
   * Allows sender to manually revoke / destroy secret before it is read.
   */
  public revokeSecret(id: string, revocationToken: string): boolean {
    const now = Date.now();
    const tokenHash = this.hashToken(revocationToken);

    const selectStmt = this.db.prepare(`
      SELECT * FROM secrets WHERE id = ? AND revocation_token_hash = ? AND status = 'active' AND expires_at > ?
    `);

    const record = selectStmt.get(id, tokenHash, now) as unknown as SecretRecord | undefined;

    if (!record) {
      return false;
    }

    const burnStmt = this.db.prepare(`
      UPDATE secrets SET ciphertext = '', iv = '', status = 'burned', burned_at = ? WHERE id = ?
    `);
    burnStmt.run(now, id);

    return true;
  }

  /**
   * Returns anonymous status metadata for tracking read receipts without revealing content.
   */
  public getSecretStatus(id: string): SecretStatusResult {
    const now = Date.now();

    const selectStmt = this.db.prepare(`
      SELECT id, status, is_file, created_at, expires_at, burned_at FROM secrets WHERE id = ?
    `);

    const record = selectStmt.get(id) as unknown as SecretRecord | undefined;

    if (!record) {
      return { id, status: 'not_found' };
    }

    if (record.expires_at <= now && record.status === 'active') {
      return {
        id,
        status: 'expired',
        created_at: record.created_at,
        expires_at: record.expires_at,
        is_file: Boolean(record.is_file)
      };
    }

    return {
      id,
      status: record.status,
      created_at: record.created_at,
      expires_at: record.expires_at,
      burned_at: record.burned_at,
      is_file: Boolean(record.is_file)
    };
  }

  /**
   * Cleans up expired secrets older than current timestamp.
   */
  public pruneExpiredSecrets(): number {
    const now = Date.now();
    const deleteStmt = this.db.prepare('DELETE FROM secrets WHERE expires_at <= ?');
    const result = deleteStmt.run(now);
    return Number(result.changes);
  }

  public close() {
    this.db.close();
  }
}

export const secretStore = new SecretStore();
