import { createRoute } from '../../../lib/factory'
import { authenticateDevice, checkBasicAuth, ingestPunch, resolveDevice } from '../../../lib/biometric'

type Punch = { biometricRef?: string; punchTime?: number; direction?: string }
type Body = { deviceId?: string; punches?: Punch[] }

export const POST = createRoute(async (c) => {
  const authHeader = c.req.header('Authorization')
  const deviceKey = c.req.header('X-Device-Key') ?? ''

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

  console.log('[biometric:sync] raw=', raw)

  const internalDeviceId = viaDevice ? deviceId : await resolveDevice(c.env.DB, deviceId)
  const punches = Array.isArray(body?.punches) ? body!.punches! : []

  let accepted = 0
  let duplicates = 0

  if (internalDeviceId) {
    for (const p of punches) {
      if (!p || !p.biometricRef || typeof p.punchTime !== 'number') continue
      const inserted = await ingestPunch(c.env.DB, internalDeviceId, p.biometricRef, p.punchTime, p.direction ?? null)
      if (inserted) accepted++
      else duplicates++
    }
  }

  return c.json({ accepted, duplicates })
})
