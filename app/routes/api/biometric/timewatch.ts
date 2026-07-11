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
  pickRef,
} from '../../../lib/biometric'

// TimeWatch cloud punch shape (per the vendor's "Fetch Punch Data" format):
//   { "Success": true, "Message": "...", "Data": [ {
//       "UserID": "369839", "PunchTime": "2025-07-01T07:53:49",
//       "InsertedOn": "...", "DeviceID": "TW6000PW02240232",
//       "DeviceName": "IKOLAHA FACTORY", "InOutMode": "0", "VerifyMode": "Face"
//   } ] }
// InOutMode: 0 = In (check-in), 1 = Out (check-out).
const TIME_KEYS = ['PunchTime', 'punchTime', 'punch_time', 'LogDate', 'LogDateTime', 'AttDateTime', 'DateTime', 'EventTime', 'time', 'datetime']
const DIR_KEYS = ['InOutMode', 'direction', 'Direction', 'InOut', 'inout', 'in_out', 'status', 'Status', 'C1', 'io', 'type']
const FROM_KEYS = ['FromDate', 'fromDate', 'from_date', 'from', 'FromDt', 'startDate', 'StartDate']
const TO_KEYS = ['ToDate', 'toDate', 'to_date', 'to', 'ToDt', 'endDate', 'EndDate']

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // college is in India (UTC+5:30)
function pad(n: number) {
  return String(n).padStart(2, '0')
}
// Epoch ms -> "YYYY-MM-DDTHH:MM:SS" in IST (TimeWatch's PunchTime format).
function istIso(ms: number): string {
  const d = new Date(ms + IST_OFFSET_MS)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

// TimeWatch may send the full envelope `{ Data: [...] }`, a bare array, or a
// single punch object. Normalize all three into a flat list of punch records.
function extractRecords(parsed: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[]
  const arr = pickArray(parsed)
  if (arr.length) return arr
  // A single punch posted at the top level (has a user ref + a timestamp).
  if (pickRef(parsed) && parsePunchTime(pickField(parsed, TIME_KEYS)) != null) return [parsed]
  return []
}

export const POST = createRoute(async (c) => {
  const authHeader = c.req.header('Authorization')
  const deviceKey = c.req.header('X-Device-Key') ?? ''
  const contentType = c.req.header('Content-Type')

  const raw = await c.req.text()
  const parsed = parseIncoming(raw, contentType)
  const records = extractRecords(parsed)

  // Device id may be at the envelope level or on each record.
  const topDeviceId = pickDeviceId(parsed)
  const authDeviceId = topDeviceId || (records[0] ? pickDeviceId(records[0]) : '')

  const viaBasic = checkBasicAuth(c.env, authHeader)
  const viaDevice = !viaBasic && (await authenticateDevice(c.env.DB, authDeviceId, deviceKey))

  // Capture the raw request so the vendor's exact format stays inspectable in D1.
  const debugStr = `${c.req.method} ${c.req.url}\nct=${contentType ?? ''} len=${c.req.header('content-length') ?? '0'} ua=${c.req.header('user-agent') ?? ''}\nbody=${raw}`
  await captureDebug(c.env.DB, 'timewatch', contentType, viaBasic || viaDevice, debugStr)

  // Live log: show the incoming call + a readable summary of each punch.
  console.log(
    `\n📥 [timewatch] ${new Date().toISOString()} — ${records.length} punch(es), auth=${viaBasic ? 'basic' : viaDevice ? 'device-key' : 'NONE'}`
  )
  for (const rec of records) {
    console.log(
      `   • UserID=${pickRef(rec) || '?'} PunchTime=${pickField(rec, TIME_KEYS) ?? '?'} InOutMode=${pickField(rec, DIR_KEYS) ?? '-'} DeviceID=${pickDeviceId(rec) || topDeviceId || '-'}`
    )
  }

  if (!viaBasic && !viaDevice) {
    console.log('   ↳ ❌ 401 Invalid device credentials')
    return c.json({ Success: false, Message: 'Invalid device credentials' }, 401)
  }

  // --- FETCH / QUERY mode ---
  // A payload of { FromDate, ToDate, DeviceID?, UserID? } is a request for punches,
  // not a punch to store. Return the stored punches for that range in TimeWatch's
  // { Success, Message, Data:[...] } response format.
  const fromRaw = pickField(parsed, FROM_KEYS)
  const toRaw = pickField(parsed, TO_KEYS)
  if (records.length === 0 && fromRaw != null && toRaw != null) {
    const fromMs = parsePunchTime(`${String(fromRaw).slice(0, 10)} 00:00:00`)
    const toMs = parsePunchTime(`${String(toRaw).slice(0, 10)} 23:59:59`)
    if (fromMs == null || toMs == null) {
      return c.json({ Success: false, Message: 'Invalid FromDate/ToDate (use YYYY-MM-DD).' }, 400)
    }

    const devFilter = topDeviceId // DeviceID
    const userFilter = pickRef(parsed) // UserID

    // --- PULL mode: fetch live from TimeWatch's own API, store, and return ---
    // Only active when TIMEWATCH_API_URL is configured (a secret). This is what
    // brings in NEW data (users/dates not already in our DB).
    const upstream = c.env.TIMEWATCH_API_URL
    if (upstream) {
      try {
        const upRes = await fetch(upstream, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(c.env.TIMEWATCH_AUTH ? { Authorization: c.env.TIMEWATCH_AUTH } : {}),
          },
          body: JSON.stringify({
            FromDate: String(fromRaw).slice(0, 10),
            ToDate: String(toRaw).slice(0, 10),
            DeviceID: devFilter,
            UserID: userFilter,
          }),
        })
        const up = (await upRes.json().catch(() => ({}))) as { Data?: Record<string, unknown>[] }
        const upData = Array.isArray(up?.Data) ? up.Data : []
        let stored = 0
        for (const rec of upData) {
          const ref = pickRef(rec)
          const ms = parsePunchTime(pickField(rec, TIME_KEYS))
          const dir = normalizeDirection(pickField(rec, DIR_KEYS))
          if (!ref || ms == null) continue
          const internal = await ensureDevice(c.env.DB, pickDeviceId(rec) || devFilter)
          if (await ingestPunch(c.env.DB, internal, ref, ms, dir)) stored++
        }
        console.log(`📥 [timewatch:pull] upstream ${upRes.status} → ${upData.length} punch(es), ${stored} newly stored`)
        return c.json({ Success: true, Message: 'Punch Data Fetched Successfully.', Data: upData, stored })
      } catch (e) {
        console.log('   ↳ ⚠️ upstream fetch failed:', String((e as Error)?.message ?? e))
        return c.json({ Success: false, Message: 'Failed to reach TimeWatch upstream API.' }, 502)
      }
    }

    // --- STORED mode (no upstream configured): return punches already in our DB ---
    // We intentionally do NOT filter by DeviceID: punches are often stored under a
    // different device label than the physical serial the caller sends (e.g. imports
    // land under "TimeWatch-Import"), so filtering by it would silently hide data.
    const conds = ['p.punch_time >= ?', 'p.punch_time <= ?']
    const binds: (string | number)[] = [fromMs, toMs]
    if (userFilter) {
      conds.push('p.biometric_ref = ?')
      binds.push(userFilter)
    }

    const { results } = await c.env.DB.prepare(
      `SELECT p.biometric_ref AS UserID, p.punch_time AS pt, p.direction AS dir,
              d.serial AS serial, d.name AS name
       FROM biometric_punches p
       LEFT JOIN biometric_devices d ON d.id = p.device_id
       WHERE ${conds.join(' AND ')}
       ORDER BY p.punch_time ASC
       LIMIT 5000`
    )
      .bind(...binds)
      .all<{ UserID: string; pt: number; dir: string | null; serial: string | null; name: string | null }>()

    const Data = results.map((r) => ({
      UserID: r.UserID,
      PunchTime: istIso(r.pt),
      DeviceID: r.serial ?? devFilter ?? '',
      DeviceName: r.name ?? '',
      InOutMode: r.dir === 'out' ? '1' : '0',
      VerifyMode: '',
    }))

    console.log(
      `📤 [timewatch:fetch] ${String(fromRaw).slice(0, 10)}..${String(toRaw).slice(0, 10)} device=${devFilter || '*'} user=${userFilter || '*'} → ${Data.length} punch(es)`
    )
    return c.json({ Success: true, Message: 'Punch Data Fetched Successfully.', Data })
  }

  let accepted = 0
  let duplicates = 0
  let skipped = 0

  for (const rec of records) {
    const ref = pickRef(rec)
    const ms = parsePunchTime(pickField(rec, TIME_KEYS))
    const dir = normalizeDirection(pickField(rec, DIR_KEYS))
    if (!ref || ms == null) {
      skipped++
      continue
    }
    // Prefer the per-record device, fall back to the envelope device.
    const recDeviceId = pickDeviceId(rec) || topDeviceId
    // Device-key auth trusts the reported id; Basic auth auto-registers by serial.
    const internalDeviceId = viaDevice
      ? recDeviceId || authDeviceId
      : await ensureDevice(c.env.DB, recDeviceId)

    const inserted = await ingestPunch(c.env.DB, internalDeviceId, ref, ms, dir)
    if (inserted) accepted++
    else duplicates++
  }

  console.log(`   ↳ ✅ accepted=${accepted} duplicates=${duplicates} skipped=${skipped}`)

  return c.json({ Success: true, Message: 'Punch data received.', accepted, duplicates, skipped })
})
