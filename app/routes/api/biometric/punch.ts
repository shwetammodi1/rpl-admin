import { createRoute } from '../../../lib/factory'
import { authenticateDevice, ingestPunch } from '../../../lib/biometric'

type Body = {
  deviceId?: string
  biometricRef?: string
  punchTime?: number
  direction?: string
}

export const POST = createRoute(async (c) => {
  const key = c.req.header('X-Device-Key') ?? ''
  const body = await c.req.json<Body>().catch(() => null)
  const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : ''

  if (!(await authenticateDevice(c.env.DB, deviceId, key))) {
    return c.json({ error: 'Invalid device credentials' }, 401)
  }

  if (!body?.biometricRef || typeof body.punchTime !== 'number') {
    return c.json({ error: 'biometricRef and punchTime are required' }, 400)
  }

  await ingestPunch(c.env.DB, deviceId, body.biometricRef, body.punchTime, body.direction ?? null)

  return c.json({ ok: true })
})
