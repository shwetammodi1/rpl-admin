import { createRoute } from '../../../lib/factory'
import { authenticateDevice, ingestPunch } from '../../../lib/biometric'

type Punch = { biometricRef?: string; punchTime?: number; direction?: string }
type Body = { deviceId?: string; punches?: Punch[] }

export const POST = createRoute(async (c) => {
  const key = c.req.header('X-Device-Key') ?? ''
  const body = await c.req.json<Body>().catch(() => null)
  const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : ''

  if (!(await authenticateDevice(c.env.DB, deviceId, key))) {
    return c.json({ error: 'Invalid device credentials' }, 401)
  }

  const punches = Array.isArray(body?.punches) ? body!.punches! : []
  let accepted = 0
  let duplicates = 0

  for (const p of punches) {
    if (!p || !p.biometricRef || typeof p.punchTime !== 'number') continue
    const inserted = await ingestPunch(c.env.DB, deviceId, p.biometricRef, p.punchTime, p.direction ?? null)
    if (inserted) accepted++
    else duplicates++
  }

  return c.json({ accepted, duplicates })
})
