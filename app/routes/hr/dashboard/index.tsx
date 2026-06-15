import { createRoute } from '../../../lib/factory'
import SignOutButton from '../../../islands/SignOutButton'
import HRDashboard from '../../../islands/HRDashboard'

export default createRoute((c) => {
  return c.render(
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="login-crest">RPL</div>
          <span>RPL Maheshwari</span>
        </div>

        <nav className="admin-nav">
          <a href="/hr/dashboard" className="admin-nav-link is-active">
            <span className="admin-nav-icon">📊</span> Dashboard
          </a>
          <a href="/hr/requests" className="admin-nav-link">
            <span className="admin-nav-icon">✅</span> Leave Requests
          </a>
          <a href="/hr/attendance" className="admin-nav-link">
            <span className="admin-nav-icon">📋</span> Attendance Reports
          </a>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar" id="admin-avatar">
              H
            </div>
            <div>
              <div className="admin-sidebar-name" id="admin-name">
                HR Team
              </div>
              <span className="admin-sidebar-role">HR Admin</span>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-heading">
            <h1>HR Dashboard</h1>
            <div className="admin-rule" />
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-bell" id="hr-bell">
              🔔
              <span className="admin-bell-badge" id="hr-bell-badge" style={{ display: 'none' }} />
            </div>
            <div className="admin-topbar-avatar" id="admin-avatar-2">
              H
            </div>
          </div>
        </header>

        <main className="admin-content">
          <HRDashboard />
        </main>
      </div>
    </div>,
    { title: 'HR Dashboard - RPL Maheshwari College' }
  )
})
