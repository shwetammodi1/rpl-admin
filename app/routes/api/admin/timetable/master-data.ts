import { createRoute } from '../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../lib/jwt'

// Dropdown data for the admin timetable screens: subjects, classrooms and the
// faculty list (from the existing users table — no duplicate faculty store).
export const GET = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const db = c.env.DB

  const [subjects, classrooms, faculty] = await Promise.all([
    db.prepare('SELECT id, code, name, colour, department FROM subjects ORDER BY name').all(),
    db.prepare('SELECT id, name, building, capacity FROM classrooms ORDER BY building, name').all(),
    db
      .prepare(
        `SELECT id, name, department, designation FROM users
          WHERE role IN ('faculty','hr','master') AND name IS NOT NULL
          ORDER BY name`
      )
      .all(),
  ])

  return c.json({
    subjects: subjects.results,
    classrooms: classrooms.results,
    faculty: faculty.results,
  })
})
