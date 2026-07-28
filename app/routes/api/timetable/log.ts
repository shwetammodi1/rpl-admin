import { createRoute } from '../../../lib/factory'
import { verifyJWT } from '../../../lib/jwt'

// Per-lecture, per-date log (attendance summary + topic taught).
// A faculty may only log their own lectures; a master may log any.

async function ownsSlot(db: D1Database, slotId: string, userId: string, role: string) {
  if (role === 'master' || role === 'hr') return true
  const row = await db.prepare('SELECT faculty_id FROM timetable_slots WHERE id = ?').bind(slotId).first<{ faculty_id: string | null }>()
  return !!row && row.faculty_id === userId
}

// GET /api/timetable/log?slotId=&date=  -> the log for that lecture+date (or null)
export const GET = createRoute(verifyJWT, async (c) => {
  const slotId = c.req.query('slotId')
  const date = c.req.query('date')
  if (!slotId || !date) return c.json({ error: 'slotId and date are required' }, 400)

  const log = await c.env.DB.prepare(
    `SELECT id, slot_id, log_date, status, present_count, total_count, topic, remarks, present_students
       FROM lecture_logs WHERE slot_id = ? AND log_date = ?`
  )
    .bind(slotId, date)
    .first()

  return c.json({ log: log ?? null })
})

// POST /api/timetable/log  -> upsert the log for {slotId, date}
export const POST = createRoute(verifyJWT, async (c) => {
  const auth = c.get('authUser')!
  const b = (await c.req.json().catch(() => null)) as {
    slotId?: string
    date?: string
    status?: string
    presentCount?: number | null
    totalCount?: number | null
    topic?: string
    remarks?: string
    presentStudents?: string
  } | null

  if (!b?.slotId || !b?.date) return c.json({ error: 'slotId and date are required' }, 400)
  if (!(await ownsSlot(c.env.DB, b.slotId, auth.userId, auth.role))) {
    return c.json({ error: 'You can only log your own lectures' }, 403)
  }

  const status = b.status === 'cancelled' ? 'cancelled' : 'conducted'
  await c.env.DB.prepare(
    `INSERT INTO lecture_logs (id, slot_id, faculty_id, log_date, status, present_count, total_count, topic, remarks, present_students)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slot_id, log_date) DO UPDATE SET
       status = excluded.status,
       present_count = excluded.present_count,
       total_count = excluded.total_count,
       topic = excluded.topic,
       remarks = excluded.remarks,
       present_students = excluded.present_students,
       updated_at = strftime('%s','now') * 1000`
  )
    .bind(
      crypto.randomUUID(),
      b.slotId,
      auth.userId,
      b.date,
      status,
      b.presentCount ?? null,
      b.totalCount ?? null,
      b.topic ?? null,
      b.remarks ?? null,
      b.presentStudents ?? null
    )
    .run()

  return c.json({ ok: true })
})
