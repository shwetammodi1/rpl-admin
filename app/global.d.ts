import {} from 'hono'
import type { AuthPayload } from './lib/types'

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
    authUser?: AuthPayload | null
  }
}
