-- Per-lecture, per-date log: attendance summary + what was taught.
CREATE TABLE IF NOT EXISTS lecture_logs (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL,
  faculty_id TEXT,
  log_date TEXT NOT NULL,                    -- 'YYYY-MM-DD'
  status TEXT NOT NULL DEFAULT 'conducted',  -- conducted | cancelled
  present_count INTEGER,
  total_count INTEGER,
  topic TEXT,                                -- what was taught today
  remarks TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);
-- One log per lecture per date (enables upsert).
CREATE UNIQUE INDEX IF NOT EXISTS idx_lecture_log_slot_date ON lecture_logs (slot_id, log_date);
CREATE INDEX IF NOT EXISTS idx_lecture_log_faculty ON lecture_logs (faculty_id, log_date);
