import { createRoute } from '../../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../../lib/jwt'
import { buildAttendanceReport } from '../../../../../lib/attendanceReport'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function csvCell(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const GET = createRoute(verifyJWT, requireRole('hr', 'master'), async (c) => {
  const month = c.req.query('month') ?? currentMonth()
  const report = await buildAttendanceReport(c.env.DB, month)

  const header = ['Name', 'Department', 'Present', 'Leave', 'Absent', 'CL Used', '%']
  const lines = [header.join(',')]
  for (const row of report) {
    lines.push(
      [
        csvCell(row.name),
        csvCell(row.department ?? ''),
        row.present,
        row.leave,
        row.absent,
        row.clUsed,
        row.percentage,
      ].join(',')
    )
  }
  const csv = lines.join('\r\n')

  c.header('Content-Type', 'text/csv; charset=utf-8')
  c.header('Content-Disposition', `attachment; filename="attendance-report-${month}.csv"`)
  return c.body(csv)
})
