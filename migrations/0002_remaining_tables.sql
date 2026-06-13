-- Rebuild users table with the schema required by the Faculty Attendance & Leave Portal:
-- text UUID ids, a department column, and the new role set.
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'pending' CHECK (role IN ('pending', 'faculty', 'hr', 'master')),
  department TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO users_new (id, name, email, password_hash, role, department, created_at)
SELECT
  lower(hex(randomblob(16))),
  name,
  email,
  password_hash,
  CASE role
    WHEN 'master_admin' THEN 'master'
    WHEN 'admin' THEN 'hr'
    ELSE 'pending'
  END,
  NULL,
  CAST(strftime('%s', created_at) AS INTEGER)
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE TABLE leave_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  half_session TEXT,
  start_time TEXT,
  end_time TEXT,
  reason TEXT,
  substitute_id TEXT REFERENCES users(id),
  cl_units REAL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT REFERENCES users(id),
  review_comment TEXT,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER
);

CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  in_time TEXT,
  out_time TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  device_id TEXT,
  UNIQUE (user_id, date)
);

CREATE TABLE leave_config (
  year INTEGER PRIMARY KEY,
  cl_allowance REAL NOT NULL DEFAULT 12.0
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE biometric_devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  serial TEXT UNIQUE,
  device_key TEXT,
  last_seen_at INTEGER
);

CREATE TABLE biometric_punches (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES biometric_devices(id),
  biometric_ref TEXT NOT NULL,
  punch_time INTEGER NOT NULL,
  direction TEXT,
  processed INTEGER NOT NULL DEFAULT 0,
  UNIQUE (device_id, biometric_ref, punch_time)
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  meta TEXT,
  created_at INTEGER NOT NULL
);

INSERT INTO leave_config (year, cl_allowance) VALUES (2026, 12.0);
