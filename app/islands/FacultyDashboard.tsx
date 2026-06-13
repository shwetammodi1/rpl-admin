import { useEffect, useState } from 'hono/jsx'

type AttendanceRecord = {
  date: string
  status: 'present' | 'absent' | 'leave' | 'half' | 'short' | 'off'
  inTime: string | null
  outTime: string | null
  source: string
}

type LeaveBalance = {
  allowance: number
  taken: number
  pending: number
  available: number
}

type LeaveApplication = {
  id: string
  type: string
  fromDate: string
  toDate: string
  clUnits: number | null
  status: string
  createdAt: number
}

const ROLE_REDIRECTS: Record<string, string> = {
  pending: '/welcome',
  hr: '/hr/dashboard',
  master: '/master',
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function formatShortDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function leaveTypePillClass(type: string) {
  const t = type.toLowerCase()
  if (t.includes('half')) return 'is-half'
  if (t.includes('short')) return 'is-short'
  if (t.includes('cl') || t.includes('casual')) return 'is-cl'
  return 'is-other'
}

function statusPillClass(status: string) {
  if (status === 'approved') return 'is-approved'
  if (status === 'rejected') return 'is-rejected'
  return 'is-pending'
}

export default function FacultyDashboard() {
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null)
  const [applications, setApplications] = useState<LeaveApplication[]>([])

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('rpl_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadAttendance = async (y: number, m: number) => {
    const res = await fetch(`/api/faculty/attendance?month=${monthKey(y, m)}`, { headers: authHeaders() })
    if (res.ok) {
      const result = await res.json<{ attendance: AttendanceRecord[] }>()
      setAttendance(result.attendance)
    }
  }

  const loadLeaveBalance = async () => {
    const res = await fetch('/api/faculty/leave-balance', { headers: authHeaders() })
    if (res.ok) {
      const result = await res.json<LeaveBalance>()
      setLeaveBalance(result)
    }
  }

  const loadApplications = async () => {
    const res = await fetch('/api/leave/my?limit=3', { headers: authHeaders() })
    if (res.ok) {
      const result = await res.json<{ applications: LeaveApplication[] }>()
      setApplications(result.applications)
    }
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

        if (user.role !== 'faculty') {
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
        await Promise.all([loadAttendance(year, month), loadLeaveBalance(), loadApplications()])
        setLoading(false)
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [])

  const changeMonth = async (delta: number) => {
    let newMonth = month + delta
    let newYear = year
    if (newMonth < 1) {
      newMonth = 12
      newYear -= 1
    } else if (newMonth > 12) {
      newMonth = 1
      newYear += 1
    }
    setMonth(newMonth)
    setYear(newYear)
    setLoading(true)
    await loadAttendance(newYear, newMonth)
    setLoading(false)
  }

  if (!authChecked) {
    return null
  }

  const presentCount = attendance.filter((a) => a.status === 'present').length
  const leaveCount = attendance.filter((a) => a.status === 'leave').length
  const shortCount = attendance.filter((a) => a.status === 'short').length
  const absentCount = attendance.filter((a) => a.status === 'absent').length

  const attendanceMap = new Map(attendance.map((a) => [a.date, a]))
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const leadingEmpty = (firstDayOfWeek + 6) % 7
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const cells: { date: string | null; day: number | null }[] = []
  for (let i = 0; i < leadingEmpty; i++) cells.push({ date: null, day: null })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: `${monthKey(year, month)}-${String(d).padStart(2, '0')}`, day: d })
  }

  const ringRadius = 64
  const ringStroke = 14
  const circumference = 2 * Math.PI * ringRadius
  const ratio = leaveBalance && leaveBalance.allowance > 0
    ? Math.min(Math.max(leaveBalance.available / leaveBalance.allowance, 0), 1)
    : 0
  const goldDash = ratio * circumference

  return (
    <>
      <section className="admin-stats is-four">
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-present">✅</div>
          <div>
            <div className="admin-stat-value is-present">{loading ? '–' : presentCount}</div>
            <div className="admin-stat-label">Present ({MONTH_NAMES[month - 1]})</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-amber">🌴</div>
          <div>
            <div className="admin-stat-value is-amber">{loading ? '–' : leaveCount}</div>
            <div className="admin-stat-label">On Leave</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-blue">⏱️</div>
          <div>
            <div className="admin-stat-value is-blue">{loading ? '–' : shortCount}</div>
            <div className="admin-stat-label">Short Leave</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-absent">❌</div>
          <div>
            <div className="admin-stat-value is-absent">{loading ? '–' : absentCount}</div>
            <div className="admin-stat-label">Absent</div>
          </div>
        </div>
      </section>

      <div className="faculty-grid">
        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Attendance Register</h2>
              <div className="admin-rule" />
            </div>
            <div className="register-switcher">
              <button type="button" className="register-nav-btn" onClick={() => changeMonth(-1)}>
                ‹
              </button>
              <span className="register-month">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              <button type="button" className="register-nav-btn" onClick={() => changeMonth(1)}>
                ›
              </button>
            </div>
          </div>

          {loading ? (
            <div className="admin-empty">Loading attendance…</div>
          ) : (
            <>
              <div className="register-grid">
                {WEEKDAY_HEADERS.map((wd) => (
                  <div className="register-head" key={wd}>
                    {wd}
                  </div>
                ))}
                {cells.map((cell, idx) => {
                  if (!cell.date) {
                    return <div className="register-cell is-empty" key={`empty-${idx}`} />
                  }

                  const record = attendanceMap.get(cell.date)
                  const isToday = cell.date === todayStr
                  const isOff = record?.status === 'off'

                  return (
                    <div
                      className={`register-cell ${isToday ? 'is-today' : ''} ${isOff ? 'is-off' : ''}`}
                      key={cell.date}
                    >
                      <span className="register-date">{cell.day}</span>
                      {record && record.status === 'present' && (
                        <span className="register-tag is-present">
                          <span className="dot" /> P
                        </span>
                      )}
                      {record && record.status === 'absent' && (
                        <span className="register-tag is-absent">
                          <span className="dot" /> A
                        </span>
                      )}
                      {record && record.status === 'leave' && (
                        <span className="register-tag is-leave">
                          <span className="dot" /> L
                        </span>
                      )}
                      {record && record.status === 'half' && (
                        <span className="register-tag is-half">
                          <span className="dot" /> H
                        </span>
                      )}
                      {record && record.status === 'short' && (
                        <span className="register-tag is-short">
                          <span className="dot" /> S
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="register-legend">
                <span className="legend-item">
                  <span className="legend-dot is-present" /> Present
                </span>
                <span className="legend-item">
                  <span className="legend-dot is-absent" /> Absent
                </span>
                <span className="legend-item">
                  <span className="legend-dot is-leave" /> On Leave
                </span>
                <span className="legend-item">
                  <span className="legend-dot is-half" /> Half-day
                </span>
                <span className="legend-item">
                  <span className="legend-dot is-short" /> Short leave
                </span>
                <span className="legend-item">
                  <span className="legend-dot is-off" /> Week-off
                </span>
              </div>
            </>
          )}
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2 className="admin-card-title">Casual Leave Balance</h2>
                <div className="admin-rule" />
              </div>
            </div>

            {loading || !leaveBalance ? (
              <div className="admin-empty">Loading balance…</div>
            ) : (
              <div className="cl-card-body">
                <div className="cl-donut-wrap">
                  <div className="cl-donut">
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r={ringRadius} fill="none" stroke="#e2e5ea" strokeWidth={ringStroke} />
                      <circle
                        cx="80"
                        cy="80"
                        r={ringRadius}
                        fill="none"
                        stroke="var(--rpl-gold)"
                        strokeWidth={ringStroke}
                        strokeDasharray={`${goldDash} ${circumference}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="cl-donut-center">
                      <div className="cl-donut-value">{leaveBalance.available}</div>
                      <div className="cl-donut-label">days available</div>
                    </div>
                  </div>
                </div>

                <table className="cl-ledger">
                  <tbody>
                    <tr>
                      <td>Annual allowance</td>
                      <td>{leaveBalance.allowance.toFixed(1)}</td>
                    </tr>
                    <tr>
                      <td>Taken</td>
                      <td>{leaveBalance.taken.toFixed(1)}</td>
                    </tr>
                    <tr>
                      <td>Pending</td>
                      <td>{leaveBalance.pending.toFixed(1)}</td>
                    </tr>
                    <tr className="cl-divider cl-available">
                      <td>Available</td>
                      <td>{leaveBalance.available.toFixed(1)}</td>
                    </tr>
                  </tbody>
                </table>

                <a href="/leave/apply" className="btn-gold-block">
                  Apply for leave →
                </a>
              </div>
            )}
          </section>

          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2 className="admin-card-title">Latest Applications</h2>
                <div className="admin-rule" />
              </div>
            </div>

            {loading ? (
              <div className="admin-empty">Loading applications…</div>
            ) : (
              <div className="applications-card-body">
                {applications.length === 0 && <div className="admin-empty">No leave applications yet.</div>}
                {applications.map((app) => (
                  <div className="application-item" key={app.id}>
                    <div className="application-info">
                      <span className={`leave-type-pill ${leaveTypePillClass(app.type)}`}>{app.type}</span>
                      <span className="application-dates">
                        {formatShortDate(app.fromDate)} – {formatShortDate(app.toDate)}
                      </span>
                    </div>
                    <span className={`app-status-pill ${statusPillClass(app.status)}`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </div>
                ))}
                <a href="/leave/my" className="view-all-link">
                  View all →
                </a>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
