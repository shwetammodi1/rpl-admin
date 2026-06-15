import { createRoute } from '../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../lib/jwt'

type Row = {
  id: string
  type: string
  title: string
  message: string | null
  read: number
  created_at: number
}

export const GET = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const auth = c.get('authUser')!
  const limit = Number(c.req.query('limit') ?? '20')
  const unread = c.req.query('unread') === 'true'

  const { results } = await c.env.DB.prepare(
    `SELECT id, type, title, message, read, created_at FROM notifications
     WHERE user_id = ?${unread ? ' AND read = 0' : ''} ORDER BY created_at DESC LIMIT ?`
  )
    .bind(auth.userId, limit)
    .all<Row>()

  const notifications = results.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    read: row.read === 1,
  }))

  return c.json({ notifications })
})
