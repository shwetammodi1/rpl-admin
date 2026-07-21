import { createRoute } from '../../../lib/factory'
import { verifyJWT } from '../../../lib/jwt'

// Logged-in user's own published timetable. Faculty may only ever see this.
export const GET = createRoute(verifyJWT, async (c) => {
  const auth = c.get('authUser')!

  const { results } = await c.env.DB.prepare(
    `SELECT t.id, t.day, t.start_time, t.end_time, t.department, t.course, t.semester,
            t.section, t.lecture_type, t.status, t.notes,
            s.name AS subject, s.colour AS colour,
            c.name AS room, c.building AS building, c.capacity AS capacity,
            u.name AS faculty
       FROM timetable_slots t
       LEFT JOIN subjects   s ON s.id = t.subject_id
       LEFT JOIN classrooms c ON c.id = t.classroom_id
       LEFT JOIN users      u ON u.id = t.faculty_id
      WHERE t.faculty_id = ? AND t.status = 'published'
      ORDER BY t.day, t.start_time`
  )
    .bind(auth.userId)
    .all()

  return c.json({ lectures: results })
})
