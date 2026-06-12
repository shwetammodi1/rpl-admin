import { createRoute } from '../../../lib/factory'
import { verifyPassword } from '../../../lib/password'
import { createSessionToken, SESSION_COOKIE, type Role } from '../../../lib/session'
import { setCookie } from 'hono/cookie'

export const POST = createRoute(async (c) => {
  const body = await c.req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }

  const row = await c.env.DB.prepare(
    'SELECT id, email, name, role, password_hash FROM users WHERE email = ?'
  )
    .bind(email)
    .first<{ id: number; email: string; name: string; role: Role; password_hash: string }>()

  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const user = { sub: row.id, email: row.email, name: row.name, role: row.role }
  const token = await createSessionToken(user, c.env.JWT_SECRET)
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return c.json({ user })
})
