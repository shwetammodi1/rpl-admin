// Shared helpers for the biometric webhook endpoints (Section 4.7).
// Devices authenticate with a per-device key; punches are stored idempotently
// and processed into the attendance table with source = 'biometric'.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // college is in India (UTC+5:30)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// Convert an epoch-ms punch into an IST calendar date + HH:MM time.
function istParts(punchMs: number): { date: string; time: string } {
  const d = new Date(punchMs + IST_OFFSET_MS)
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  }
}

// Vendor push auth: HTTP Basic against the configured push credentials.
// Used when the biometric provider posts to our webhook with a username/password.
export function checkBasicAuth(env: Env, authHeader: string | undefined): boolean {
  const user = env.BIOMETRIC_PUSH_USER
  const pass = env.BIOMETRIC_PUSH_PASS
  if (!user || !pass || !authHeader?.startsWith('Basic ')) return false
  let decoded = ''
  try {
    decoded = atob(authHeader.slice(6).trim())
  } catch {
    return false
  }
  const sep = decoded.indexOf(':')
  if (sep === -1) return false
  return decoded.slice(0, sep) === user && decoded.slice(sep + 1) === pass
}

// Resolve a vendor-supplied device identifier (our id OR the physical serial)
// to our internal biometric_devices.id. Returns null if the device is unknown.
export async function resolveDevice(db: D1Database, deviceId: string): Promise<string | null> {
  if (!deviceId) return null
  const row = await db.prepare('SELECT id FROM biometric_devices WHERE id = ? OR serial = ?')
    .bind(deviceId, deviceId)
    .first<{ id: string }>()
  return row?.id ?? null
}

// Verify the device exists and the supplied key matches; refresh last_seen_at.
export async function authenticateDevice(db: D1Database, deviceId: string, key: string): Promise<boolean> {
  if (!deviceId || !key) return false
  const device = await db.prepare('SELECT device_key FROM biometric_devices WHERE id = ?')
    .bind(deviceId)
    .first<{ device_key: string | null }>()
  if (!device || !device.device_key || device.device_key !== key) return false

  await db.prepare('UPDATE biometric_devices SET last_seen_at = ? WHERE id = ?').bind(Date.now(), deviceId).run()
  return true
}

// Map a punch to a user and upsert their attendance row for that day.
async function processPunch(
  db: D1Database,
  deviceId: string,
  biometricRef: string,
  punchMs: number,
  direction: string | null
) {
  const user = await db.prepare('SELECT id FROM users WHERE biometric_ref = ?')
    .bind(biometricRef)
    .first<{ id: string }>()
  // No enrolled user yet — leave the punch unprocessed for a later backfill.
  if (!user) return

  const { date, time } = istParts(punchMs)
  // Don't clobber an approved leave/half/short or a week-off with a stray punch.
  const keepStatus = `CASE WHEN attendance.status IN ('leave','half','short','off') THEN attendance.status ELSE 'present' END`

  if (direction === 'out') {
    await db.prepare(
      `INSERT INTO attendance (id, user_id, date, status, out_time, source, device_id)
       VALUES (?, ?, ?, 'present', ?, 'biometric', ?)
       ON CONFLICT (user_id, date) DO UPDATE SET
         out_time = excluded.out_time,
         status = ${keepStatus},
         source = 'biometric',
         device_id = excluded.device_id`
    )
      .bind(crypto.randomUUID(), user.id, date, time, deviceId)
      .run()
  } else {
    await db.prepare(
      `INSERT INTO attendance (id, user_id, date, status, in_time, source, device_id)
       VALUES (?, ?, ?, 'present', ?, 'biometric', ?)
       ON CONFLICT (user_id, date) DO UPDATE SET
         in_time = COALESCE(attendance.in_time, excluded.in_time),
         status = ${keepStatus},
         source = 'biometric',
         device_id = excluded.device_id`
    )
      .bind(crypto.randomUUID(), user.id, date, time, deviceId)
      .run()
  }

  await db.prepare(
    'UPDATE biometric_punches SET processed = 1 WHERE device_id = ? AND biometric_ref = ? AND punch_time = ?'
  )
    .bind(deviceId, biometricRef, punchMs)
    .run()
}

// Store a punch idempotently (UNIQUE device_id+ref+time) and process it.
// Returns true if it was newly stored, false if it was a duplicate.
export async function ingestPunch(
  db: D1Database,
  deviceId: string,
  biometricRef: string,
  punchMs: number,
  direction: string | null
): Promise<boolean> {
  const res = await db.prepare(
    `INSERT OR IGNORE INTO biometric_punches (id, device_id, biometric_ref, punch_time, direction, processed)
     VALUES (?, ?, ?, ?, ?, 0)`
  )
    .bind(crypto.randomUUID(), deviceId, biometricRef, punchMs, direction ?? null)
    .run()

  const inserted = (res.meta?.changes ?? 0) > 0
  if (inserted) {
    await processPunch(db, deviceId, biometricRef, punchMs, direction)
  }
  return inserted
}
