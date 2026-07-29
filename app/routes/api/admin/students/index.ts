import { createRoute } from '../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../lib/jwt'

// List students, optionally filtered by class (course/semester/section).
export const GET = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const course = c.req.query('course')
  const semester = c.req.query('semester')
  const section = c.req.query('section')

  const where: string[] = []
  const params: unknown[] = []
  if (course) { where.push('course = ?'); params.push(course) }
  if (semester) { where.push('semester = ?'); params.push(semester) }
  if (section) { where.push('section = ?'); params.push(section) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const { results } = await c.env.DB.prepare(
    `SELECT id, roll_no, name, course, semester, section, department
       FROM students ${clause}
      ORDER BY course, semester, section, CAST(roll_no AS INTEGER), name`
  )
    .bind(...params)
    .all()

  // Distinct classes present (handy for the picker)
  const classes = await c.env.DB.prepare(
    `SELECT course, semester, section, COUNT(*) AS n
       FROM students GROUP BY course, semester, section
      ORDER BY course, semester, section`
  ).all()

  return c.json({ students: results, classes: classes.results })
})

type Row = { rollNo?: string; name?: string; course?: string; semester?: string; section?: string; department?: string }

// Bulk import (upsert by roll_no within a class). Master only.
export const POST = createRoute(verifyJWT, requireRole('master'), async (c) => {
  const body = (await c.req.json().catch(() => null)) as { students?: Row[]; replace?: boolean } | null
  const rows = body?.students
  if (!Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: 'No students provided' }, 400)
  }

  const db = c.env.DB
  let imported = 0
  let skipped = 0

  const stmts = []
  for (const r of rows) {
    const name = (r.name ?? '').trim()
    if (!name) { skipped++; continue }
    const rollNo = (r.rollNo ?? '').trim() || null
    const course = (r.course ?? '').trim() || null
    const semester = (r.semester ?? '').trim() || null
    const section = (r.section ?? '').trim() || null
    const department = (r.department ?? '').trim() || null

    // Upsert on (roll_no, class) when a roll number is present; else insert.
    if (rollNo) {
      stmts.push(
        db.prepare(
          `INSERT INTO students (id, roll_no, name, course, semester, section, department)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(roll_no, course, semester, section) DO UPDATE SET
             name = excluded.name, department = excluded.department`
        ).bind(crypto.randomUUID(), rollNo, name, course, semester, section, department)
      )
    } else {
      stmts.push(
        db.prepare(
          `INSERT INTO students (id, roll_no, name, course, semester, section, department)
           VALUES (?, NULL, ?, ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), name, course, semester, section, department)
      )
    }
    imported++
  }

  if (stmts.length) await db.batch(stmts)
  return c.json({ ok: true, imported, skipped })
})
