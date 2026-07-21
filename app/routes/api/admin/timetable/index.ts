import { createRoute } from '../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../lib/jwt'
import { findConflicts } from '../../../../lib/timetableConflicts'

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

type SlotBody = {
  facultyId?: string
  subjectId?: string
  classroomId?: string
  day?: number
  startTime?: string
  endTime?: string
  department?: string
  course?: string
  semester?: string
  section?: string
  lectureType?: string
  status?: string
  notes?: string
  academicYear?: string
  force?: boolean
}

// Create a lecture slot.
export const POST = createRoute(verifyJWT, requireRole('master'), async (c) => {
  const b = (await c.req.json().catch(() => null)) as SlotBody | null
  if (!b || !b.day || !b.startTime || !b.endTime) {
    return c.json({ error: 'day, startTime and endTime are required' }, 400)
  }

  // Clash check — same faculty / room / class at an overlapping time.
  if (!b.force) {
    const conflicts = await findConflicts(c.env.DB, {
      day: b.day,
      startTime: b.startTime,
      endTime: b.endTime,
      facultyId: b.facultyId,
      classroomId: b.classroomId,
      course: b.course,
      semester: b.semester,
      section: b.section,
    })
    if (conflicts.length) {
      return c.json({ error: 'Conflict detected', conflicts }, 409)
    }
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO timetable_slots
       (id, faculty_id, subject_id, classroom_id, day, start_time, end_time,
        department, course, semester, section, lecture_type, status, notes, academic_year)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      b.facultyId ?? null,
      b.subjectId ?? null,
      b.classroomId ?? null,
      b.day,
      b.startTime,
      b.endTime,
      b.department ?? null,
      b.course ?? null,
      b.semester ?? null,
      b.section ?? null,
      b.lectureType ?? 'Theory',
      b.status === 'published' ? 'published' : 'draft',
      b.notes ?? null,
      b.academicYear ?? null
    )
    .run()

  return c.json({ ok: true, id })
})
