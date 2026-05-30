-- Sync settings and deleted word tombstones.
-- Run in Cloudflare D1:
-- wrangler d1 execute memorize-db --file=migrations/004_sync_settings_and_deleted_words.sql

ALTER TABLE users ADD COLUMN password_salt TEXT;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  settings TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS deleted_word_records (
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  dict TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, dict, word)
);
