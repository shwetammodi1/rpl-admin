CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  roll_no TEXT,
  name TEXT NOT NULL,
  course TEXT,
  semester TEXT,
  section TEXT,
  department TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);
CREATE INDEX IF NOT EXISTS idx_students_class ON students (course, semester, section);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_roll_class ON students (roll_no, course, semester, section);
