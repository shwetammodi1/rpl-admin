import { useEffect, useState } from 'hono/jsx'

type LeaveRequest = {
  id: string
  facultyName: string
  department: string | null
  facultyAvatar: string
  type: string
  fromDate: string
  toDate: string
  halfSession: string | null
  startTime: string | null
  endTime: string | null
  reason: string | null
  substituteName: string | null
  clUnits: number | null
  balanceAfter: number
  createdAt: number
}

type Resolved = {
  status: 'approved' | 'rejected'
  name: string
  date: string
}

type Toast = {
  id: number
  message: string
  type: 'success' | 'error'
}

const ROLE_REDIRECTS: Record<string, string> = {
  pending: '/welcome',
  faculty: '/dashboard',
  master: '/master',
}

const TYPE_META: Record<string, { label: string; cls: string }> = {
  full: { label: 'Full day', cls: 'is-cl' },
  half: { label: 'Half day', cls: 'is-half' },
  short: { label: 'Short leave', cls: 'is-short' },
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function shortDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function fullDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateSummary(req: LeaveRequest) {
  if (req.type === 'half') {
    const half = req.halfSession === 'second' ? 'Second half' : 'First half'
    return `${shortDate(req.fromDate)} · ${half}`
  }
  if (req.type === 'short') {
    const window = req.startTime && req.endTime ? ` · ${req.startTime}–${req.endTime}` : ''
    return `${shortDate(req.fromDate)}${window}`
  }
  if (req.fromDate === req.toDate) return shortDate(req.fromDate)
  return `${shortDate(req.fromDate)} – ${shortDate(req.toDate)}`
}

export default function HRLeaveRequests() {
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [resolved, setResolved] = useState<Record<string, Resolved>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)
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

  const loadRequests = async () => {
    const res = await fetch('/api/admin/leave/pending', { headers: authHeaders() })
    if (res.ok) {
      const result = await res.json<{ requests: LeaveRequest[] }>()
      setRequests(result.requests)
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
        await loadRequests()
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [])

  const handleAction = async (req: LeaveRequest, action: 'approve' | 'reject') => {
    setProcessingId(req.id)
    try {
      const res = await fetch(`/api/admin/leave/${req.id}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ comment: comments[req.id] ?? '' }),
      })

      if (res.ok) {
        const status = action === 'approve' ? 'approved' : 'rejected'
        setResolved((prev) => ({
          ...prev,
          [req.id]: { status, name: req.facultyName, date: fullDate(todayStr()) },
        }))
        pushToast(`Leave ${status} for ${req.facultyName}`, 'success')
      } else {
        const data = await res.json<{ error?: string }>().catch(() => ({}) as { error?: string })
        pushToast(data.error ?? `Could not ${action} this request`, 'error')
      }
    } catch {
      pushToast('Network error. Please try again.', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  if (!authChecked) {
    return null
  }

  const pendingRemaining = requests.filter((r) => !resolved[r.id]).length

  return (
    <>
      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2 className="admin-card-title">Pending leave requests</h2>
            <div className="admin-rule" />
          </div>
          {!loading && requests.length > 0 && (
            <span className="admin-count-pill is-amber">{pendingRemaining} awaiting review</span>
          )}
        </div>

        <div className="req-list">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div className="req-card" key={`sk-${i}`}>
                <div className="req-card-top">
                  <div className="req-faculty">
                    <div className="skeleton-block" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
                    <div>
                      <div className="skeleton-block" style={{ width: '140px', height: '14px' }} />
                      <div className="skeleton-block" style={{ width: '90px', height: '11px', marginTop: '6px' }} />
                    </div>
                  </div>
                  <div className="skeleton-block" style={{ width: '80px', height: '24px', borderRadius: '999px' }} />
                </div>
                <div className="skeleton-block" style={{ width: '100%', height: '52px', marginTop: '16px' }} />
              </div>
            ))
          ) : requests.length === 0 ? (
            <div className="req-empty">
              <div className="req-empty-icon">✓</div>
              <h3 className="req-empty-title">All caught up!</h3>
              <p className="req-empty-text">No pending leave requests at this time.</p>
            </div>
          ) : (
            requests.map((req) => {
              const done = resolved[req.id]
              if (done) {
                return (
                  <div className={`req-resolved is-${done.status}`} key={req.id}>
                    <span className="req-resolved-icon">{done.status === 'approved' ? '✓' : '✕'}</span>
                    <span>
                      <strong>{done.status === 'approved' ? 'Approved' : 'Rejected'}</strong> · {done.name} · {done.date}
                    </span>
                  </div>
                )
              }

              const meta = TYPE_META[req.type] ?? { label: req.type, cls: 'is-other' }
              const lowBalance = req.balanceAfter < 2
              const busy = processingId === req.id

              return (
                <article className="req-card" key={req.id}>
                  <div className="req-card-top">
                    <div className="req-faculty">
                      <div className="req-avatar">{req.facultyAvatar}</div>
                      <div>
                        <div className="req-name">{req.facultyName}</div>
                        <div className="req-dept">{req.department ?? 'Unassigned'}</div>
                      </div>
                    </div>
                    <span className={`leave-type-pill ${meta.cls}`}>{meta.label}</span>
                  </div>

                  <div className="req-meta">
                    <div className="req-meta-col">
                      <span className="req-meta-label">Date(s)</span>
                      <span className="req-meta-value req-mono">{dateSummary(req)}</span>
                    </div>
                    <div className="req-meta-col">
                      <span className="req-meta-label">Reason</span>
                      <span className="req-meta-value">{req.reason ?? '—'}</span>
                    </div>
                    <div className="req-meta-col">
                      <span className="req-meta-label">Substitute</span>
                      <span className="req-meta-value">{req.substituteName ?? 'None'}</span>
                    </div>
                    <div className="req-meta-col">
                      <span className="req-meta-label">CL impact</span>
                      <span className={`req-meta-value req-mono ${lowBalance ? 'is-amber' : ''}`}>
                        {req.clUnits ?? 0} → balance {req.balanceAfter.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="req-actions">
                    <input
                      type="text"
                      className="req-comment"
                      placeholder="Add a comment (optional)..."
                      value={comments[req.id] ?? ''}
                      disabled={busy}
                      onInput={(e) =>
                        setComments((prev) => ({ ...prev, [req.id]: (e.target as HTMLInputElement).value }))
                      }
                    />
                    {busy && <span className="req-spinner" aria-label="Processing" />}
                    <button
                      type="button"
                      className="btn-approve"
                      disabled={busy}
                      onClick={() => handleAction(req, 'approve')}
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      className="btn-reject"
                      disabled={busy}
                      onClick={() => handleAction(req, 'reject')}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>
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
