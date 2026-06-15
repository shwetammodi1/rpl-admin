import { useEffect, useState } from 'hono/jsx'

type Application = {
  id: string
  type: string
  fromDate: string
  toDate: string
  halfSession: string | null
  startTime: string | null
  endTime: string | null
  reason: string | null
  substituteName: string | null
  clUnits: number | null
  status: string
  reviewComment: string | null
  reviewedAt: number | null
  createdAt: number
}

type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'

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

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
]

const TYPE_LABELS: Record<string, string> = {
  full: 'Full day',
  half: 'Half day',
  short: 'Short leave',
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatShortDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTimestamp(seconds: number) {
  return new Date(seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function typePillClass(type: string) {
  if (type === 'half') return 'is-half'
  if (type === 'short') return 'is-short'
  return 'is-cl'
}

function statusPillClass(status: string) {
  if (status === 'approved') return 'is-approved'
  if (status === 'rejected') return 'is-rejected'
  if (status === 'cancelled') return 'is-cancelled'
  return 'is-pending'
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// Human-readable schedule line for one application.
function scheduleSummary(app: Application) {
  if (app.type === 'half') {
    const half = app.halfSession === 'second' ? 'Second half' : 'First half'
    return `${formatShortDate(app.fromDate)} · ${half}`
  }
  if (app.type === 'short') {
    const window = app.startTime && app.endTime ? ` · ${app.startTime}–${app.endTime}` : ''
    return `${formatShortDate(app.fromDate)}${window}`
  }
  if (app.fromDate === app.toDate) {
    return formatShortDate(app.fromDate)
  }
  return `${formatShortDate(app.fromDate)} – ${formatShortDate(app.toDate)}`
}

function clSummary(app: Application) {
  if (app.type === 'short') return '0 CL — permission only'
  const units = app.clUnits ?? 0
  return `${units} CL`
}

export default function MyApplications() {
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
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

  const loadApplications = async () => {
    const res = await fetch('/api/leave/my?limit=200', { headers: authHeaders() })
    if (res.ok) {
      const result = await res.json<{ applications: Application[] }>()
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
        await loadApplications()
        setLoading(false)
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [])

  const cancelApplication = async (id: string) => {
    setCancellingId(id)
    try {
      const res = await fetch(`/api/leave/${id}/cancel`, { method: 'PATCH', headers: authHeaders() })
      if (res.ok) {
        setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)))
        pushToast('Application cancelled', 'success')
      } else {
        const data = await res.json<{ error?: string }>().catch(() => ({}) as { error?: string })
        pushToast(data.error ?? 'Could not cancel the application', 'error')
      }
    } catch {
      pushToast('Network error. Please try again.', 'error')
    } finally {
      setCancellingId(null)
    }
  }

  if (!authChecked) {
    return null
  }

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
    cancelled: applications.filter((a) => a.status === 'cancelled').length,
  }

  const visible = filter === 'all' ? applications : applications.filter((a) => a.status === filter)

  return (
    <>
      <section className="admin-stats is-four">
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-blue">📋</div>
          <div>
            <div className="admin-stat-value is-blue">{loading ? '–' : counts.all}</div>
            <div className="admin-stat-label">Total requests</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-amber">⏳</div>
          <div>
            <div className="admin-stat-value is-amber">{loading ? '–' : counts.pending}</div>
            <div className="admin-stat-label">Pending</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-present">✅</div>
          <div>
            <div className="admin-stat-value is-present">{loading ? '–' : counts.approved}</div>
            <div className="admin-stat-label">Approved</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-absent">❌</div>
          <div>
            <div className="admin-stat-value is-absent">{loading ? '–' : counts.rejected}</div>
            <div className="admin-stat-label">Rejected</div>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2 className="admin-card-title">Leave Applications</h2>
            <div className="admin-rule" />
          </div>
          <div className="status-filter">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`status-filter-btn ${filter === f.key ? 'is-active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="status-filter-count">{counts[f.key]}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="admin-empty">Loading your applications…</div>
        ) : visible.length === 0 ? (
          <div className="admin-empty">
            {filter === 'all' ? (
              <>
                You haven't applied for any leave yet.{' '}
                <a href="/dashboard/apply" className="view-all-link">
                  Apply now →
                </a>
              </>
            ) : (
              `No ${filter} applications.`
            )}
          </div>
        ) : (
          <div className="app-list">
            {visible.map((app) => (
              <article className="app-card" key={app.id}>
                <div className="app-card-head">
                  <div className="application-info">
                    <span className={`leave-type-pill ${typePillClass(app.type)}`}>
                      {TYPE_LABELS[app.type] ?? app.type}
                    </span>
                    <span className="application-dates">{scheduleSummary(app)}</span>
                    <span className="app-card-cl">{clSummary(app)}</span>
                  </div>
                  <span className={`app-status-pill ${statusPillClass(app.status)}`}>
                    {statusLabel(app.status)}
                  </span>
                </div>

                {app.reason && <p className="app-card-reason">{app.reason}</p>}

                <div className="app-card-meta">
                  {app.substituteName && (
                    <span>
                      <span className="app-meta-label">Substitute:</span> {app.substituteName}
                    </span>
                  )}
                  <span>
                    <span className="app-meta-label">Applied:</span> {formatTimestamp(app.createdAt)}
                  </span>
                </div>

                {(app.status === 'approved' || app.status === 'rejected') && (
                  <div className={`app-review ${app.status === 'rejected' ? 'is-rejected' : ''}`}>
                    <strong>{app.status === 'approved' ? 'Approved' : 'Rejected'}</strong>
                    {app.reviewedAt ? ` on ${formatTimestamp(app.reviewedAt)}` : ''}
                    {app.reviewComment ? ` — ${app.reviewComment}` : ''}
                  </div>
                )}

                {app.status === 'pending' && (
                  <div className="app-card-foot">
                    <button
                      type="button"
                      className="btn-cancel"
                      disabled={cancellingId === app.id}
                      onClick={() => cancelApplication(app.id)}
                    >
                      {cancellingId === app.id ? 'Cancelling…' : 'Cancel request'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

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
