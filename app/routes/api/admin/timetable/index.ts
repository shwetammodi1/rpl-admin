import { createRoute } from '../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../lib/jwt'

// College-wide timetable for admins. Optional filters: facultyId, day,
// department, status. Phase 8 adds POST/PATCH/DELETE here.
export const GET = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const facultyId = c.req.query('facultyId')
  const day = c.req.query('day')
  const department = c.req.query('department')
  const status = c.req.query('status')

  const where: string[] = []
  const params: unknown[] = []
  if (facultyId) { where.push('t.faculty_id = ?'); params.push(facultyId) }
  if (day) { where.push('t.day = ?'); params.push(Number(day)) }
  if (department) { where.push('t.department = ?'); params.push(department) }
  if (status) { where.push('t.status = ?'); params.push(status) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const { results } = await c.env.DB.prepare(
    `SELECT t.id, t.faculty_id, t.subject_id, t.classroom_id, t.day, t.start_time, t.end_time,
            t.department, t.course, t.semester, t.section, t.lecture_type, t.status, t.notes,
            t.academic_year,
            s.name AS subject, s.colour AS colour,
            c.name AS room, c.building AS building,
            u.name AS faculty
       FROM timetable_slots t
       LEFT JOIN subjects   s ON s.id = t.subject_id
       LEFT JOIN classrooms c ON c.id = t.classroom_id
       LEFT JOIN users      u ON u.id = t.faculty_id
       ${clause}
      ORDER BY t.day, t.start_time`
  )
    .bind(...params)
    .all()

  return c.json({ slots: results })
})
