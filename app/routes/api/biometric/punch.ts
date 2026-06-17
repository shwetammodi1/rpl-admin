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

  // Always capture the raw payload so the vendor format can be inspected in D1.
  console.log('[biometric:punch] raw=', raw)
  await captureDebug(c.env.DB, 'punch', contentType, viaBasic || viaDevice, raw)

  if (!viaBasic && !viaDevice) {
    return c.json({ error: 'Invalid device credentials' }, 401)
  }

  const internalDeviceId = viaDevice ? reportedDeviceId : await ensureDevice(c.env.DB, reportedDeviceId)
  const ref = pickRef(body)
  const ms = parsePunchTime(pickField(body, TIME_KEYS))
  const dir = normalizeDirection(pickField(body, DIR_KEYS))

  if (internalDeviceId && ref && ms != null) {
    await ingestPunch(c.env.DB, internalDeviceId, ref, ms, dir)
  }

  return c.json({ ok: true })
})
