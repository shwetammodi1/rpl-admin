import { createRoute } from '../../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../../lib/jwt'
import type { Role } from '../../../../../lib/types'

export const PATCH = createRoute(verifyJWT, requireRole('master'), async (c) => {
  const auth = c.get('authUser')!
  const id = c.req.param('id')

  const target = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?')
    .bind(id)
    .first<{ id: string; role: Role }>()

  if (!target) {
    return c.json({ error: 'User not found' }, 404)
  }

  if (target.role === 'master') {
    const masterCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM users WHERE role = 'master'"
    ).first<{ count: number }>()

    if ((masterCount?.count ?? 0) <= 1) {
      return c.json({ error: 'Cannot revoke the last master admin' }, 400)
    }
  }

  await c.env.DB.prepare("UPDATE users SET role = 'pending', department = NULL WHERE id = ?")
    .bind(id)
    .run()

  await c.env.DB.prepare(
    'INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(
      crypto.randomUUID(),
      auth.userId,
      'role_revoked',
      'user',
      id,
      JSON.stringify({ old_role: target.role }),
      Math.floor(Date.now() / 1000)
    )
    .run()

  const user = await c.env.DB.prepare(
    'SELECT id, name, email, role, department, created_at FROM users WHERE id = ?'
  )
    .bind(id)
    .first()

  return c.json({ user })
})
