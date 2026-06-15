import { createRoute } from '../../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../../lib/jwt'
import { buildAttendanceReport } from '../../../../../lib/attendanceReport'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const GET = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const month = c.req.query('month') ?? currentMonth()
  const report = await buildAttendanceReport(c.env.DB, month)
  return c.json({ month, report })
})
