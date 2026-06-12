import {} from 'hono'
import type { SessionUser } from './lib/session'

declare global {
  interface Env {
    JWT_SECRET: string
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
    user: SessionUser | null
  }
}
