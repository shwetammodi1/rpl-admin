import { createRoute } from '../../../lib/factory'
import { verifyJWT, requireRole } from '../../../lib/jwt'

type Row = {
  id: string
  name: string
  location: string | null
  serial: string | null
  last_seen_at: number | null
}

export const GET = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, location, serial, last_seen_at FROM biometric_devices ORDER BY name'
  ).all<Row>()

  const devices = results.map((row) => ({
    id: row.id,
    name: row.name,
    location: row.location,
    serial: row.serial,
    lastSeenAt: row.last_seen_at,
  }))

  return c.json({ devices })
})
