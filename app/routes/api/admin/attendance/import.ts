import { createRoute } from '../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../lib/jwt'
import { ensureDevice, ingestPunch, parsePunchTime } from '../../../../lib/biometric'

type Punch = { time: string; dir: 'in' | 'out' | null }
type Row = { date: string; payCode: string; name?: string; punches: Punch[] }
type Body = { rows?: Row[] }

const IMPORT_DEVICE = 'TimeWatch-Import'
// Not in salt:hash format, so imported employee records can never be logged into
// until HR explicitly sets a password for them.
const NO_LOGIN = '!imported'

// Bulk-import attendance exported from the TimeWatch software. The export rows
// carry Pay Code + Employee Name + per-day punch times; we (1) ensure a faculty
// record exists for each Pay Code (mapped via biometric_ref) and (2) ingest the
// punches idempotently so they fold into the attendance calendar like device data.
export const POST = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const body = await c.req.json<Body>().catch(() => null)
  const rows = body?.rows
  if (!Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: 'No rows provided' }, 400)
  }

  const db = c.env.DB
  const deviceId = await ensureDevice(db, IMPORT_DEVICE)

  // 1) Ensure an employee (faculty) record exists for each Pay Code.
  const names = new Map<string, string>()
  for (const r of rows) {
    const code = String(r.payCode ?? '').trim()
    if (code && !names.has(code)) names.set(code, (r.name ?? '').trim() || `Employee ${code}`)
  }

  let employeesCreated = 0
  for (const [code, name] of names) {
    const existing = await db
      .prepare('SELECT id FROM users WHERE biometric_ref = ?')
      .bind(code)
      .first<{ id: string }>()
    if (existing) continue
    const res = await db
      .prepare(
        `INSERT OR IGNORE INTO users (id, name, email, password_hash, role, biometric_ref)
         VALUES (?, ?, ?, ?, 'faculty', ?)`
      )
      .bind(crypto.randomUUID(), name, `bio-${code}@rplmaheshwari.local`, NO_LOGIN, code)
      .run()
    if ((res.meta?.changes ?? 0) > 0) employeesCreated++
  }

  // 2) Ingest each punch (idempotent + auto-maps to the attendance table).
  let punchesAdded = 0
  let duplicates = 0
  let skipped = 0
  for (const r of rows) {
    const code = String(r.payCode ?? '').trim()
    const date = String(r.date ?? '').trim()
    if (!code || !date || !Array.isArray(r.punches)) {
      skipped++
      continue
    }
    for (const p of r.punches) {
      const ms = parsePunchTime(`${date} ${p?.time ?? ''}`)
      if (ms == null) {
        skipped++
        continue
      }
      const dir = p.dir === 'out' ? 'out' : p.dir === 'in' ? 'in' : null
      const inserted = await ingestPunch(db, deviceId, code, ms, dir)
      if (inserted) punchesAdded++
      else duplicates++
    }
  }

  return c.json({ ok: true, employees: names.size, employeesCreated, punchesAdded, duplicates, skipped })
})
