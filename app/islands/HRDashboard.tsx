import { useEffect, useState } from 'hono/jsx'

type AttendanceRow = {
  userId: string
  name: string
  department: string | null
  status: string
  inTime: string | null
}

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  createdAt: number
  read: boolean
}

const ROLE_REDIRECTS: Record<string, string> = {
  pending: '/welcome',
  faculty: '/dashboard',
  master: '/master',
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  present: { label: 'Present', cls: 'is-present' },
  half: { label: 'Half-day', cls: 'is-half' },
  short: { label: 'Short leave', cls: 'is-short' },
  leave: { label: 'On Leave', cls: 'is-leave' },
  absent: { label: 'Absent', cls: 'is-absent' },
  off: { label: 'Week-off', cls: 'is-off' },
}

const NOTIF_META: Record<string, { cls: string; icon: string }> = {
  leave_request: { cls: 'is-gold', icon: '📝' },
  short_leave: { cls: 'is-blue', icon: '⏱️' },
  biometric_alert: { cls: 'is-red', icon: '⚠️' },
  role_granted: { cls: 'is-green', icon: '✅' },
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatLongDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function relativeTime(seconds: number) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return `${Math.floor(diff / 604800)}w ago`
}

function updateBellBadge(count: number) {
  const badge = document.getElementById('hr-bell-badge')
  if (!badge) return
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : String(count)
    badge.style.display = 'flex'
  } else {
    badge.style.display = 'none'
  }
}

