import { createRoute } from '../../../../lib/factory'

const TTL_SECONDS = 600 // 10 minutes

export const POST = createRoute(async (c) => {
  const body = await c.req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  // Only issue a code for a known account, but always respond ok so we never
  // leak which emails exist.
  if (email) {
    const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (user) {
      const code = String(Math.floor(100000 + Math.random() * 900000))
      const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS

      await c.env.DB.prepare(
        'INSERT OR REPLACE INTO otp_codes (email, code, expires_at, attempts) VALUES (?, ?, ?, 0)'
      )
        .bind(email, code, expiresAt)
        .run()

      // TODO: send via the email provider once the notifications service is wired (Section 4.6).
      console.log(`[OTP] ${email} -> ${code}`)
    }
  }

  return c.json({ ok: true })
})
