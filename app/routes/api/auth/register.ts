import { createRoute } from '../../../lib/factory'
import { hashPassword } from '../../../lib/password'
import { createAuthToken } from '../../../lib/jwt'

export const POST = createRoute(async (c) => {
  const body = await c.req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!name || !email || !password) {
    return c.json({ error: 'Name, email and password are required' }, 400)
  }
  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) {
    return c.json({ error: 'An account with this email already exists' }, 409)
  }

  const id = crypto.randomUUID()
  const passwordHash = await hashPassword(password)

  await c.env.DB.prepare(
    'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(id, name, email, passwordHash, 'pending')
    .run()

  const user = { id, name, email, role: 'pending' as const }
  const token = await createAuthToken({ userId: id, role: 'pending' }, c.env.JWT_SECRET)

  return c.json({ user, token }, 201)
})