export default function HRDashboard() {
  const [authChecked, setAuthChecked] = useState(false)
  const [date, setDate] = useState(todayStr())
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [attnLoading, setAttnLoading] = useState(true)
  const [notifLoading, setNotifLoading] = useState(true)

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('rpl_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadAttendance = async (forDate: string) => {
    setAttnLoading(true)
    const res = await fetch(`/api/admin/attendance/today?date=${forDate}`, { headers: authHeaders() })
    if (res.ok) {
      const result = await res.json<{ attendance: AttendanceRow[] }>()
      setAttendance(result.attendance)
    }
    setAttnLoading(false)
  }

  const loadNotifications = async () => {
    setNotifLoading(true)
    const res = await fetch('/api/admin/notifications?limit=20', { headers: authHeaders() })
    if (res.ok) {
      const result = await res.json<{ notifications: Notification[] }>()
      setNotifications(result.notifications)
      updateBellBadge(result.notifications.filter((n) => !n.read).length)
    }
    setNotifLoading(false)
  }

  const loadPendingCount = async () => {
    const res = await fetch('/api/admin/leave/pending/count', { headers: authHeaders() })
    if (res.ok) {
      const result = await res.json<{ count: number }>()
      setPendingCount(result.count)
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
        await Promise.all([loadAttendance(date), loadNotifications(), loadPendingCount()])
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [])

  const changeDate = async (next: string) => {
    setDate(next)
    await loadAttendance(next)
  }

  const markRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id)
    if (!target || target.read) return

    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    updateBellBadge(notifications.filter((n) => !n.read && n.id !== id).length)

    await fetch(`/api/admin/notifications/${id}/read`, { method: 'PATCH', headers: authHeaders() }).catch(() => {})
  }

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read)
    if (unread.length === 0) return

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    updateBellBadge(0)

    await Promise.all(
      unread.map((n) =>
        fetch(`/api/admin/notifications/${n.id}/read`, { method: 'PATCH', headers: authHeaders() }).catch(() => {})
      )
    )
  }

  if (!authChecked) {
    return null
  }

  const total = attendance.length
  const presentCount = attendance.filter((a) => ['present', 'half', 'short'].includes(a.status)).length
  const leaveCount = attendance.filter((a) => a.status === 'leave').length
  const absentCount = attendance.filter((a) => a.status === 'absent').length
  const visibleRows = attendance.slice(0, 10)

  return (
    <>
      <section className="admin-stats is-four">
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-present">✅</div>
          <div>
            <div className="admin-stat-value is-present">
              {attnLoading ? '–' : presentCount}
              {!attnLoading && <span className="admin-stat-suffix"> of {total}</span>}
            </div>
            <div className="admin-stat-label">Present Today</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-amber">🌴</div>
          <div>
            <div className="admin-stat-value is-amber">{attnLoading ? '–' : leaveCount}</div>
            <div className="admin-stat-label">On Leave</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-absent">❌</div>
          <div>
            <div className="admin-stat-value is-absent">{attnLoading ? '–' : absentCount}</div>
            <div className="admin-stat-label">Absent</div>
          </div>
        </div>
        <a href="/hr/requests" className="admin-stat-card is-clickable">
          <div className="admin-stat-icon is-slate">📨</div>
          <div>
            <div className="admin-stat-value is-slate">{pendingCount}</div>
            <div className="admin-stat-label">Pending Requests</div>
          </div>
        </a>
      </section>

      <div className="hr-grid">
        {/* LEFT — Today's attendance */}
        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Today's attendance</h2>
              <div className="admin-rule" />
            </div>
            <div className="hr-card-tools">
              <span className="admin-mono">{formatLongDate(date)}</span>
              <input
                type="date"
                className="hr-date-input"
                value={date}
                onChange={(e) => changeDate((e.target as HTMLInputElement).value)}
              />
              <button
                type="button"
                className="hr-refresh-btn"
                title="Refresh"
                onClick={() => loadAttendance(date)}
              >
                ↻
              </button>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>In-time</th>
                </tr>
              </thead>
              <tbody>
                {attnLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="skeleton-block" style={{ width: '38px', height: '38px', borderRadius: '50%' }} />
                          <div className="skeleton-block" style={{ width: '120px', height: '14px' }} />
                        </div>
                      </td>
                      <td><div className="skeleton-block" style={{ width: '90px', height: '12px' }} /></td>
                      <td><div className="skeleton-block" style={{ width: '70px', height: '22px', borderRadius: '999px' }} /></td>
                      <td><div className="skeleton-block" style={{ width: '50px', height: '12px' }} /></td>
                    </tr>
                  ))
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="admin-empty">No faculty records for this date.</div>
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const meta = STATUS_META[row.status] ?? { label: row.status, cls: 'is-off' }
                    const showTime = row.status === 'present' || row.status === 'half' || row.status === 'short'
                    return (
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
                        <td>
                          <span className={`attn-pill ${meta.cls}`}>{meta.label}</span>
                        </td>
                        <td className="admin-mono">{showTime && row.inTime ? row.inTime : '—'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {!attnLoading && attendance.length > 10 && (
            <div className="hr-card-foot">
              <a href="/hr/attendance" className="view-all-link">
                View all {attendance.length} →
              </a>
            </div>
          )}
        </section>

        {/* RIGHT — Notifications */}
        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Notifications</h2>
              <div className="admin-rule" />
            </div>
            <button type="button" className="hr-link-btn" onClick={markAllRead}>
              Mark all read
            </button>
          </div>

          <div className="notif-list">
            {notifLoading ? (
              <div className="admin-empty">Loading notifications…</div>
            ) : notifications.length === 0 ? (
              <div className="admin-empty">You're all caught up. No notifications.</div>
            ) : (
              notifications.map((n) => {
                const meta = NOTIF_META[n.type] ?? { cls: 'is-navy', icon: '🔔' }
                return (
                  <button
                    type="button"
                    key={n.id}
                    className={`notif-item ${n.read ? '' : 'is-unread'}`}
                    onClick={() => markRead(n.id)}
                  >
                    <span className={`notif-icon ${meta.cls}`}>{meta.icon}</span>
                    <span className="notif-body">
                      <span className="notif-title">{n.title}</span>
                      {n.message && <span className="notif-message">{n.message}</span>}
                    </span>
                    <span className="notif-time">{relativeTime(n.createdAt)}</span>
                  </button>
                )
              })
            )}
          </div>

          <div className="hr-card-foot">
            <a href="/hr/requests" className="btn-gold-block">
              Review all requests →
            </a>
          </div>
        </section>
      </div>
    </>
  )
}
