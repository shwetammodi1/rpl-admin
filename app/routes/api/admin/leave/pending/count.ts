import { createRoute } from '../../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../../lib/jwt'

export const GET = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const row = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM leave_applications WHERE status = 'pending'")
    .first<{ count: number }>()

  return c.json({ count: row?.count ?? 0 })
})
