import { createRoute } from '../../../lib/factory'
import { verifyPassword } from '../../../lib/password'
import { createAuthToken } from '../../../lib/jwt'
import type { Role } from '../../../lib/types'

export const POST = createRoute(async (c) => {
  const body = await c.req.json().catch(() => null)
  const rawIdentifier = body?.emailOrUsername ?? body?.email
  const identifier = typeof rawIdentifier === 'string' ? rawIdentifier.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!identifier || !password) {
    return c.json({ error: 'Email or username and password are required' }, 400)
  }

  const row = await c.env.DB.prepare(
    'SELECT id, name, email, password_hash, role, department FROM users WHERE LOWER(email) = ? OR LOWER(name) = ?'
  )
    .bind(identifier, identifier)
    .first<{ id: string; name: string; email: string; password_hash: string; role: Role; department: string | null }>()

  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
  }
  const token = await createAuthToken({ userId: row.id, role: row.role }, c.env.JWT_SECRET)

  return c.json({ user, token })
})
