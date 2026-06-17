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

const TIME_KEYS = ['punchTime', 'PunchTime', 'punch_time', 'LogDate', 'logDate', 'LogDateTime', 'AttDateTime', 'DateTime', 'dateTime', 'EventTime', 'eventTime', 'time', 'datetime']
const DIR_KEYS = ['direction', 'Direction', 'InOut', 'inout', 'in_out', 'status', 'Status', 'C1', 'io', 'type']

export const POST = createRoute(async (c) => {
  const authHeader = c.req.header('Authorization')
  const deviceKey = c.req.header('X-Device-Key') ?? ''
  const contentType = c.req.header('Content-Type')

  const raw = await c.req.text()
  const body = parseIncoming(raw, contentType)

  const reportedDeviceId = pickDeviceId(body)
  const viaBasic = checkBasicAuth(c.env, authHeader)
  const viaDevice = !viaBasic && (await authenticateDevice(c.env.DB, reportedDeviceId, deviceKey))

  console.log('[biometric:sync] raw=', raw)
  await captureDebug(c.env.DB, 'sync', contentType, viaBasic || viaDevice, raw)

  if (!viaBasic && !viaDevice) {
    return c.json({ error: 'Invalid device credentials' }, 401)
  }

  const internalDeviceId = viaDevice ? reportedDeviceId : await ensureDevice(c.env.DB, reportedDeviceId)
  const punches = pickArray(body)

  let accepted = 0
  let duplicates = 0

  for (const p of punches) {
    const ref = pickRef(p)
    const ms = parsePunchTime(pickField(p, TIME_KEYS))
    const dir = normalizeDirection(pickField(p, DIR_KEYS))
    if (!ref || ms == null) continue
    const inserted = await ingestPunch(c.env.DB, internalDeviceId, ref, ms, dir)
    if (inserted) accepted++
    else duplicates++
  }

  return c.json({ accepted, duplicates })
})
