import { createRoute } from '../../../lib/factory'
import { hashPassword } from '../../../lib/password'
import { createSessionToken, SESSION_COOKIE } from '../../../lib/session'
import { setCookie } from 'hono/cookie'

export const POST = createRoute(async (c) => {
  const body = await c.req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!email || !password || !name) {
    return c.json({ error: 'Name, email and password are required' }, 400)
  }
  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) {
    return c.json({ error: 'An account with this email already exists' }, 409)
  }

  // The very first registered user becomes master admin, everyone else starts as a viewer.
  const { count } = (await c.env.DB.prepare('SELECT COUNT(*) AS count FROM users').first()) as { count: number }
  const role = count === 0 ? 'master_admin' : 'viewer'

  const passwordHash = await hashPassword(password)
  const inserted = await c.env.DB.prepare(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?) RETURNING id'
  )
    .bind(email, passwordHash, name, role)
    .first<{ id: number }>()

  const user = { sub: inserted!.id, email, name, role: role as 'master_admin' | 'viewer' }
  const token = await createSessionToken(user, c.env.JWT_SECRET)
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return c.json({ user }, 201)
})
