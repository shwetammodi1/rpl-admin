import { createRoute } from '../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../lib/jwt'

type Row = {
  user_id: string
  name: string
  department: string | null
  status: string | null
  in_time: string | null
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const GET = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const date = c.req.query('date') ?? todayStr()

  // Faculty with no attendance row default to 'absent', or 'off' on Sundays.
  const [y, m, d] = date.split('-').map(Number)
  const isSunday = new Date(y, m - 1, d).getDay() === 0
  const defaultStatus = isSunday ? 'off' : 'absent'

  const { results } = await c.env.DB.prepare(
    `SELECT u.id AS user_id, u.name, u.department, a.status, a.in_time
     FROM users u
     LEFT JOIN attendance a ON a.user_id = u.id AND a.date = ?
     WHERE u.role = 'faculty'
     ORDER BY u.name`
  )
    .bind(date)
    .all<Row>()

  const attendance = results.map((row) => ({
    userId: row.user_id,
    name: row.name,
    department: row.department,
    status: row.status ?? defaultStatus,
    inTime: row.in_time,
  }))

  return c.json({ date, attendance })
})
