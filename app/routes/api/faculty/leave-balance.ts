import { createRoute } from '../../../lib/factory'
import { verifyJWT, requireRole } from '../../../lib/jwt'

export const GET = createRoute(verifyJWT, requireRole('faculty', 'hr', 'master'), async (c) => {
  const auth = c.get('authUser')!
  const year = c.req.query('year') ?? String(new Date().getFullYear())

  const config = await c.env.DB.prepare('SELECT cl_allowance FROM leave_config WHERE year = ?')
    .bind(Number(year))
    .first<{ cl_allowance: number }>()
  const allowance = config?.cl_allowance ?? 12.0

  const taken = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(cl_units), 0) AS total FROM leave_applications
     WHERE user_id = ? AND status = 'approved' AND strftime('%Y', from_date) = ?`
  )
    .bind(auth.userId, year)
    .first<{ total: number }>()

  const pending = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(cl_units), 0) AS total FROM leave_applications
     WHERE user_id = ? AND status = 'pending' AND strftime('%Y', from_date) = ?`
  )
    .bind(auth.userId, year)
    .first<{ total: number }>()

  const takenTotal = taken?.total ?? 0
  const pendingTotal = pending?.total ?? 0
  const available = allowance - takenTotal - pendingTotal

  return c.json({ allowance, taken: takenTotal, pending: pendingTotal, available })
})
