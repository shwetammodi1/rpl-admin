import { createRoute } from '../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../lib/jwt'

type Body = { userId?: string; date?: string }

// HR/Master marks an absent day as leave directly from the attendance calendar.
export const PATCH = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const body = await c.req.json<Body>().catch(() => null)
  const userId = body?.userId
  const date = body?.date

  if (!userId || !date) {
    return c.json({ error: 'userId and date are required' }, 400)
  }

  const user = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first<{ id: string }>()
  if (!user) {
    return c.json({ error: 'Employee not found' }, 404)
  }

  await c.env.DB.prepare(
    `INSERT INTO attendance (id, user_id, date, status, source)
     VALUES (?, ?, ?, 'leave', 'manual')
     ON CONFLICT (user_id, date) DO UPDATE SET status = 'leave', source = 'manual'`
  )
    .bind(crypto.randomUUID(), userId, date)
    .run()

  return c.json({ ok: true })
})
