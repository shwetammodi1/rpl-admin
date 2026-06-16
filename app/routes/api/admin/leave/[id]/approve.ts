import { createRoute } from '../../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../../lib/jwt'
import { sendNotification, notifyAsync } from '../../../../../lib/notify'

type Application = {
  id: string
  user_id: string
  type: string
  from_date: string
  to_date: string
  cl_units: number | null
  status: string
}

// Enumerate the calendar dates a leave covers, excluding Sundays for full-day leave.
function affectedDates(type: string, fromDate: string, toDate: string): string[] {
  if (type !== 'full') return [fromDate]

  const [fy, fm, fd] = fromDate.split('-').map(Number)
  const [ty, tm, td] = toDate.split('-').map(Number)
  const cursor = new Date(fy, fm - 1, fd)
  const end = new Date(ty, tm - 1, td)
  const dates: string[] = []
  while (cursor <= end) {
    if (cursor.getDay() !== 0) {
      dates.push(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
      )
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

const ATTENDANCE_STATUS: Record<string, string> = {
  full: 'leave',
  half: 'half',
  short: 'short',
}

export const PATCH = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const auth = c.get('authUser')!
  const id = c.req.param('id')
  const body = await c.req.json<{ comment?: string }>().catch(() => ({}) as { comment?: string })
  const comment = body.comment?.trim() || null

  const application = await c.env.DB.prepare(
    'SELECT id, user_id, type, from_date, to_date, cl_units, status FROM leave_applications WHERE id = ?'
  )
    .bind(id)
    .first<Application>()

  if (!application) {
    return c.json({ error: 'Application not found' }, 404)
  }

  if (application.status !== 'pending') {
    return c.json({ error: 'Only pending applications can be approved' }, 400)
  }

  const clUnits = application.cl_units ?? 0

  // Race-condition guard: re-check the balance against currently approved leave.
  if (clUnits > 0) {
    const year = application.from_date.slice(0, 4)

    const config = await c.env.DB.prepare('SELECT cl_allowance FROM leave_config WHERE year = ?')
      .bind(Number(year))
      .first<{ cl_allowance: number }>()
    const allowance = config?.cl_allowance ?? 12.0

    const taken = await c.env.DB.prepare(
      `SELECT COALESCE(SUM(cl_units), 0) AS total FROM leave_applications
       WHERE user_id = ? AND status = 'approved' AND strftime('%Y', from_date) = ?`
    )
      .bind(application.user_id, year)
      .first<{ total: number }>()

    if (clUnits > allowance - (taken?.total ?? 0)) {
      return c.json({ error: 'Insufficient leave balance' }, 422)
    }
  }

  const now = Math.floor(Date.now() / 1000)

  await c.env.DB.prepare(
    "UPDATE leave_applications SET status = 'approved', reviewed_by = ?, review_comment = ?, reviewed_at = ? WHERE id = ?"
  )
    .bind(auth.userId, comment, now, id)
    .run()

  // Write attendance rows for each affected day.
  const status = ATTENDANCE_STATUS[application.type] ?? 'leave'
  for (const date of affectedDates(application.type, application.from_date, application.to_date)) {
    await c.env.DB.prepare(
      `INSERT INTO attendance (id, user_id, date, status, source)
       VALUES (?, ?, ?, ?, 'leave')
       ON CONFLICT (user_id, date) DO UPDATE SET status = excluded.status, source = excluded.source`
    )
      .bind(crypto.randomUUID(), application.user_id, date, status)
      .run()
  }

  await c.env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, read, created_at)
     VALUES (?, ?, 'leave_request', 'Leave approved', ?, 0, ?)`
  )
    .bind(
      crypto.randomUUID(),
      application.user_id,
      `Your ${application.type} leave from ${application.from_date} has been approved`,
      now
    )
    .run()

  const updated = await c.env.DB.prepare('SELECT * FROM leave_applications WHERE id = ?').bind(id).first()

  const data = { type: application.type, fromDate: application.from_date }
  notifyAsync(c, sendNotification(c.env, application.user_id, 'email', 'leave_approved', data))
  notifyAsync(c, sendNotification(c.env, application.user_id, 'sms', 'leave_approved', data))

  return c.json({ application: updated })
})
