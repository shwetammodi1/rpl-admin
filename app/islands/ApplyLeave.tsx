import { useEffect, useState } from 'hono/jsx'

type LeaveType = 'full' | 'half' | 'short'

type Substitute = {
  id: string
  name: string
  department: string | null
}

type LeaveBalance = {
  allowance: number
  taken: number
  pending: number
  available: number
}

type Toast = {
  id: number
  message: string
  type: 'success' | 'error'
}

const ROLE_REDIRECTS: Record<string, string> = {
  pending: '/welcome',
  hr: '/hr/dashboard',
  master: '/master',
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

// Mirrors the server: count days from..to inclusive, excluding Sundays.
function countWorkingDays(fromDate: string, toDate: string) {
  if (!fromDate || !toDate || toDate < fromDate) return 0
  const [fy, fm, fd] = fromDate.split('-').map(Number)
  const [ty, tm, td] = toDate.split('-').map(Number)
  const cursor = new Date(fy, fm - 1, fd)
  const end = new Date(ty, tm - 1, td)
  let count = 0
  while (cursor <= end) {
    if (cursor.getDay() !== 0) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

const DRAFT_KEY = 'rpl_leave_draft'

export default function ApplyLeave() {
  const [authChecked, setAuthChecked] = useState(false)

  const [type, setType] = useState<LeaveType>('full')
  const [fromDate, setFromDate] = useState(todayStr())
  const [toDate, setToDate] = useState(todayStr())
  const [halfSession, setHalfSession] = useState<'first' | 'second'>('first')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reason, setReason] = useState('')
  const [substituteId, setSubstituteId] = useState('')

  const [substitutes, setSubstitutes] = useState<Substitute[]>([])
  const [balance, setBalance] = useState<LeaveBalance | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('rpl_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const pushToast = (message: string, kind: 'success' | 'error') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((prev) => [...prev, { id, message, type: kind }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  const loadBalance = async (year: string) => {
    const res = await fetch(`/api/faculty/leave-balance?year=${year}`, { headers: authHeaders() })
    if (res.ok) {
      setBalance(await res.json<LeaveBalance>())
    }
  }

  const loadSubstitutes = async (date: string) => {
    const url = date ? `/api/leave/substitutes?date=${date}` : '/api/leave/substitutes'
    const res = await fetch(url, { headers: authHeaders() })
    if (res.ok) {
      setSubstitutes(await res.json<Substitute[]>())
    }
  }

  // Auth gate + initial data load.
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
        await Promise.all([loadBalance(fromDate.slice(0, 4)), loadSubstitutes(fromDate)])
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [])

  // Re-fetch substitutes (and balance year) whenever the leave date changes.
  useEffect(() => {
    if (!authChecked) return
    loadSubstitutes(fromDate)
    loadBalance(fromDate.slice(0, 4))
  }, [fromDate])

  if (!authChecked) {
    return null
  }

  // Keep toDate in sync for single-day leave types.
  const effectiveToDate = type === 'full' ? toDate : fromDate

  let clUnits = 0
  if (type === 'full') clUnits = countWorkingDays(fromDate, effectiveToDate)
  else if (type === 'half') clUnits = 0.5
  else clUnits = 0

  const available = balance?.available ?? 0
  const remaining = available - clUnits
  const wouldExceed = clUnits > available
  const balanceClass = wouldExceed ? 'is-danger' : remaining < 2 ? 'is-warning' : ''

  // Short-leave window validation.
  let timeError: string | null = null
  if (type === 'short' && startTime && endTime) {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const diff = eh * 60 + em - (sh * 60 + sm)
    if (diff <= 0) timeError = 'End time must be after start time'
    else if (diff > 120) timeError = 'Short leave can be at most 2 hours'
  }

  const buildBody = () => {
    const base: Record<string, unknown> = { type, reason: reason.trim() }
    if (substituteId) base.substituteId = substituteId
    if (type === 'full') {
      base.fromDate = fromDate
      base.toDate = toDate
    } else if (type === 'half') {
      base.fromDate = fromDate
      base.halfSession = halfSession
    } else {
      base.fromDate = fromDate
      base.startTime = startTime
      base.endTime = endTime
    }
    return base
  }

  const validate = (): string | null => {
    if (!reason.trim()) return 'Please describe the reason for your leave'
    if (type === 'full') {
      if (!fromDate || !toDate) return 'From and to dates are required'
      if (toDate < fromDate) return 'To date must be on or after from date'
    } else if (type === 'short') {
      if (!startTime || !endTime) return 'Start and end times are required'
      if (timeError) return timeError
    }
    if (wouldExceed) return 'Insufficient leave balance'
    return null
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/leave/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(buildBody()),
      })

      if (res.ok) {
        localStorage.removeItem(DRAFT_KEY)
        pushToast('Leave request submitted!', 'success')
        setTimeout(() => {
          window.location.href = '/dashboard/applications'
        }, 900)
        return
      }

      if (res.status === 422) {
        setError('Insufficient leave balance')
      } else {
        const data = await res.json<{ error?: string }>().catch(() => ({}) as { error?: string })
        setError(data.error ?? 'Could not submit your request. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveDraft = () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ type, fromDate, toDate, halfSession, startTime, endTime, reason, substituteId })
    )
    pushToast('Draft saved', 'success')
  }

  // Mini ring gauge geometry.
  const ringRadius = 34
  const ringStroke = 8
  const circumference = 2 * Math.PI * ringRadius
  const ratio = balance && balance.allowance > 0 ? Math.min(Math.max(balance.available / balance.allowance, 0), 1) : 0
  const goldDash = ratio * circumference

  return (
    <>
      <div className="apply-grid">
        {/* LEFT — the form */}
        <section className="admin-card">
          <form className="apply-form-card" onSubmit={handleSubmit}>
            {/* STEP 1 — Leave type */}
            <div>
              <p className="form-step-label">Step 1 — Leave type</p>
              <div className="leave-type-cards">
                <button
                  type="button"
                  className={`leave-type-card ${type === 'full' ? 'is-selected' : ''}`}
                  onClick={() => setType('full')}
                >
                  <span className="leave-type-card-icon">📅</span>
                  <span className="leave-type-card-title">Full day</span>
                  <span className="leave-type-card-subtitle">1 CL per day</span>
                </button>
                <button
                  type="button"
                  className={`leave-type-card ${type === 'half' ? 'is-selected' : ''}`}
                  onClick={() => setType('half')}
                >
                  <span className="leave-type-card-icon">◐</span>
                  <span className="leave-type-card-title">Half day</span>
                  <span className="leave-type-card-subtitle">0.5 CL</span>
                </button>
                <button
                  type="button"
                  className={`leave-type-card ${type === 'short' ? 'is-selected' : ''}`}
                  onClick={() => setType('short')}
                >
                  <span className="leave-type-card-icon">⏱️</span>
                  <span className="leave-type-card-title">Short leave</span>
                  <span className="leave-type-card-subtitle">Up to 2 hours</span>
                  <span className="leave-type-card-note">0 CL — permission only</span>
                </button>
              </div>
            </div>

            {/* STEP 2 — Date / time */}
            <div>
              <p className="form-step-label">Step 2 — When</p>

              {type === 'full' && (
                <div className="form-fields">
                  <label className="form-field">
                    From date
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate((e.target as HTMLInputElement).value)}
                    />
                  </label>
                  <label className="form-field">
                    To date
                    <input
                      type="date"
                      min={fromDate}
                      value={toDate}
                      onChange={(e) => setToDate((e.target as HTMLInputElement).value)}
                    />
                  </label>
                  <div className="form-field is-full">
                    <div className="cl-usage-note">
                      This uses {clUnits} CL day{clUnits === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              )}

              {type === 'half' && (
                <div className="form-fields">
                  <label className="form-field">
                    Date
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate((e.target as HTMLInputElement).value)}
                    />
                  </label>
                  <div className="form-field">
                    Which half?
                    <div className="toggle-group">
                      <button
                        type="button"
                        className={`toggle-btn ${halfSession === 'first' ? 'is-active' : ''}`}
                        onClick={() => setHalfSession('first')}
                      >
                        First half
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${halfSession === 'second' ? 'is-active' : ''}`}
                        onClick={() => setHalfSession('second')}
                      >
                        Second half
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {type === 'short' && (
                <div className="form-fields">
                  <label className="form-field is-full">
                    Date
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate((e.target as HTMLInputElement).value)}
                    />
                  </label>
                  <label className="form-field">
                    From time
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime((e.target as HTMLInputElement).value)}
                    />
                  </label>
                  <label className="form-field">
                    To time
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime((e.target as HTMLInputElement).value)}
                    />
                  </label>
                  <div className="form-field is-full">
                    <span className="form-helper">Must be within the same day, maximum 2 hours.</span>
                    {timeError && <span className="form-error">{timeError}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3 — Reason */}
            <div>
              <p className="form-step-label">Step 3 — Reason</p>
              <div className="form-fields">
                <label className="form-field is-full">
                  <textarea
                    value={reason}
                    placeholder="Briefly describe the reason for your leave..."
                    onChange={(e) => setReason((e.target as HTMLTextAreaElement).value)}
                  />
                </label>
              </div>
            </div>

            {/* STEP 4 — Substitute */}
            <div>
              <p className="form-step-label">Step 4 — Substitute</p>
              <div className="form-fields">
                <label className="form-field is-full">
                  <select
                    value={substituteId}
                    onChange={(e) => setSubstituteId((e.target as HTMLSelectElement).value)}
                  >
                    <option value="">No lecture scheduled on this day</option>
                    {substitutes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.department ? ` — ${s.department}` : ''}
                      </option>
                    ))}
                  </select>
                  <span className="form-helper">The selected faculty will be notified.</span>
                </label>
              </div>
            </div>

            {/* Balance check */}
            <div className={`balance-callout ${balanceClass}`}>
              <span>🌴</span>
              <span>
                You have <strong>{available.toFixed(1)}</strong> casual leaves remaining. This request uses{' '}
                <strong>{clUnits}</strong> CL,{' '}
                {wouldExceed ? (
                  <>which would exceed your balance.</>
                ) : (
                  <>
                    leaving you <strong>{remaining.toFixed(1)}</strong>.
                  </>
                )}
              </span>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="form-actions">
              <button type="submit" className="btn-gold" disabled={submitting || wouldExceed}>
                {submitting ? 'Submitting…' : 'Submit request →'}
              </button>
              <button type="button" className="btn-outline-navy" disabled={submitting} onClick={handleSaveDraft}>
                Save as draft
              </button>
            </div>
          </form>
        </section>

        {/* RIGHT — info panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2 className="admin-card-title">How approval works</h2>
                <div className="admin-rule" />
              </div>
            </div>
            <div className="approval-timeline">
              <div className="timeline-step">
                <div className="timeline-marker">
                  <span className="timeline-dot is-active" />
                  <span className="timeline-line" />
                </div>
                <div className="timeline-content">
                  <h3 className="timeline-title">You submit</h3>
                  <p className="timeline-subtitle">Your request is sent to HR for review.</p>
                </div>
              </div>
              <div className="timeline-step">
                <div className="timeline-marker">
                  <span className="timeline-dot" />
                  <span className="timeline-line" />
                </div>
                <div className="timeline-content">
                  <h3 className="timeline-title">HR reviews your request</h3>
                  <p className="timeline-subtitle">An HR member checks your balance and schedule.</p>
                </div>
              </div>
              <div className="timeline-step">
                <div className="timeline-marker">
                  <span className="timeline-dot" />
                  <span className="timeline-line" />
                </div>
                <div className="timeline-content">
                  <h3 className="timeline-title">Approved or rejected</h3>
                  <p className="timeline-subtitle">You'll be notified, with a reason if rejected.</p>
                </div>
              </div>
              <div className="timeline-step">
                <div className="timeline-marker">
                  <span className="timeline-dot" />
                  <span className="timeline-line" />
                </div>
                <div className="timeline-content">
                  <h3 className="timeline-title">Calendar updates automatically</h3>
                  <p className="timeline-subtitle">Approved leave appears on your attendance register.</p>
                </div>
              </div>
            </div>
          </section>

          <div className="warning-callout">
            <span>⚠️</span>
            <span>
              Same-day leave requests may not be approved. Please apply at least one day in advance.
            </span>
          </div>

          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2 className="admin-card-title">Your current balance</h2>
                <div className="admin-rule" />
              </div>
            </div>
            <div className="mini-balance-card">
              <div className="cl-donut is-small">
                <svg width="88" height="88" viewBox="0 0 88 88">
                  <circle cx="44" cy="44" r={ringRadius} fill="none" stroke="#e2e5ea" strokeWidth={ringStroke} />
                  <circle
                    cx="44"
                    cy="44"
                    r={ringRadius}
                    fill="none"
                    stroke="var(--rpl-gold)"
                    strokeWidth={ringStroke}
                    strokeDasharray={`${goldDash} ${circumference}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="cl-donut-center">
                  <div className="cl-donut-value">{balance ? balance.available.toFixed(1) : '–'}</div>
                  <div className="cl-donut-label">days</div>
                </div>
              </div>
              <div className="mini-balance-text">
                <strong>{balance ? balance.available.toFixed(1) : '–'}</strong>
                casual leaves available
                {balance ? ` of ${balance.allowance.toFixed(1)}` : ''}
              </div>
            </div>
          </section>
        </div>
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
