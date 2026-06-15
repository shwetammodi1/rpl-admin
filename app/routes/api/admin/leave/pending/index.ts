import { createRoute } from '../../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../../lib/jwt'

type Row = {
  id: string
  user_id: string
  faculty_name: string
  department: string | null
  type: string
  from_date: string
  to_date: string
  half_session: string | null
  start_time: string | null
  end_time: string | null
  reason: string | null
  substitute_name: string | null
  cl_units: number | null
  created_at: number
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const GET = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT la.id, la.user_id, u.name AS faculty_name, u.department, la.type, la.from_date, la.to_date,
            la.half_session, la.start_time, la.end_time, la.reason, sub.name AS substitute_name,
            la.cl_units, la.created_at
     FROM leave_applications la
     JOIN users u ON u.id = la.user_id
     LEFT JOIN users sub ON sub.id = la.substitute_id
     WHERE la.status = 'pending'
     ORDER BY la.created_at ASC`
  ).all<Row>()

  const requests = []
  for (const row of results) {
    const year = row.from_date.slice(0, 4)

    const config = await c.env.DB.prepare('SELECT cl_allowance FROM leave_config WHERE year = ?')
      .bind(Number(year))
      .first<{ cl_allowance: number }>()
    const allowance = config?.cl_allowance ?? 12.0

    const taken = await c.env.DB.prepare(
      `SELECT COALESCE(SUM(cl_units), 0) AS total FROM leave_applications
       WHERE user_id = ? AND status = 'approved' AND strftime('%Y', from_date) = ?`
    )
      .bind(row.user_id, year)
      .first<{ total: number }>()

    const balanceAfter = allowance - (taken?.total ?? 0) - (row.cl_units ?? 0)

    requests.push({
      id: row.id,
      facultyName: row.faculty_name,
      department: row.department,
      facultyAvatar: initials(row.faculty_name),
      type: row.type,
      fromDate: row.from_date,
      toDate: row.to_date,
      halfSession: row.half_session,
      startTime: row.start_time,
      endTime: row.end_time,
      reason: row.reason,
      substituteName: row.substitute_name,
      clUnits: row.cl_units,
      balanceAfter,
      createdAt: row.created_at,
    })
  }

  return c.json({ requests })
})
