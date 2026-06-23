import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'

type Role = 'faculty' | 'hr' | 'master'
type Link = { href: string; label: string; icon: string }

const NAV: Record<string, Link[]> = {
  faculty: [
    { href: '/dashboard', label: 'Dashboard', icon: 'home' },
    { href: '/dashboard/apply', label: 'Apply for Leave', icon: 'calendar-plus' },
    { href: '/dashboard/applications', label: 'My Applications', icon: 'list' },
  ],
  hr: [
    { href: '/hr/dashboard', label: 'Dashboard', icon: 'layout-grid' },
    { href: '/hr/requests', label: 'Leave Requests', icon: 'check-square' },
    { href: '/hr/attendance', label: 'Attendance', icon: 'bar-chart' },
  ],
  master: [{ href: '/master', label: 'User Access', icon: 'users' }],
}

const ROLE_LABEL: Record<string, string> = {
  faculty: 'Faculty',
  hr: 'HR Admin',
  master: 'Master Admin',
  pending: 'Pending',
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ProfileMenu({ role, initial }: { role: Role; initial: string }) {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('rpl_token')
    if (!token) return
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json<{ name: string; email: string; role: string }>() : null))
      .then((u) => {
        if (u) setUser(u)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: Event) => {
      const root = document.getElementById('profile-menu-root')
      if (root && !root.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [open])

  const signOut = async () => {
    const token = localStorage.getItem('rpl_token')
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {})
    localStorage.removeItem('rpl_token')
    window.location.href = '/'
  }

  const name = user?.name ?? ''
  const ini = name ? initials(name) : initial
  const links = NAV[role] ?? []

  return (
    <div className="profile-menu" id="profile-menu-root">
      <button
        type="button"
        className="admin-topbar-avatar profile-avatar-btn"
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
      >
        {ini}
      </button>

      {open && (
        <div className="profile-dropdown">
          <div className="profile-head">
            <div className="profile-head-avatar">{ini}</div>
            <div className="profile-head-info">
              <span className="profile-head-name">{name || 'Account'}</span>
              {user?.email && <span className="profile-head-email">{user.email}</span>}
              <span className={`profile-role-badge is-${role}`}>{ROLE_LABEL[role] ?? role}</span>
            </div>
          </div>

          <div className="profile-links">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="profile-link">
                <Icon name={l.icon} size={16} /> {l.label}
              </a>
            ))}
          </div>

          <button type="button" className="profile-signout" onClick={signOut}>
            <Icon name="log-out" size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}
