-- Pet Tables Migration
-- Run in Cloudflare D1: wrangler d1 execute memorize-db --file=migrations/003_add_pet_tables.sql

CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  species TEXT NOT NULL DEFAULT 'cat',
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  exp INTEGER NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'baby',
  mood INTEGER NOT NULL DEFAULT 80,
  hunger INTEGER NOT NULL DEFAULT 80,
  cleanliness INTEGER NOT NULL DEFAULT 80,
  outfit_json TEXT NOT NULL DEFAULT '[]',
  last_interacted_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pet_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, item_id)
);
