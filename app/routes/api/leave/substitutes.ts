import { createRoute } from '../../../lib/factory'
import { verifyJWT, requireRole } from '../../../lib/jwt'

export const GET = createRoute(verifyJWT, requireRole('faculty', 'hr', 'master'), async (c) => {
  const auth = c.get('authUser')!
  const date = c.req.query('date')

  let query = `SELECT id, name, department FROM users WHERE role = 'faculty' AND id != ?`
  const params: unknown[] = [auth.userId]

  if (date) {
    query += ` AND id NOT IN (
      SELECT user_id FROM leave_applications
      WHERE status = 'approved' AND from_date <= ? AND to_date >= ?
    )`
    params.push(date, date)
  }

  query += ' ORDER BY name'

  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all<{ id: string; name: string; department: string | null }>()

  return c.json(results)
})
