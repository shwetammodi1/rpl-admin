import { createFactory } from 'hono/factory'
import type { SessionUser } from './session'

export type AppEnv = {
  Bindings: Env
  Variables: {
    user: SessionUser | null
  }
}

const factory = createFactory<AppEnv>()

export const createRoute = factory.createHandlers
export const createMiddleware = factory.createMiddleware
