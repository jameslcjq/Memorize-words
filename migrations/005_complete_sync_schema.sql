-- Complete the production sync schema without deleting existing data.
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

CREATE TABLE IF NOT EXISTS smart_learning_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  dict TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  group_number INTEGER NOT NULL,
  words_count INTEGER NOT NULL,
  total_time INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  word_details TEXT,
  UNIQUE(user_id, dict, chapter, group_number, completed_at)
);
