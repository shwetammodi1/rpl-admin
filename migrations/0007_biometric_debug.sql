-- Captures every raw payload hitting the biometric webhook so the device's
-- exact format can be confirmed from the D1 console during integration.
CREATE TABLE IF NOT EXISTS biometric_debug (
  id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL,
  endpoint TEXT,
  content_type TEXT,
  auth_ok INTEGER NOT NULL DEFAULT 0,
  raw TEXT
);
