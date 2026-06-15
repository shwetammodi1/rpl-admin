import { createRoute } from '../../../lib/factory'
import { verifyJWT, requireRole } from '../../../lib/jwt'

type ApplyBody = {
  type?: 'full' | 'half' | 'short'
  fromDate?: string
  toDate?: string
  halfSession?: 'first' | 'second'
  startTime?: string
  endTime?: string
  reason?: string
  substituteId?: string
}

function countWorkingDays(fromDate: string, toDate: string) {
  const [fy, fm, fd] = fromDate.split('-').map(Number)
  const [ty, tm, td] = toDate.split('-').map(Number)
  const cursor = new Date(fy, fm - 1, fd)
  const end = new Date(ty, tm - 1, td)

  let count = 0
  while (cursor <= end) {
    if (cursor.getDay() !== 0) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

export const POST = createRoute(verifyJWT, requireRole('faculty'), async (c) => {
  const auth = c.get('authUser')!
  const body = await c.req.json<ApplyBody>().catch(() => null)

  if (!body || !body.type || !['full', 'half', 'short'].includes(body.type)) {
    return c.json({ error: 'A valid leave type is required' }, 400)
  }

  const reason = body.reason?.trim()
  if (!reason) {
    return c.json({ error: 'Reason is required' }, 400)
  }

  const { type } = body
  let fromDate = body.fromDate
  let toDate = body.toDate
  let halfSession: string | null = null
  let startTime: string | null = null
  let endTime: string | null = null
  let clUnits = 0

  if (type === 'full') {
    if (!fromDate || !toDate) {
      return c.json({ error: 'From date and to date are required' }, 400)
    }
    if (toDate < fromDate) {
      return c.json({ error: 'To date must be on or after from date' }, 400)
    }
    clUnits = countWorkingDays(fromDate, toDate)
  } else if (type === 'half') {
    if (!fromDate || !body.halfSession || !['first', 'second'].includes(body.halfSession)) {
      return c.json({ error: 'Date and half-session are required' }, 400)
    }
    halfSession = body.halfSession
    toDate = fromDate
    clUnits = 0.5
  } else {
    if (!fromDate || !body.startTime || !body.endTime) {
      return c.json({ error: 'Date, start time and end time are required' }, 400)
    }
    startTime = body.startTime
    endTime = body.endTime
    toDate = fromDate
    clUnits = 0

    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const startMinutes = sh * 60 + sm
    const endMinutes = eh * 60 + em

    if (endMinutes <= startMinutes || endMinutes - startMinutes > 120) {
      return c.json({ error: 'Short leave must be within the same day and up to 2 hours' }, 400)
    }
  }

  if (clUnits > 0) {
    const year = fromDate!.slice(0, 4)

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

    const available = allowance - (taken?.total ?? 0) - (pending?.total ?? 0)

    if (clUnits > available) {
      return c.json({ error: 'Insufficient leave balance' }, 422)
    }
  }

  const id = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)

  await c.env.DB.prepare(
    `INSERT INTO leave_applications
       (id, user_id, type, from_date, to_date, half_session, start_time, end_time, reason, substitute_id, cl_units, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  )
    .bind(id, auth.userId, type, fromDate, toDate, halfSession, startTime, endTime, reason, body.substituteId ?? null, clUnits, now)
    .run()

  const requester = await c.env.DB.prepare('SELECT name FROM users WHERE id = ?')
    .bind(auth.userId)
    .first<{ name: string }>()

  const hrUsers = await c.env.DB.prepare(`SELECT id FROM users WHERE role IN ('hr', 'master')`).all<{ id: string }>()

  for (const hr of hrUsers.results) {
    await c.env.DB.prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, read, created_at)
       VALUES (?, ?, 'leave_request', ?, ?, 0, ?)`
    )
      .bind(
        crypto.randomUUID(),
        hr.id,
        `${requester?.name ?? 'A faculty member'} applied for leave`,
        `${type} leave from ${fromDate}`,
        now
      )
      .run()
  }

  const application = await c.env.DB.prepare('SELECT * FROM leave_applications WHERE id = ?').bind(id).first()

  return c.json({ application })
})
