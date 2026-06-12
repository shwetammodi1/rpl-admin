import { sign, verify } from 'hono/jwt'

export type Role = 'master_admin' | 'admin' | 'viewer'

export type SessionUser = {
  sub: number
  email: string
  name: string
  role: Role
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export const SESSION_COOKIE = 'session'

export async function createSessionToken(user: SessionUser, secret: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  return sign({ ...user, exp }, secret)
}

export async function verifySessionToken(token: string, secret: string): Promise<SessionUser | null> {
  try {
    const payload = await verify(token, secret, 'HS256')
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}
