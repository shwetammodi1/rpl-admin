import { createRoute } from '../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../lib/jwt'

// Editable columns, mapped from the JSON body key to the DB column.
const FIELDS: Record<string, string> = {
  facultyId: 'faculty_id',
  subjectId: 'subject_id',
  classroomId: 'classroom_id',
  day: 'day',
  startTime: 'start_time',
  endTime: 'end_time',
  department: 'department',
  course: 'course',
  semester: 'semester',
  section: 'section',
  lectureType: 'lecture_type',
  status: 'status',
  notes: 'notes',
  academicYear: 'academic_year',
}

export const PATCH = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const id = c.req.param('id')
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return c.json({ error: 'Invalid body' }, 400)

  const sets: string[] = []
  const vals: unknown[] = []
  for (const [key, col] of Object.entries(FIELDS)) {
    if (key in body) {
      sets.push(`${col} = ?`)
      const v = body[key]
      vals.push(v === '' || v === undefined ? null : v)
    }
  }
  if (sets.length === 0) return c.json({ error: 'Nothing to update' }, 400)

  sets.push("updated_at = strftime('%s','now') * 1000")
  vals.push(id)

  await c.env.DB.prepare(`UPDATE timetable_slots SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...vals)
    .run()

  return c.json({ ok: true })
})

export const DELETE = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM timetable_slots WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})
