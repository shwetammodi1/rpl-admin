import { createRoute } from '../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../lib/jwt'

export const PATCH = createRoute(verifyJWT, requireRole('faculty'), async (c) => {
  const auth = c.get('authUser')!
  const id = c.req.param('id')

  const application = await c.env.DB.prepare(
    'SELECT id, user_id, status FROM leave_applications WHERE id = ?'
  )
    .bind(id)
    .first<{ id: string; user_id: string; status: string }>()

  if (!application || application.user_id !== auth.userId) {
    return c.json({ error: 'Application not found' }, 404)
  }

  if (application.status !== 'pending') {
    return c.json({ error: 'Only pending applications can be cancelled' }, 400)
  }

  await c.env.DB.prepare("UPDATE leave_applications SET status = 'cancelled' WHERE id = ?")
    .bind(id)
    .run()

  const updated = await c.env.DB.prepare('SELECT * FROM leave_applications WHERE id = ?')
    .bind(id)
    .first()

  return c.json({ application: updated })
})
