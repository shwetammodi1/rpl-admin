import { createRoute } from '../../../../lib/factory'
import { createAuthToken } from '../../../../lib/jwt'
import type { Role } from '../../../../lib/types'

const MAX_ATTEMPTS = 5

export const POST = createRoute(async (c) => {
  const body = await c.req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const code = typeof body?.code === 'string' ? body.code.trim() : ''

  if (!email || !code) {
    return c.json({ error: 'Email and code are required' }, 400)
  }

  const record = await c.env.DB.prepare(
    'SELECT email, code, expires_at, attempts FROM otp_codes WHERE email = ?'
  )
    .bind(email)
    .first<{ email: string; code: string; expires_at: number; attempts: number }>()

  if (!record) {
    return c.json({ error: 'Invalid or expired code' }, 401)
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return c.json({ error: 'Too many attempts' }, 429)
  }

  const now = Math.floor(Date.now() / 1000)
  const isValid = record.code === code && record.expires_at > now

  if (!isValid) {
    await c.env.DB.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE email = ?')
      .bind(email)
      .run()
    return c.json({ error: 'Invalid or expired code' }, 401)
  }

  await c.env.DB.prepare('DELETE FROM otp_codes WHERE email = ?').bind(email).run()

  const row = await c.env.DB.prepare(
    'SELECT id, name, email, role, department FROM users WHERE email = ?'
  )
    .bind(email)
    .first<{ id: string; name: string; email: string; role: Role; department: string | null }>()

  if (!row) {
    return c.json({ error: 'Invalid or expired code' }, 401)
  }

  const token = await createAuthToken({ userId: row.id, role: row.role }, c.env.JWT_SECRET)

  return c.json({ user: row, token })
})
