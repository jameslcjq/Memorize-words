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

-- Gamification System Tables
DROP TABLE IF EXISTS points_transactions;
CREATE TABLE points_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  details TEXT,
  UNIQUE(user_id, timestamp, reason, amount)
);

DROP TABLE IF EXISTS unlocked_achievements;
CREATE TABLE unlocked_achievements (
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);

DROP TABLE IF EXISTS daily_challenges;
CREATE TABLE daily_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed_at INTEGER,
  words TEXT,  -- JSON array
  score INTEGER,
  UNIQUE(user_id, date)
);

-- Practice Record Tables
DROP TABLE IF EXISTS review_records;
CREATE TABLE review_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  dict TEXT NOT NULL,
  create_time INTEGER NOT NULL,
  is_finished INTEGER DEFAULT 0,  -- 0=false, 1=true
  UNIQUE(user_id, dict, create_time)
);

DROP TABLE IF EXISTS spaced_repetition_records;
CREATE TABLE spaced_repetition_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  dict TEXT NOT NULL,
  ease_factor REAL,
  interval_days INTEGER,
  repetitions INTEGER,
  next_review INTEGER,
  last_reviewed INTEGER,
  UNIQUE(user_id, word, dict)
);

DROP TABLE IF EXISTS smart_learning_records;
CREATE TABLE smart_learning_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  dict TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  group_number INTEGER NOT NULL,
  words_count INTEGER NOT NULL,
  total_time INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  word_details TEXT, -- JSON string
  UNIQUE(user_id, dict, chapter, group_number, completed_at)
);
