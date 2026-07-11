import { createRoute } from '../../../lib/factory'
import {
  authenticateDevice,
  captureDebug,
  checkBasicAuth,
  ensureDevice,
  ingestPunch,
  normalizeDirection,
  parseIncoming,
  parsePunchTime,
  pickArray,
  pickDeviceId,
  pickField,
} from '../../../lib/biometric'

// Catch-all store: any payload — a single record, an array of records, a
// { Data: [...] } envelope, or a { FromDate, ToDate, DeviceID, UserID } request —
// is stored into timewatch_data. Known fields map to columns; up to 5 unknown keys
// go into extra1..extra5; the whole record is also saved in raw_json so NOTHING is lost.

// column -> accepted incoming key names (first match wins)
const FIELD_MAP: Record<string, string[]> = {
  user_id: ['UserID', 'userId', 'UserId', 'userid', 'user_id'],
  punch_time: ['PunchTime', 'punchTime', 'punch_time'],
  inserted_on: ['InsertedOn', 'insertedOn', 'inserted_on'],
  device_id: ['DeviceID', 'DeviceId', 'deviceId', 'deviceid', 'device_id'],
  device_name: ['DeviceName', 'deviceName', 'device_name'],
  in_out_mode: ['InOutMode', 'inOutMode', 'in_out_mode'],
  verify_mode: ['VerifyMode', 'verifyMode', 'verify_mode'],
  from_date: ['FromDate', 'fromDate', 'from_date', 'from'],
  to_date: ['ToDate', 'toDate', 'to_date', 'to'],
}
// every known key (lowercased) — used to detect "extra" (unmapped) keys
const KNOWN = new Set(Object.values(FIELD_MAP).flat().map((k) => k.toLowerCase()))

// Normalize any body shape into a flat list of record objects.
function toRecords(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[]
  if (parsed && typeof parsed === 'object') {
    const arr = pickArray(parsed as Record<string, unknown>) // { Data: [...] } / punches / records
    if (arr.length) return arr
    if (Object.keys(parsed as object).length) return [parsed as Record<string, unknown>] // single object
  }
  return []
}

function str(v: unknown): string | null {
  if (v == null) return null
  return typeof v === 'object' ? JSON.stringify(v) : String(v)
}

export const POST = createRoute(async (c) => {
  const authHeader = c.req.header('Authorization')
  const deviceKey = c.req.header('X-Device-Key') ?? ''
  const contentType = c.req.header('Content-Type')

  const raw = await c.req.text()
  const parsed = parseIncoming(raw, contentType)
  const records = toRecords(parsed)

  const topDeviceId = pickDeviceId(parsed as Record<string, unknown>)
  const authDeviceId = topDeviceId || (records[0] ? pickDeviceId(records[0]) : '')

  const viaBasic = checkBasicAuth(c.env, authHeader)
  const viaDevice = !viaBasic && (await authenticateDevice(c.env.DB, authDeviceId, deviceKey))

  // Always keep the raw request for inspection.
  const debugStr = `${c.req.method} ${c.req.url}\nct=${contentType ?? ''} len=${c.req.header('content-length') ?? '0'}\nbody=${raw}`
  await captureDebug(c.env.DB, 'timewatch', contentType, viaBasic || viaDevice, debugStr)

  if (!viaBasic && !viaDevice) {
    return c.json({ Success: false, Message: 'Invalid device credentials' }, 401)
  }

  if (records.length === 0) {
    return c.json({ Success: false, Message: 'No data in payload.' }, 400)
  }

  const createdAt = Date.now()
  const stored: Record<string, unknown>[] = []

  for (const rec of records) {
    const id = crypto.randomUUID()

    // map known fields to columns
    const cols: Record<string, string | null> = {}
    for (const [col, keys] of Object.entries(FIELD_MAP)) {
      cols[col] = str(pickField(rec, keys))
    }

    // any key we don't have a column for → the 5 extra columns (rest still in raw_json)
    const extras: string[] = []
    for (const [k, v] of Object.entries(rec)) {
      if (!KNOWN.has(k.toLowerCase())) extras.push(`${k}=${str(v) ?? ''}`)
    }

    await c.env.DB.prepare(
      `INSERT INTO timewatch_data
         (id, user_id, punch_time, inserted_on, device_id, device_name, in_out_mode, verify_mode,
          from_date, to_date, extra1, extra2, extra3, extra4, extra5, raw_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        cols.user_id,
        cols.punch_time,
        cols.inserted_on,
        cols.device_id,
        cols.device_name,
        cols.in_out_mode,
        cols.verify_mode,
        cols.from_date,
        cols.to_date,
        extras[0] ?? null,
        extras[1] ?? null,
        extras[2] ?? null,
        extras[3] ?? null,
        extras[4] ?? null,
        JSON.stringify(rec),
        createdAt
      )
      .run()

    // Best-effort: if it's a real punch (has PunchTime + UserID), also feed the
    // attendance pipeline (biometric_punches). Never let this break the main store.
    const ms = parsePunchTime(cols.punch_time)
    if (cols.user_id && ms != null) {
      try {
        const internal = await ensureDevice(c.env.DB, cols.device_id || topDeviceId || authDeviceId || id)
        await ingestPunch(c.env.DB, internal, cols.user_id, ms, normalizeDirection(cols.in_out_mode))
      } catch {
        /* ignore — raw_json already stored */
      }
    }

    stored.push({ id, ...rec })
  }

  console.log(`🧾 [timewatch] stored ${stored.length} row(s), auth=${viaBasic ? 'basic' : 'device-key'}`)
  return c.json({ Success: true, Message: 'Stored.', Data: stored })
})
