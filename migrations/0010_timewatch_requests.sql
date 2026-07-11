-- Stores each TimeWatch fetch-request payload ({ FromDate, ToDate, DeviceID, UserID })
-- as one row. The /api/biometric/timewatch endpoint inserts a row per call and
-- returns just that row.
CREATE TABLE IF NOT EXISTS timewatch_requests (
  id TEXT PRIMARY KEY,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  device_id TEXT,
  user_id TEXT,
  created_at INTEGER NOT NULL
);
