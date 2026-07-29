import { createRoute } from '../../../lib/factory'
import { verifyJWT } from '../../../lib/jwt'

// Students of the class a given lecture belongs to (course + semester + section),
// used to build the one-click attendance list in the lecture log.
export const GET = createRoute(verifyJWT, async (c) => {
  const slotId = c.req.query('slotId')
  if (!slotId) return c.json({ error: 'slotId is required' }, 400)

  const slot = await c.env.DB.prepare(
    'SELECT course, semester, section FROM timetable_slots WHERE id = ?'
  )
    .bind(slotId)
    .first<{ course: string | null; semester: string | null; section: string | null }>()

  if (!slot) return c.json({ students: [], klass: null })

  const { results } = await c.env.DB.prepare(
    `SELECT id, roll_no, name FROM students
      WHERE course IS ? AND semester IS ? AND section IS ?
      ORDER BY CAST(roll_no AS INTEGER), name`
  )
    .bind(slot.course, slot.semester, slot.section)
    .all()

  return c.json({
    students: results,
    klass: [slot.course, slot.semester, slot.section].filter(Boolean).join(' '),
  })
})
