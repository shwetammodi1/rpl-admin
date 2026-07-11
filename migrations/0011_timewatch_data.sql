-- Catch-all store for the /api/biometric/timewatch endpoint. Every incoming record
-- (single object, array of records, { Data: [...] } envelope, or a
-- { FromDate, ToDate, DeviceID, UserID } request) becomes one row. Known fields map
-- to columns; up to 5 unknown keys go into extra1..extra5; the full record is kept
-- in raw_json so no data is ever lost.
CREATE TABLE IF NOT EXISTS timewatch_data (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  punch_time TEXT,
  inserted_on TEXT,
  device_id TEXT,
  device_name TEXT,
  in_out_mode TEXT,
  verify_mode TEXT,
  from_date TEXT,
  to_date TEXT,
  extra1 TEXT,
  extra2 TEXT,
  extra3 TEXT,
  extra4 TEXT,
  extra5 TEXT,
  raw_json TEXT,
  created_at INTEGER NOT NULL
);
