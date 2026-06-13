import { createRoute } from '../../../lib/factory'
import { verifyJWT, requireRole } from '../../../lib/jwt'

type AttendanceRow = {
  date: string
  status: string
  in_time: string | null
  out_time: string | null
  source: string
}

export const GET = createRoute(verifyJWT, requireRole('faculty', 'hr', 'master'), async (c) => {
  const auth = c.get('authUser')!
  const now = new Date()
  const month = c.req.query('month') ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthNum = Number(monthStr)

  const { results } = await c.env.DB.prepare(
    'SELECT date, status, in_time, out_time, source FROM attendance WHERE user_id = ? AND date LIKE ? ORDER BY date'
  )
    .bind(auth.userId, `${month}-%`)
    .all<AttendanceRow>()

  const records = new Map(results.map((row) => [row.date, row]))
  const daysInMonth = new Date(year, monthNum, 0).getDate()

  const attendance = []
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`
    const record = records.get(date)

    if (record) {
      attendance.push({
        date,
        status: record.status,
        inTime: record.in_time,
        outTime: record.out_time,
        source: record.source,
      })
    } else if (new Date(year, monthNum - 1, day).getDay() === 0) {
      attendance.push({ date, status: 'off', inTime: null, outTime: null, source: 'auto' })
    }
  }

  return c.json({ month, attendance })
})
