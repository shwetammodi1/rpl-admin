import { createRoute } from '../../../lib/factory'
import { verifyJWT } from '../../../lib/jwt'

export const GET = createRoute(verifyJWT, async (c) => {
  const auth = c.get('authUser')!

  const row = await c.env.DB.prepare(
    'SELECT id, name, email, role, department, designation, degrees FROM users WHERE id = ?'
  )
    .bind(auth.userId)
    .first<{
      id: string
      name: string
      email: string
      role: string
      department: string | null
      designation: string | null
      degrees: string | null
    }>()

  if (!row) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json(row)
})
