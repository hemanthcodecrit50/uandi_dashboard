import { encrypt, decrypt } from './crypto';
import { db } from './db';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms
  email: string;
  name: string;
  picture: string;
}

// ─── Interface ─────────────────────────────────────────────────────────────────

interface TokenStore {
  get(userId: string): Promise<StoredTokens | null>;
  set(userId: string, tokens: StoredTokens): Promise<void>;
  delete(userId: string): Promise<void>;
  updateAccessToken(userId: string, accessToken: string, expiresAt: number): Promise<void>;
}

// ─── SQLite implementation (default) ──────────────────────────────────────────
// Persistent, zero-config, works on any single server. For multi-instance
// deployments (horizontal scaling / serverless) swap to PostgresTokenStore below.

class SqliteTokenStore implements TokenStore {
  async get(userId: string): Promise<StoredTokens | null> {
    const row = db
      .prepare('SELECT encrypted FROM user_tokens WHERE user_id = ?')
      .get(userId) as { encrypted: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(decrypt(row.encrypted)) as StoredTokens;
    } catch {
      db.prepare('DELETE FROM user_tokens WHERE user_id = ?').run(userId);
      return null;
    }
  }

  async set(userId: string, tokens: StoredTokens): Promise<void> {
    db.prepare(`
      INSERT INTO user_tokens (user_id, encrypted, updated_at)
      VALUES (?, ?, unixepoch())
      ON CONFLICT (user_id)
      DO UPDATE SET encrypted = excluded.encrypted, updated_at = unixepoch()
    `).run(userId, encrypt(JSON.stringify(tokens)));
  }

  async delete(userId: string): Promise<void> {
    db.prepare('DELETE FROM user_tokens WHERE user_id = ?').run(userId);
  }

  async updateAccessToken(userId: string, accessToken: string, expiresAt: number): Promise<void> {
    const tokens = await this.get(userId);
    if (tokens) await this.set(userId, { ...tokens, accessToken, expiresAt });
  }
}

// ─── PostgreSQL implementation (multi-instance / serverless) ──────────────────
// 1. npm install pg
// 2. Add DATABASE_URL to .env.local
// 3. Run the migration:
//      CREATE TABLE IF NOT EXISTS user_tokens (
//        user_id    TEXT PRIMARY KEY,
//        encrypted  TEXT NOT NULL,
//        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
//      );
// 4. Replace `new SqliteTokenStore()` below with `new PostgresTokenStore()`.
//
// import { Pool } from 'pg';
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
//
// class PostgresTokenStore implements TokenStore {
//   async get(userId: string): Promise<StoredTokens | null> {
//     const { rows } = await pool.query(
//       'SELECT encrypted FROM user_tokens WHERE user_id = $1',
//       [userId],
//     );
//     if (!rows[0]) return null;
//     try { return JSON.parse(decrypt(rows[0].encrypted)) as StoredTokens; }
//     catch { return null; }
//   }
//   async set(userId: string, tokens: StoredTokens): Promise<void> {
//     await pool.query(
//       `INSERT INTO user_tokens (user_id, encrypted) VALUES ($1, $2)
//        ON CONFLICT (user_id) DO UPDATE SET encrypted = $2, updated_at = NOW()`,
//       [userId, encrypt(JSON.stringify(tokens))],
//     );
//   }
//   async delete(userId: string): Promise<void> {
//     await pool.query('DELETE FROM user_tokens WHERE user_id = $1', [userId]);
//   }
//   async updateAccessToken(userId: string, accessToken: string, expiresAt: number): Promise<void> {
//     const tokens = await this.get(userId);
//     if (tokens) await this.set(userId, { ...tokens, accessToken, expiresAt });
//   }
// }

export const tokenStore: TokenStore = new SqliteTokenStore();
