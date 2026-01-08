DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT, -- Hashed password
  nickname TEXT,
  created_at INTEGER
);

DROP TABLE IF EXISTS study_records;
CREATE TABLE study_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,         -- Format: YYYY-MM-DD
  duration INTEGER DEFAULT 0, -- Minutes
  word_count INTEGER DEFAULT 0,
  updated_at INTEGER,
  UNIQUE(user_id, date)
);

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

DROP TABLE IF EXISTS sync_data;
CREATE TABLE sync_data (
  user_id TEXT PRIMARY KEY,
  data TEXT, -- JSON string of the entire export
  updated_at INTEGER
);
