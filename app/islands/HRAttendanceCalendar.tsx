import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'

type Employee = { userId: string; name: string; department: string | null }
type Day = { date: string; day: number; dow: number; status: string; inTime: string | null; outTime: string | null }
type Summary = { present: number; absent: number; late: number; leave: number }
type RecentPunch = { time: number; direction: string | null }
type CalendarData = {
  user: {
    id: string
    name: string
    department: string | null
    biometricRef: string | null
    designation: string | null
    degrees: string | null
  }
  month: string
  days: Day[]
  summary: Summary
  recentPunches: RecentPunch[]
}

type Toast = { id: number; message: string; type: 'success' | 'error' }

const ROLE_REDIRECTS: Record<string, string> = {
  pending: '/welcome',
  faculty: '/dashboard',
  master: '/master',
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const STATUS_META: Record<string, { label: string; cls: string }> = {
  present: { label: 'Present', cls: 'is-present' },
  late: { label: 'Late', cls: 'is-late' },
  absent: { label: 'Absent', cls: 'is-absent' },
  leave: { label: 'Leave', cls: 'is-leave' },
  half: { label: 'Half-day', cls: 'is-leave' },
  short: { label: 'Short', cls: 'is-leave' },
  off: { label: 'Week Off', cls: 'is-off' },
  upcoming: { label: '', cls: 'is-upcoming' },
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function istTodayStr() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function monthOptions() {
  const now = new Date()
  const out: { value: string; label: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    })
  }
  return out
}

function formatLongDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatPunch(ms: number) {
  const d = new Date(ms + 5.5 * 3600 * 1000)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  const time = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  return { date, time }
}

