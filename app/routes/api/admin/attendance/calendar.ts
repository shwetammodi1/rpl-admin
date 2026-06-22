import { createRoute } from '../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../lib/jwt'

type Row = { date: string; status: string; in_time: string | null; out_time: string | null }
type Punch = { punch_time: number; direction: string | null }

const LATE_AFTER = '09:30' // HH:MM; a present punch after this counts as "late"

function currentMonth() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function istTodayStr() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export const GET = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const userId = c.req.query('userId') ?? ''
  const month = c.req.query('month') ?? currentMonth()

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  const user = await c.env.DB.prepare('SELECT id, name, department, biometric_ref FROM users WHERE id = ?')
    .bind(userId)
    .first<{ id: string; name: string; department: string | null; biometric_ref: string | null }>()
  if (!user) {
    return c.json({ error: 'Employee not found' }, 404)
  }

  const { results } = await c.env.DB.prepare(
    'SELECT date, status, in_time, out_time FROM attendance WHERE user_id = ? AND date LIKE ?'
  )
    .bind(userId, `${month}-%`)
    .all<Row>()
  const byDate = new Map(results.map((r) => [r.date, r]))

  let recentPunches: { time: number; direction: string | null }[] = []
  if (user.biometric_ref) {
    const punchRes = await c.env.DB.prepare(
      'SELECT punch_time, direction FROM biometric_punches WHERE biometric_ref = ? ORDER BY punch_time DESC LIMIT 8'
    )
      .bind(user.biometric_ref)
      .all<Punch>()
    recentPunches = punchRes.results.map((p) => ({ time: p.punch_time, direction: p.direction }))
  }

  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const today = istTodayStr()

  const days = []
  const summary = { present: 0, absent: 0, late: 0, leave: 0 }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`
    const dow = new Date(y, m - 1, d).getDay()
    const row = byDate.get(date)
    let status: string
    let inTime: string | null = null
    let outTime: string | null = null

    if (row) {
      inTime = row.in_time
      outTime = row.out_time
      if (row.status === 'present' && row.in_time && row.in_time > LATE_AFTER) {
        status = 'late'
      } else {
        status = row.status
      }
    } else if (dow === 0) {
      status = 'off'
    } else if (date > today) {
      status = 'upcoming'
    } else {
      status = 'absent'
    }

    if (status === 'present') summary.present++
    else if (status === 'late') summary.late++
    else if (status === 'absent') summary.absent++
    else if (status === 'leave' || status === 'half' || status === 'short') summary.leave++

    days.push({ date, day: d, dow, status, inTime, outTime })
  }

  return c.json({
    user: { id: user.id, name: user.name, department: user.department, biometricRef: user.biometric_ref },
    month,
    days,
    summary,
    recentPunches,
  })
})
