import { createRoute } from '../../../lib/factory'
import { verifyJWT, requireRole } from '../../../lib/jwt'

type LeaveRow = {
  id: string
  type: string
  from_date: string
  to_date: string
  cl_units: number | null
  status: string
  created_at: number
}

export const GET = createRoute(verifyJWT, requireRole('faculty', 'hr', 'master'), async (c) => {
  const auth = c.get('authUser')!
  const limit = Number(c.req.query('limit') ?? '20')

  const { results } = await c.env.DB.prepare(
    `SELECT id, type, from_date, to_date, cl_units, status, created_at FROM leave_applications
     WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
  )
    .bind(auth.userId, limit)
    .all<LeaveRow>()

  const applications = results.map((row) => ({
    id: row.id,
    type: row.type,
    fromDate: row.from_date,
    toDate: row.to_date,
    clUnits: row.cl_units,
    status: row.status,
    createdAt: row.created_at,
  }))

  return c.json({ applications })
})
