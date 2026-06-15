import { createRoute } from '../../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../../lib/jwt'

export const PATCH = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const auth = c.get('authUser')!
  const id = c.req.param('id')

  await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
    .bind(id, auth.userId)
    .run()

  return c.json({ ok: true })
})
