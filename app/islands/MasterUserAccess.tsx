import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'

type User = {
  id: string
  name: string
  email: string
  role: 'pending' | 'faculty' | 'hr' | 'master'
  department: string | null
  created_at: number
}

type Toast = {
  id: number
  message: string
  type: 'success' | 'error'
}

const ROLE_REDIRECTS: Record<string, string> = {
  pending: '/welcome',
  faculty: '/dashboard',
  hr: '/hr/dashboard',
}

const ASSIGNABLE_ROLES: { value: 'faculty' | 'hr' | 'master'; label: string }[] = [
  { value: 'faculty', label: 'Faculty' },
  { value: 'hr', label: 'HR Admin' },
  { value: 'master', label: 'Master Admin' },
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function RolePill({ role }: { role: User['role'] }) {
  if (role === 'pending') {
    return (
      <span className="admin-role-pill is-pending">
        <Icon name="clock" size={12} /> Awaiting
      </span>
    )
  }
  if (role === 'faculty') {
    return <span className="admin-role-pill is-faculty">Faculty</span>
  }
  if (role === 'hr') {
    return <span className="admin-role-pill is-hr">HR / Admin</span>
  }
  return <span className="admin-role-pill is-master">Master Admin</span>
}

export default function MasterUserAccess() {
  const [authChecked, setAuthChecked] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [assignSelections, setAssignSelections] = useState<
    Record<string, { role: 'faculty' | 'hr' | 'master'; department: string }>
  >({})
  const [changeOpenId, setChangeOpenId] = useState<string | null>(null)

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('rpl_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const pushToast = (message: string, type: Toast['type']) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }

  const loadUsers = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users', { headers: authHeaders() })
    if (res.ok) {
      const result = await res.json<{ users: User[] }>()
      setUsers(result.users)
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

        if (user.role !== 'master') {
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
        await loadUsers()
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [])

  const getAssignSelection = (id: string) =>
    assignSelections[id] ?? { role: 'faculty' as const, department: '' }

  const updateAssignSelection = (
    id: string,
    patch: Partial<{ role: 'faculty' | 'hr' | 'master'; department: string }>
  ) => {
    setAssignSelections((prev) => ({
      ...prev,
      [id]: { ...getAssignSelection(id), ...patch },
    }))
  }

  const handleGrant = async (user: User) => {
    const selection = getAssignSelection(user.id)
    setBusyId(user.id)

    const res = await fetch(`/api/admin/users/${user.id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        role: selection.role,
        department: selection.department || undefined,
      }),
    })

    const result = await res.json<{ error?: string; user?: User }>()
    setBusyId(null)

    if (!res.ok) {
      pushToast(result.error ?? 'Something went wrong', 'error')
      return
    }

    pushToast(`Access granted to ${user.name}`, 'success')
    setChangeOpenId(null)
    await loadUsers()
  }

  const handleRevoke = async (user: User) => {
    if (!confirm(`Revoke access for ${user.name}?`)) return

    setBusyId(user.id)
    const res = await fetch(`/api/admin/users/${user.id}/revoke`, {
      method: 'PATCH',
      headers: authHeaders(),
    })

    const result = await res.json<{ error?: string; user?: User }>()
    setBusyId(null)

    if (!res.ok) {
      pushToast(result.error ?? 'Something went wrong', 'error')
      return
    }

    pushToast(`Access revoked for ${user.name}`, 'success')
    await loadUsers()
  }

  if (!authChecked) {
    return null
  }

  const filteredUsers = users.filter((user) => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!user.name.toLowerCase().includes(q) && !user.email.toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })

  const totalAccounts = users.length
  const awaitingAccess = users.filter((u) => u.role === 'pending').length
  const adminsAndHr = users.filter((u) => u.role === 'hr' || u.role === 'master').length

  return (
    <>
      <section className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-navy"><Icon name="users" size={18} /></div>
          <div>
            <div className="admin-stat-value">{totalAccounts}</div>
            <div className="admin-stat-label">Total Accounts</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-amber"><Icon name="clock" size={18} /></div>
          <div>
            <div className="admin-stat-value is-amber">{awaitingAccess}</div>
            <div className="admin-stat-label">Awaiting Access</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-blue"><Icon name="shield" size={18} /></div>
          <div>
            <div className="admin-stat-value is-blue">{adminsAndHr}</div>
            <div className="admin-stat-label">Admins &amp; HR</div>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">User &amp; role access</h2>
          <span className="admin-count-pill">{totalAccounts} accounts</span>
        </div>

        <div className="admin-toolbar">
          <input
            type="search"
            className="admin-search-input"
            placeholder="Search by name or email…"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          />
          <select
            className="admin-filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter((e.target as HTMLSelectElement).value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="faculty">Faculty</option>
            <option value="hr">HR</option>
            <option value="master">Master</option>
          </select>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Signed up</th>
                <th>Department</th>
                <th>Current role</th>
                <th>Assign access</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const selection = getAssignSelection(user.id)
                const isBusy = busyId === user.id
                const isChangeOpen = changeOpenId === user.id

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar">{initials(user.name)}</div>
                        <div>
                          <div className="admin-user-name">{user.name}</div>
                          <div className="admin-user-email">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="admin-mono">{formatDate(user.created_at)}</td>
                    <td className="admin-muted">{user.department ?? '—'}</td>
                    <td>
                      <RolePill role={user.role} />
                    </td>
                    <td>
                      {user.role === 'pending' || isChangeOpen ? (
                        <div className="admin-assign-cell">
                          <select
                            className="admin-assign-select"
                            value={selection.role}
                            onChange={(e) =>
                              updateAssignSelection(user.id, {
                                role: (e.target as HTMLSelectElement).value as
                                  | 'faculty'
                                  | 'hr'
                                  | 'master',
                              })
                            }
                          >
                            {ASSIGNABLE_ROLES.map((opt) => (
                              <option value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            className="admin-assign-dept"
                            placeholder="Department"
                            value={selection.department}
                            onInput={(e) =>
                              updateAssignSelection(user.id, {
                                department: (e.target as HTMLInputElement).value,
                              })
                            }
                          />
                          <button
                            type="button"
                            className="btn-gold-sm"
                            disabled={isBusy}
                            onClick={() => handleGrant(user)}
                          >
                            {user.role === 'pending' ? 'Grant' : 'Save'}
                          </button>
                          {isChangeOpen && (
                            <button
                              type="button"
                              className="btn-ghost-sm"
                              disabled={isBusy}
                              onClick={() => setChangeOpenId(null)}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="admin-assign-cell">
                          <button
                            type="button"
                            className="btn-ghost-sm"
                            disabled={isBusy}
                            onClick={() => {
                              updateAssignSelection(user.id, {
                                role: user.role as 'faculty' | 'hr' | 'master',
                                department: user.department ?? '',
                              })
                              setChangeOpenId(user.id)
                            }}
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            className="btn-danger-sm"
                            disabled={isBusy}
                            onClick={() => handleRevoke(user)}
                          >
                            Revoke
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!loading && filteredUsers.length === 0 && (
            <div className="admin-empty">No accounts match your search.</div>
          )}
          {loading && <div className="admin-empty">Loading accounts…</div>}
        </div>
      </section>

      <div className="admin-callout">
        Until the Master Admin grants a role, new sign-ups can only see the welcome page.
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
