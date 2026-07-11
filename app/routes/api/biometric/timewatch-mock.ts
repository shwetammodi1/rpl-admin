import { createRoute } from '../../../lib/factory'
import { parseIncoming, pickDeviceId, pickField, pickRef } from '../../../lib/biometric'

// MOCK TimeWatch fetch API — a stand-in for the real TimeWatch cloud, for TESTING.
// Given { FromDate, ToDate, DeviceID, UserID } it returns generated in/out punches
// for that user across the date range, in TimeWatch's response shape. The main
// /timewatch endpoint (pull mode) can point at this so a { FromDate, ToDate, ... }
// call pulls from here, stores the punches, and returns them.
// Replace with the REAL TimeWatch URL when available (just change TIMEWATCH_API_URL).

const FROM_KEYS = ['FromDate', 'fromDate', 'from_date', 'from']
const TO_KEYS = ['ToDate', 'toDate', 'to_date', 'to']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export const POST = createRoute(async (c) => {
  const raw = await c.req.text()
  const body = parseIncoming(raw, c.req.header('Content-Type'))

  const from = String(pickField(body, FROM_KEYS) ?? '').slice(0, 10)
  const to = String(pickField(body, TO_KEYS) ?? '').slice(0, 10)
  const uid = pickRef(body) || '221013'
  const dev = pickDeviceId(body) || 'TW6000PW02240232'

  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return c.json({ Success: false, Message: 'Invalid FromDate/ToDate.', Data: [] }, 400)
  }

  const Data: Record<string, string>[] = []
  const DAY = 24 * 60 * 60 * 1000
  let day = 0
  for (let t = start; t <= end && day < 92; t += DAY, day++) {
    const d = new Date(t)
    if (d.getUTCDay() === 0) continue // skip Sundays
    const dd = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
    const inMin = 15 + (day % 4) * 5
    const outMin = 30 + (day % 3) * 10
    Data.push({
      UserID: uid,
      PunchTime: `${dd}T09:${pad(inMin)}:00`,
      InsertedOn: `${dd}T09:${pad(inMin + 1)}:00`,
      DeviceID: dev,
      DeviceName: 'MOCK TimeWatch Device',
      InOutMode: '0',
      VerifyMode: 'Face',
    })
    Data.push({
      UserID: uid,
      PunchTime: `${dd}T17:${pad(outMin)}:00`,
      InsertedOn: `${dd}T17:${pad(outMin + 1)}:00`,
      DeviceID: dev,
      DeviceName: 'MOCK TimeWatch Device',
      InOutMode: '1',
      VerifyMode: 'Face',
    })
  }

  return c.json({ Success: true, Message: 'Punch Data Fetched Successfully.', Data })
})
