export type ReportRow = {
  userId: string
  name: string
  department: string | null
  present: number
  leave: number
  absent: number
  clUsed: number
  percentage: number
}

type AggRow = {
  id: string
  name: string
  department: string | null
  present: number
  leave: number
}

// Weekdays in the month, excluding Sundays (Saturdays count as working days).
export function workingDaysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(y, m - 1, d).getDay() !== 0) count++
  }
  return count
}

export async function buildAttendanceReport(db: D1Database, month: string): Promise<ReportRow[]> {
  const year = month.slice(0, 4)
  const workingDays = workingDaysInMonth(month)

  const { results } = await db
    .prepare(
      `SELECT u.id, u.name, u.department,
              SUM(CASE WHEN a.status IN ('present','half','short') THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) AS leave
       FROM users u
       LEFT JOIN attendance a ON a.user_id = u.id AND a.date LIKE ?
       WHERE u.role = 'faculty'
       GROUP BY u.id
       ORDER BY u.name`
    )
    .bind(`${month}-%`)
    .all<AggRow>()

  const clRows = await db
    .prepare(
      `SELECT user_id, COALESCE(SUM(cl_units), 0) AS cl_used
       FROM leave_applications
       WHERE status = 'approved' AND strftime('%Y', from_date) = ?
       GROUP BY user_id`
    )
    .bind(year)
    .all<{ user_id: string; cl_used: number }>()

  const clMap = new Map(clRows.results.map((r) => [r.user_id, r.cl_used]))

  return results.map((row) => {
    const present = row.present ?? 0
    const leave = row.leave ?? 0
    const absent = Math.max(0, workingDays - present - leave)
    const percentage = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0

    return {
      userId: row.id,
      name: row.name,
      department: row.department,
      present,
      leave,
      absent,
      clUsed: clMap.get(row.id) ?? 0,
      percentage,
    }
  })
}
