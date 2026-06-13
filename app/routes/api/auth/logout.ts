import { createRoute } from '../../../lib/factory'

export const POST = createRoute((c) => {
  return c.json({ ok: true })
})
