import { createRoute } from '../../../lib/factory'

export const GET = createRoute(async (c) => {
  const user = c.get('user')
  if (!user || user.role !== 'master_admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const { results } = await c.env.DB.prepare(
    'SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC'
  ).all()

  return c.json({ users: results })
})
