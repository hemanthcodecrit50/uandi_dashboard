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
    );

    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      picture    TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS friendships (
      id           TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_pair ON friendships(requester_id, addressee_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);

    CREATE TABLE IF NOT EXISTS dashboards (
      id            TEXT PRIMARY KEY,
      owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      icon          TEXT,
      theme_json    TEXT,
      settings_json TEXT NOT NULL DEFAULT '{}',
      is_default    INTEGER NOT NULL DEFAULT 0,
      updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_dashboards_owner ON dashboards(owner_id);

    CREATE TABLE IF NOT EXISTS widget_instances (
      instance_id        TEXT PRIMARY KEY,
      dashboard_id       TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
      widget_type        TEXT NOT NULL,
      layout_json        TEXT NOT NULL,
      configuration_json TEXT NOT NULL DEFAULT '{}',
      visibility         TEXT NOT NULL DEFAULT 'private',
      mode               TEXT NOT NULL DEFAULT 'readonly',
      data_source_id     TEXT,
      updated_at         INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_widget_instances_dashboard ON widget_instances(dashboard_id);

    CREATE TABLE IF NOT EXISTS dashboard_shares (
      id                  TEXT PRIMARY KEY,
      dashboard_id        TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
      shared_with_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      share_token         TEXT UNIQUE,
      permission          TEXT NOT NULL DEFAULT 'view',
      created_at          INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_shares_dashboard ON dashboard_shares(dashboard_id);
    CREATE INDEX IF NOT EXISTS idx_shares_user ON dashboard_shares(shared_with_user_id);
  `);
  return instance;
}

// During `next build` static analysis, skip initialization — no real env or FS access.
export const db: Database.Database =
  process.env.NEXT_PHASE === 'phase-production-build'
    ? (null as unknown as Database.Database)
    : (globalThis._dashboardDb ?? (globalThis._dashboardDb = openDb()));
