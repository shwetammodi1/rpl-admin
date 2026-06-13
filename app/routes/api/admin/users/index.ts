import { createRoute } from '../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../lib/jwt'
import type { Role } from '../../../../lib/types'

const ROLES: Role[] = ['pending', 'faculty', 'hr', 'master']

export const GET = createRoute(verifyJWT, requireRole('master'), async (c) => {
  const role = c.req.query('role')
  const search = c.req.query('search')?.trim()

  const conditions: string[] = []
  const params: unknown[] = []

  if (role && (ROLES as string[]).includes(role)) {
    conditions.push('role = ?')
    params.push(role)
  }

  if (search) {
    conditions.push('(name LIKE ? OR email LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const { results } = await c.env.DB.prepare(
    `SELECT id, name, email, role, department, created_at FROM users ${where} ORDER BY CASE WHEN role = 'pending' THEN 0 ELSE 1 END, created_at DESC`
  )
    .bind(...params)
    .all()

  return c.json({ users: results })
})
