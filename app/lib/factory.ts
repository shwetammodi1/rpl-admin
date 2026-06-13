import { createFactory } from 'hono/factory'
import type { AuthPayload } from './types'

export type AppEnv = {
  Bindings: Env
  Variables: {
    authUser?: AuthPayload | null
  }
}

const factory = createFactory<AppEnv>()

export const createRoute = factory.createHandlers
export const createMiddleware = factory.createMiddleware
