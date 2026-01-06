-- Migration to add sync tables
-- created at 2026-01-06

DROP TABLE IF EXISTS word_records;
CREATE TABLE word_records (
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  dict TEXT NOT NULL,
  chapter INTEGER,
  wrong_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  mistakes TEXT, -- JSON string
  timestamp INTEGER,
  mode TEXT,
  PRIMARY KEY (user_id, dict, word)
);

DROP TABLE IF EXISTS chapter_records;
CREATE TABLE chapter_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  dict TEXT NOT NULL,
  chapter INTEGER,
  timestamp INTEGER,
  time INTEGER,
  correct_count INTEGER,
  wrong_count INTEGER,
  word_count INTEGER,
  correct_word_indexes TEXT, -- JSON
  word_number INTEGER,
  UNIQUE(user_id, dict, chapter, timestamp)
);