export default function HRAttendanceCalendar() {
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(currentMonth())
  const [deptFilter, setDeptFilter] = useState('all')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [calendar, setCalendar] = useState<CalendarData | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [marking, setMarking] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const options = monthOptions()

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('rpl_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const pushToast = (message: string, kind: 'success' | 'error') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((prev) => [...prev, { id, message, type: kind }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  const loadEmployees = async (forMonth: string): Promise<Employee[]> => {
    const res = await fetch(`/api/admin/attendance/report?month=${forMonth}`, { headers: authHeaders() })
    if (!res.ok) return []
    const result = await res.json<{ report: Employee[] }>()
    return result.report.map((r) => ({ userId: r.userId, name: r.name, department: r.department }))
  }

  const loadCalendar = async (userId: string, forMonth: string) => {
    if (!userId) {
      setCalendar(null)
      return
    }
    const res = await fetch(`/api/admin/attendance/calendar?userId=${userId}&month=${forMonth}`, {
      headers: authHeaders(),
    })
    if (res.ok) {
      const data = await res.json<CalendarData>()
      setCalendar(data)
      const today = istTodayStr()
      const todayCell = data.days.find((d) => d.date === today)
      setSelectedDate(todayCell ? today : data.days[data.days.length - 1]?.date ?? '')
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
        const emps = await loadEmployees(month)
        setEmployees(emps)
        const first = emps[0]?.userId ?? ''
        setSelectedUserId(first)
        await loadCalendar(first, month)
        setLoading(false)
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [])

  const changeMonth = async (next: string) => {
    setMonth(next)
    setLoading(true)
    const emps = await loadEmployees(next)
    setEmployees(emps)
    const stillThere = emps.find((e) => e.userId === selectedUserId)
    const uid = stillThere ? selectedUserId : emps[0]?.userId ?? ''
    setSelectedUserId(uid)
    await loadCalendar(uid, next)
    setLoading(false)
  }

  const changeEmployee = async (uid: string) => {
    setSelectedUserId(uid)
    setLoading(true)
    await loadCalendar(uid, month)
    setLoading(false)
  }

  const markLeave = async (date: string) => {
    if (!selectedUserId || !date) return
    setMarking(true)
    try {
      const res = await fetch('/api/admin/attendance/mark-leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ userId: selectedUserId, date }),
      })
      if (res.ok) {
        pushToast('Leave marked', 'success')
        await loadCalendar(selectedUserId, month)
        setSelectedDate(date)
      } else {
        pushToast('Could not mark leave', 'error')
      }
    } catch {
      pushToast('Network error', 'error')
    } finally {
      setMarking(false)
    }
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
        link.download = `attendance-${month}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(false)
    }
  }

  if (!authChecked) return null

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean))) as string[]
  const visibleEmployees =
    deptFilter === 'all' ? employees : employees.filter((e) => (e.department ?? '') === deptFilter)

  const summary = calendar?.summary ?? { present: 0, absent: 0, late: 0, leave: 0 }
  const today = istTodayStr()
  const selectedDay = calendar?.days.find((d) => d.date === selectedDate)
  const selectedMeta = selectedDay ? STATUS_META[selectedDay.status] ?? STATUS_META.absent : null

  // Leading blanks before day 1
  const leading = calendar && calendar.days.length > 0 ? calendar.days[0].dow : 0

  return (
    <>
      <div className="att-controls">
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
        <select
          className="admin-filter-select"
          value={deptFilter}
          onChange={(e) => setDeptFilter((e.target as HTMLSelectElement).value)}
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button type="button" className="btn-gold" disabled={exporting || loading} onClick={exportCsv}>
          <Icon name="download" size={14} /> {exporting ? 'Exporting…' : 'Export'}
        </button>
      </div>

      <section className="admin-card att-summary-card">
        <div className="att-employee">
          <div className="admin-avatar">{calendar ? initials(calendar.user.name) : '—'}</div>
          <div className="att-employee-pick">
            <select
              className="att-employee-select"
              value={selectedUserId}
              onChange={(e) => changeEmployee((e.target as HTMLSelectElement).value)}
            >
              {visibleEmployees.map((e) => (
                <option key={e.userId} value={e.userId}>
                  {e.name}
                  {e.department ? ` · ${e.department}` : ''}
                </option>
              ))}
            </select>
            {calendar?.user.designation && (
              <div className="att-employee-meta">
                <span className="att-employee-desig">{calendar.user.designation}</span>
                {calendar.user.degrees && <span className="att-employee-degrees">{calendar.user.degrees}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="att-summary">
          <div className="att-chip is-present">
            <span className="att-chip-num">{summary.present}</span>
            <span className="att-chip-label"><span className="legend-dot is-present" /> Present</span>
          </div>
          <div className="att-chip is-absent">
            <span className="att-chip-num">{summary.absent}</span>
            <span className="att-chip-label"><span className="legend-dot is-absent" /> Absent</span>
          </div>
          <div className="att-chip is-late">
            <span className="att-chip-num">{summary.late}</span>
            <span className="att-chip-label"><span className="legend-dot is-late" /> Late</span>
          </div>
          <div className="att-chip is-leave">
            <span className="att-chip-num">{summary.leave}</span>
            <span className="att-chip-label"><span className="legend-dot is-leave" /> Leaves</span>
          </div>
        </div>
      </section>

      <div className="att-grid">
        <section className="admin-card att-calendar">
          <div className="att-cal-head">
            {WEEKDAYS.map((w) => (
              <div className="att-cal-weekday" key={w}>
                {w}
              </div>
            ))}
          </div>
          <div className="att-cal-body">
            {loading || !calendar ? (
              <div className="admin-empty">Loading calendar…</div>
            ) : (
              <div className="att-cal-grid">
                {Array.from({ length: leading }).map((_, i) => (
                  <div className="att-cell is-blank" key={`b-${i}`} />
                ))}
                {calendar.days.map((cell) => {
                  const meta = STATUS_META[cell.status] ?? STATUS_META.absent
                  const isToday = cell.date === today
                  const isSelected = cell.date === selectedDate
                  return (
                    <button
                      type="button"
                      key={cell.date}
                      className={`att-cell ${meta.cls} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedDate(cell.date)}
                    >
                      <span className="att-cell-day">{cell.day}</span>
                      {cell.status !== 'upcoming' && cell.status !== 'off' && (
                        <span className="att-cell-status">
                          <span className="att-cell-dot" /> {meta.label}
                        </span>
                      )}
                      {cell.status === 'off' && <span className="att-cell-off">Week Off</span>}
                      {(cell.status === 'present' || cell.status === 'late') && cell.inTime && (
                        <span className="att-cell-time">{cell.inTime}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="att-legend">
            <span className="legend-item"><span className="legend-dot is-present" /> Present</span>
            <span className="legend-item"><span className="legend-dot is-absent" /> Absent</span>
            <span className="legend-item"><span className="legend-dot is-late" /> Late</span>
            <span className="legend-item"><span className="legend-dot is-leave" /> Leave</span>
            <span className="legend-item"><span className="legend-dot is-off" /> Week Off</span>
          </div>
        </section>

        <aside className="admin-card att-side">
          <div className="att-side-head">
            <span className="att-side-date">{selectedDate ? formatLongDate(selectedDate) : '—'}</span>
            {selectedMeta && selectedDay && selectedDay.status !== 'upcoming' && (
              <span className={`att-pill ${selectedMeta.cls}`}>{selectedMeta.label || '—'}</span>
            )}
          </div>

          {selectedDay && (selectedDay.status === 'present' || selectedDay.status === 'late') ? (
            <div className="att-side-times">
              <div className="att-time-row">
                <span className="att-time-label">In</span>
                <span className="att-time-val">{selectedDay.inTime ?? '—'}</span>
              </div>
              <div className="att-time-row">
                <span className="att-time-label">Out</span>
                <span className="att-time-val">{selectedDay.outTime ?? '—'}</span>
              </div>
            </div>
          ) : (
            <div className="att-side-empty">
              <div className="att-side-empty-icon">
                <Icon name="calendar-plus" size={26} />
              </div>
              <div className="att-side-empty-title">No Punch Records</div>
              <div className="att-side-empty-text">No biometric punches found for this day.</div>
              {selectedDay && selectedDay.status === 'absent' && (
                <button type="button" className="btn-gold" disabled={marking} onClick={() => markLeave(selectedDate)}>
                  {marking ? 'Marking…' : 'Mark Leave'}
                </button>
              )}
            </div>
          )}

          <div className="att-recent">
            <div className="att-recent-title">Recent Punches</div>
            {calendar && calendar.recentPunches.length > 0 ? (
              calendar.recentPunches.map((p, i) => {
                const f = formatPunch(p.time)
                const isOut = p.direction === 'out'
                return (
                  <div className="att-recent-row" key={i}>
                    <span className={`att-recent-dir ${isOut ? 'is-out' : 'is-in'}`}>
                      <Icon name={isOut ? 'chevron-left' : 'chevron-right'} size={14} />
                    </span>
                    <span className="att-recent-date">{f.date}</span>
                    <span className="att-recent-time">{f.time}</span>
                    <span className={`att-recent-tag ${isOut ? 'is-out' : 'is-in'}`}>{isOut ? 'OUT' : 'IN'}</span>
                  </div>
                )
              })
            ) : (
              <div className="admin-empty">No punches yet.</div>
            )}
          </div>
        </aside>
      </div>

      <div className="report-callout att-howto">
        <span><Icon name="info" size={16} /></span>
        <span>
          Green days have biometric punch records. If a staff member is absent and hasn't applied leave, you can mark
          leave for that day. Week-off days are shown in grey.
        </span>
      </div>

      <div className="admin-toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`admin-toast ${toast.type === 'error' ? 'is-error' : ''}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </>
  )
}
