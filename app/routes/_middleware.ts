import { getCookie } from 'hono/cookie'
import { SESSION_COOKIE, verifySessionToken } from '../lib/session'
import { createMiddleware } from '../lib/factory'

const auth = createMiddleware(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)
  c.set('user', token ? await verifySessionToken(token, c.env.JWT_SECRET) : null)
  await next()
})

export default [auth]
