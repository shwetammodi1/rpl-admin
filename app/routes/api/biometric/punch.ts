import { createRoute } from '../../../lib/factory'
import { authenticateDevice, checkBasicAuth, ingestPunch, resolveDevice } from '../../../lib/biometric'

type Body = {
  deviceId?: string
  biometricRef?: string
  punchTime?: number
  direction?: string
}

export const POST = createRoute(async (c) => {
  const authHeader = c.req.header('Authorization')
  const deviceKey = c.req.header('X-Device-Key') ?? ''

  // Read the body as text first so we can log the exact vendor payload during onboarding.
  const raw = await c.req.text()
  let body: Body | null = null
  try {
    body = raw ? (JSON.parse(raw) as Body) : null
  } catch {
    body = null
  }

  const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : ''
  const viaBasic = checkBasicAuth(c.env, authHeader)
  const viaDevice = !viaBasic && (await authenticateDevice(c.env.DB, deviceId, deviceKey))

  if (!viaBasic && !viaDevice) {
    return c.json({ error: 'Invalid device credentials' }, 401)
  }

  // Capture the raw payload so the vendor's exact format can be confirmed on the first push.
  console.log('[biometric:punch] raw=', raw)

  // Device-key auth already validated the id; for Basic-auth push, resolve by id or serial.
  const internalDeviceId = viaDevice ? deviceId : await resolveDevice(c.env.DB, deviceId)

  if (!internalDeviceId || !body?.biometricRef || typeof body.punchTime !== 'number') {
    // Accept the request (so the vendor's test succeeds) but skip storage until the
    // device is registered and the field mapping is confirmed from the captured payload.
    return c.json({ ok: true })
  }

  await ingestPunch(c.env.DB, internalDeviceId, body.biometricRef, body.punchTime, body.direction ?? null)
  return c.json({ ok: true })
})
