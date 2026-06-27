import { createRoute } from '../../../lib/factory'
import { verifyJWT } from '../../../lib/jwt'

type ProfileRow = {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  designation: string | null
  degrees: string | null
  photo: string | null
  bio: string | null
  phone: string | null
  research_papers: string | null
  books_authored: string | null
  patents: string | null
}

// Fields a user may edit on their own profile. Designation / role / email / name
// are intentionally excluded (admin-managed).
const EDITABLE = ['degrees', 'research_papers', 'books_authored', 'patents', 'bio', 'phone', 'photo']

export const GET = createRoute(verifyJWT, async (c) => {
  const auth = c.get('authUser')!
  const row = await c.env.DB.prepare(
    'SELECT id, name, email, role, department, designation, degrees, photo, bio, phone, research_papers, books_authored, patents FROM users WHERE id = ?'
  )
    .bind(auth.userId)
    .first<ProfileRow>()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

export const PATCH = createRoute(verifyJWT, async (c) => {
  const auth = c.get('authUser')!
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return c.json({ error: 'Invalid body' }, 400)

  const sets: string[] = []
  const vals: unknown[] = []
  for (const f of EDITABLE) {
    if (f in body) {
      sets.push(`${f} = ?`)
      const v = body[f]
      vals.push(v == null || v === '' ? null : String(v))
    }
  }
  if (sets.length === 0) return c.json({ error: 'Nothing to update' }, 400)

  vals.push(auth.userId)
  await c.env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...vals)
    .run()
  return c.json({ ok: true })
})
