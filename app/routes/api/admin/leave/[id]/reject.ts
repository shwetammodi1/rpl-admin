import { createRoute } from '../../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../../lib/jwt'

export const PATCH = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const auth = c.get('authUser')!
  const id = c.req.param('id')
  const body = await c.req.json<{ comment?: string }>().catch(() => ({}) as { comment?: string })
  const comment = body.comment?.trim() || null

  const application = await c.env.DB.prepare('SELECT id, user_id, status FROM leave_applications WHERE id = ?')
    .bind(id)
    .first<{ id: string; user_id: string; status: string }>()

  if (!application) {
    return c.json({ error: 'Application not found' }, 404)
  }

  if (application.status !== 'pending') {
    return c.json({ error: 'Only pending applications can be rejected' }, 400)
  }

  const now = Math.floor(Date.now() / 1000)

  await c.env.DB.prepare(
    "UPDATE leave_applications SET status = 'rejected', reviewed_by = ?, review_comment = ?, reviewed_at = ? WHERE id = ?"
  )
    .bind(auth.userId, comment, now, id)
    .run()

  const reason = comment ?? 'No reason provided'
  await c.env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, read, created_at)
     VALUES (?, ?, 'leave_request', 'Leave rejected', ?, 0, ?)`
  )
    .bind(crypto.randomUUID(), application.user_id, `Your leave request was rejected. Reason: ${reason}`, now)
    .run()

  const updated = await c.env.DB.prepare('SELECT * FROM leave_applications WHERE id = ?').bind(id).first()

  return c.json({ application: updated })
})
