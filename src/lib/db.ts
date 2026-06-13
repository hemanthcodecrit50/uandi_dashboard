import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

import { validateEnv } from './env';

validateEnv();

const DB_DIR = process.env.DB_PATH
  ? path.dirname(process.env.DB_PATH)
  : path.join(process.cwd(), 'data');

const DB_PATH = process.env.DB_PATH ?? path.join(DB_DIR, 'dashboard.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Extend globalThis so the singleton survives Next.js hot-module replacement.
declare global {
  // eslint-disable-next-line no-var
  var _dashboardDb: Database.Database | undefined;
}

function openDb(): Database.Database {
  const instance = new Database(DB_PATH);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  instance.exec(`
    CREATE TABLE IF NOT EXISTS user_tokens (
      user_id    TEXT PRIMARY KEY,
      encrypted  TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  return instance;
}

// During `next build` static analysis, skip initialization — no real env or FS access.
export const db: Database.Database =
  process.env.NEXT_PHASE === 'phase-production-build'
    ? (null as unknown as Database.Database)
    : (globalThis._dashboardDb ?? (globalThis._dashboardDb = openDb()));
