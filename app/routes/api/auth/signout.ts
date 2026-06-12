import { createRoute } from '../../../lib/factory'
import { deleteCookie } from 'hono/cookie'
import { SESSION_COOKIE } from '../../../lib/session'

export const POST = createRoute((c) => {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
  return c.json({ ok: true })
})
