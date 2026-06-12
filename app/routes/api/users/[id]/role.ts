import { createRoute } from '../../../../lib/factory'
import type { Role } from '../../../../lib/session'

const ASSIGNABLE_ROLES: Role[] = ['admin', 'viewer']

export const POST = createRoute(async (c) => {
  const currentUser = c.get('user')
  if (!currentUser || currentUser.role !== 'master_admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) {
    return c.json({ error: 'Invalid user id' }, 400)
  }
  if (id === currentUser.sub) {
    return c.json({ error: 'You cannot change your own role' }, 400)
  }

  const body = await c.req.json().catch(() => null)
  const role = body?.role as Role | undefined
  if (!role || !ASSIGNABLE_ROLES.includes(role)) {
    return c.json({ error: `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}` }, 400)
  }

  const target = await c.env.DB.prepare('SELECT role FROM users WHERE id = ?')
    .bind(id)
    .first<{ role: Role }>()
  if (!target) {
    return c.json({ error: 'User not found' }, 404)
  }
  if (target.role === 'master_admin') {
    return c.json({ error: 'Cannot change the role of a master admin' }, 400)
  }

  await c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, id).run()

  return c.json({ ok: true })
})
