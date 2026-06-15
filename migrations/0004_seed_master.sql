-- Seed a default Master Admin so a freshly provisioned database is usable.
-- Email is UNIQUE, so re-running this migration will not create duplicates.
-- Password hash is PBKDF2-SHA256 (100k iterations) of 'RPLAdmin@2026',
-- generated with hashPassword() from app/lib/password.ts (format saltHex:hashHex).
INSERT OR IGNORE INTO users (
  id, name, email, password_hash, role, department, created_at
) VALUES (
  lower(hex(randomblob(16))),
  'System Administrator',
  'admin@rplmaheshwari.com',
  '7e4734e8c6f6a8b7b5e3815801e37935:6b858308416124886b656a06014dde885f18edf088b57c2831898acd4a6d9784',
  'master',
  'Administration',
  unixepoch()
);
