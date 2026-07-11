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
    // TimeWatch upstream fetch API (for the pull integration). When set, a
    // { FromDate, ToDate, DeviceID, UserID } query fetches live punches from here,
    // stores them, and returns them. TIMEWATCH_AUTH is sent as the Authorization header.
    TIMEWATCH_API_URL?: string
    TIMEWATCH_AUTH?: string
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
