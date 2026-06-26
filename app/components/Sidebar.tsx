import SignOutButton from '../islands/SignOutButton'
import Icon from './Icon'

type Role = 'faculty' | 'hr' | 'master'
type NavItem = { key: string; href: string; label: string; icon: string }
type NavGroup = { label: string; items: NavItem[] }

const NAV: Record<Role, NavGroup[]> = {
  faculty: [
    {
      label: 'Menu',
      items: [
        { key: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: 'home' },
        { key: 'apply', href: '/dashboard/apply', label: 'Apply for Leave', icon: 'calendar-plus' },
        { key: 'applications', href: '/dashboard/applications', label: 'My Applications', icon: 'list' },
      ],
    },
  ],
  hr: [
    {
      label: 'Overview',
      items: [{ key: 'dashboard', href: '/hr/dashboard', label: 'Dashboard', icon: 'layout-grid' }],
    },
    {
      label: 'Manage',
      items: [
        { key: 'requests', href: '/hr/requests', label: 'Leave Requests', icon: 'check-square' },
        { key: 'attendance', href: '/hr/attendance', label: 'Attendance Reports', icon: 'bar-chart' },
        { key: 'import', href: '/hr/import', label: 'Import Attendance', icon: 'download' },
      ],
    },
  ],
  master: [
    {
      label: 'Administration',
      items: [
        { key: 'users', href: '/master', label: 'User Access', icon: 'users' },
        { key: 'provision', href: '/master/provision', label: 'Faculty Accounts', icon: 'user-check' },
      ],
    },
    {
      label: 'Reports',
      items: [
        { key: 'attendance', href: '/hr/attendance', label: 'Attendance Reports', icon: 'bar-chart' },
        { key: 'import', href: '/hr/import', label: 'Import Attendance', icon: 'download' },
        { key: 'requests', href: '/hr/requests', label: 'Leave Requests', icon: 'check-square' },
      ],
    },
  ],
}

const META: Record<Role, { initial: string; name: string; role: string }> = {
  faculty: { initial: 'F', name: 'Faculty Member', role: 'Faculty' },
  hr: { initial: 'H', name: 'HR Team', role: 'HR Admin' },
  master: { initial: 'M', name: 'Master Admin', role: 'Master Admin' },
}

export default function Sidebar({ role, active }: { role: Role; active: string }) {
  const groups = NAV[role]
  const m = META[role]
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <div className="login-crest">RPL</div>
        <div className="brand-text">
          <span className="brand-name">RPL Maheshwari</span>
          <span className="brand-sub">College · Indore</span>
        </div>
      </div>

      <nav className="admin-nav">
        {groups.map((group) => (
          <div className="admin-nav-group" key={group.label}>
            <span className="admin-nav-section">{group.label}</span>
            {group.items.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`admin-nav-link ${active === item.key ? 'is-active' : ''}`}
              >
                <span className="admin-nav-icon">
                  <Icon name={item.icon} size={16} />
                </span>
                {item.label}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-sidebar-user">
          <div className="admin-sidebar-avatar" id="admin-avatar">
            {m.initial}
          </div>
          <div>
            <div className="admin-sidebar-name" id="admin-name">
              {m.name}
            </div>
            <span className="admin-sidebar-role">{m.role}</span>
          </div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  )
}
