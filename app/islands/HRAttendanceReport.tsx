import { useEffect, useState } from 'hono/jsx'

type ReportRow = {
  userId: string
  name: string
  department: string | null
  present: number
  leave: number
  absent: number
  clUsed: number
  percentage: number
}

const ROLE_REDIRECTS: Record<string, string> = {
  pending: '/welcome',
  faculty: '/dashboard',
  master: '/master',
}

const CL_ALLOWANCE = 12

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Current month plus the five preceding months.
function monthOptions() {
  const now = new Date()
  const options: { value: string; label: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

function pctClass(pct: number) {
  if (pct >= 90) return 'is-good'
  if (pct >= 70) return 'is-warn'
  return 'is-bad'
}

export default function HRAttendanceReport() {
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(currentMonth())
  const [report, setReport] = useState<ReportRow[]>([])
  const [exporting, setExporting] = useState(false)

  const options = monthOptions()

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('rpl_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadReport = async (forMonth: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/attendance/report?month=${forMonth}`, { headers: authHeaders() })
    if (res.ok) {
      const result = await res.json<{ report: ReportRow[] }>()
      setReport(result.report)
    }
    setLoading(false)
  }

  useEffect(() => {
    const token = localStorage.getItem('rpl_token')
    if (!token) {
      window.location.href = '/'
      return
    }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) {
          localStorage.removeItem('rpl_token')
          window.location.href = '/'
          return
        }

        const user = await res.json<{ name: string; role: string }>()
        if (user.role !== 'hr' && user.role !== 'master') {
          window.location.href = ROLE_REDIRECTS[user.role] ?? '/welcome'
          return
        }

        const nameEl = document.getElementById('admin-name')
        const avatarEl = document.getElementById('admin-avatar')
        const avatarEl2 = document.getElementById('admin-avatar-2')
        if (nameEl) nameEl.textContent = user.name
        if (avatarEl) avatarEl.textContent = initials(user.name)
        if (avatarEl2) avatarEl2.textContent = initials(user.name)

        setAuthChecked(true)
        await loadReport(month)
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [])

  const changeMonth = async (next: string) => {
    setMonth(next)
    await loadReport(next)
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/admin/attendance/report/export?month=${month}`, { headers: authHeaders() })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `attendance-report-${month}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(false)
    }
  }

  if (!authChecked) {
    return null
  }

  const count = report.length
  const totals = report.reduce(
    (acc, r) => ({
      present: acc.present + r.present,
      leave: acc.leave + r.leave,
      absent: acc.absent + r.absent,
      clUsed: acc.clUsed + r.clUsed,
      percentage: acc.percentage + r.percentage,
    }),
    { present: 0, leave: 0, absent: 0, clUsed: 0, percentage: 0 }
  )
  const avgCl = count > 0 ? totals.clUsed / count : 0
  const avgPct = count > 0 ? Math.round(totals.percentage / count) : 0

  return (
    <section className="admin-card">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Monthly attendance report</h2>
          <div className="admin-rule" />
        </div>
        <div className="hr-card-tools">
          <select
            className="admin-filter-select"
            value={month}
            onChange={(e) => changeMonth((e.target as HTMLSelectElement).value)}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn-gold-outline" disabled={exporting || loading} onClick={exportCsv}>
            ⭳ {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Faculty</th>
              <th>Department</th>
              <th>Present</th>
              <th>Leave</th>
              <th>Absent</th>
              <th>CL used / {CL_ALLOWANCE}</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="skeleton-block" style={{ width: '38px', height: '38px', borderRadius: '50%' }} />
                      <div className="skeleton-block" style={{ width: '120px', height: '14px' }} />
                    </div>
                  </td>
                  <td><div className="skeleton-block" style={{ width: '90px', height: '12px' }} /></td>
                  <td><div className="skeleton-block" style={{ width: '30px', height: '12px' }} /></td>
                  <td><div className="skeleton-block" style={{ width: '30px', height: '12px' }} /></td>
                  <td><div className="skeleton-block" style={{ width: '30px', height: '12px' }} /></td>
                  <td><div className="skeleton-block" style={{ width: '60px', height: '12px' }} /></td>
                  <td><div className="skeleton-block" style={{ width: '48px', height: '22px', borderRadius: '999px' }} /></td>
                </tr>
              ))
            ) : count === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty">No faculty found for this month.</div>
                </td>
              </tr>
            ) : (
              report.map((row) => (
                <tr key={row.userId}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar">{initials(row.name)}</div>
                      <div>
                        <div className="admin-user-name">{row.name}</div>
                        <div className="admin-user-email">{row.department ?? 'Unassigned'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="admin-muted">{row.department ?? '—'}</td>
                  <td className="report-num is-present">{row.present}</td>
                  <td className="report-num is-leave">{row.leave}</td>
                  <td className="report-num is-absent">{row.absent}</td>
                  <td className="admin-mono">
                    {row.clUsed} / {CL_ALLOWANCE}
                  </td>
                  <td>
                    <span className={`pct-pill ${pctClass(row.percentage)}`}>{row.percentage}%</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && count > 0 && (
            <tfoot>
              <tr className="report-foot">
                <td>Total / Average</td>
                <td />
                <td className="report-num is-present">{totals.present}</td>
                <td className="report-num is-leave">{totals.leave}</td>
                <td className="report-num is-absent">{totals.absent}</td>
                <td className="admin-mono">
                  {avgCl.toFixed(1)} / {CL_ALLOWANCE}
                </td>
                <td>
                  <span className={`pct-pill ${pctClass(avgPct)}`}>{avgPct}%</span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="report-callout">
        <span>ℹ️</span>
        <span>
          This report is biometric-ready. Present and In-time figures will auto-populate once thumb-impression
          devices are linked via the attendance API. Manual entry until then.
        </span>
      </div>
    </section>
  )
}
