-- Map a device-side biometric id to a portal user so punches can be resolved to attendance.
ALTER TABLE users ADD COLUMN biometric_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_users_biometric_ref ON users (biometric_ref);
