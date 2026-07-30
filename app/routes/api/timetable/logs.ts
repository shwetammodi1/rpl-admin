import { createRoute } from '../../../lib/factory'
import { verifyJWT } from '../../../lib/jwt'

// Lecture logs (attendance + topic) over a date range, for the downloadable
// report. Faculty get only their own; hr/master get all (optional facultyId).
export const GET = createRoute(verifyJWT, async (c) => {
  const auth = c.get('authUser')!
  const isAdmin = auth.role === 'master' || auth.role === 'hr'
  const from = c.req.query('from') ?? ''
  const to = c.req.query('to') ?? ''
  if (!from || !to) return c.json({ error: 'from and to are required' }, 400)

  const facultyId = isAdmin ? c.req.query('facultyId') : auth.userId

  const where = ['l.log_date >= ?', 'l.log_date <= ?']
  const params: unknown[] = [from, to]
  if (facultyId) { where.push('t.faculty_id = ?'); params.push(facultyId) }

  const { results } = await c.env.DB.prepare(
    `SELECT l.log_date, l.status, l.present_count, l.total_count, l.topic, l.remarks, l.present_students,
            t.day, t.start_time, t.end_time, t.course, t.semester, t.section,
            s.name AS subject, u.name AS faculty, c.name AS room
       FROM lecture_logs l
       JOIN timetable_slots t ON t.id = l.slot_id
       LEFT JOIN subjects   s ON s.id = t.subject_id
       LEFT JOIN users      u ON u.id = t.faculty_id
       LEFT JOIN classrooms c ON c.id = t.classroom_id
      WHERE ${where.join(' AND ')}
      ORDER BY l.log_date, t.start_time`
  )
    .bind(...params)
    .all()

  return c.json({ logs: results })
})
