import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
let connection: DatabaseSync | undefined;
export function db() {
  if (connection) return connection;
  const path = process.env.DATABASE_PATH || './data/milo.sqlite';
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const opened = new DatabaseSync(path);
  chmodSync(path, 0o600);
  opened.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS journals (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, credential_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, failures INTEGER NOT NULL, started_at INTEGER NOT NULL);`);
  connection = opened;
  return connection;
}
