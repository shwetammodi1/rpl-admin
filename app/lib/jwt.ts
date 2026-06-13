import { sign, verify } from 'hono/jwt'
import { createMiddleware } from './factory'
import type { AuthPayload, Role } from './types'

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export async function createAuthToken(payload: AuthPayload, secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  return sign({ ...payload, exp }, secret, 'HS256')
}

export async function verifyAuthToken(token: string, secret: string): Promise<AuthPayload | null> {
  try {
    const payload = await verify(token, secret, 'HS256')
    return payload as unknown as AuthPayload
  } catch {
    return null
  }
}

export const verifyJWT = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const payload = await verifyAuthToken(token, c.env.JWT_SECRET)
  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('authUser', payload)
  await next()
})

export const requireRole = (...roles: Role[]) =>
  createMiddleware(async (c, next) => {
    const auth = c.get('authUser')
    if (!auth || !roles.includes(auth.role)) {
      return c.json({ error: 'Forbidden' }, 403)
    }
    await next()
  })
