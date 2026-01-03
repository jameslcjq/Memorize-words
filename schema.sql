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
