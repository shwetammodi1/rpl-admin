import { createRoute } from '../../../lib/factory'
import { verifyJWT, requireRole } from '../../../lib/jwt'

type LeaveRow = {
  id: string
  type: string
  from_date: string
  to_date: string
  half_session: string | null
  start_time: string | null
  end_time: string | null
  reason: string | null
  substitute_name: string | null
  cl_units: number | null
  status: string
  review_comment: string | null
  reviewed_at: number | null
  created_at: number
}

export const GET = createRoute(verifyJWT, requireRole('faculty', 'hr', 'master'), async (c) => {
  const auth = c.get('authUser')!
  const status = c.req.query('status')
  const limit = Number(c.req.query('limit') ?? '20')

  let query = `SELECT la.id, la.type, la.from_date, la.to_date, la.half_session, la.start_time, la.end_time,
                      la.reason, sub.name AS substitute_name, la.cl_units, la.status, la.review_comment,
                      la.reviewed_at, la.created_at
               FROM leave_applications la
               LEFT JOIN users sub ON sub.id = la.substitute_id
               WHERE la.user_id = ?`
  const params: unknown[] = [auth.userId]

  if (status) {
    query += ' AND la.status = ?'
    params.push(status)
  }

  query += ' ORDER BY la.created_at DESC LIMIT ?'
  params.push(limit)

  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all<LeaveRow>()

  const applications = results.map((row) => ({
    id: row.id,
    type: row.type,
    fromDate: row.from_date,
    toDate: row.to_date,
    halfSession: row.half_session,
    startTime: row.start_time,
    endTime: row.end_time,
    reason: row.reason,
    substituteName: row.substitute_name,
    clUnits: row.cl_units,
    status: row.status,
    reviewComment: row.review_comment,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  }))

  return c.json({ applications })
})
