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
