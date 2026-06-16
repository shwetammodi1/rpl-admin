import {} from 'hono'
import type { AuthPayload } from './lib/types'

declare global {
  interface Env {
    JWT_SECRET: string
    RESEND_API_KEY?: string
    RESEND_FROM?: string
    MSG91_AUTHKEY?: string
    MSG91_SENDER?: string
    BIOMETRIC_PUSH_USER?: string
    BIOMETRIC_PUSH_PASS?: string
  }
}

declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      head?: { title?: string }
    ): Response
  }
  interface ContextVariableMap {
    authUser?: AuthPayload | null
  }
}
