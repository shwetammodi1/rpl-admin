import { createRoute } from '../../lib/factory'
import SignOutButton from '../../islands/SignOutButton'
import HRLeaveRequests from '../../islands/HRLeaveRequests'
import Icon from '../../components/Icon'

export default createRoute((c) => {
  return c.render(
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="login-crest">RPL</div>
          <span>RPL Maheshwari</span>
        </div>

        <nav className="admin-nav">
          <a href="/hr/dashboard" className="admin-nav-link">
            <span className="admin-nav-icon"><Icon name="layout-grid" size={16} /></span> Dashboard
          </a>
          <a href="/hr/requests" className="admin-nav-link is-active">
            <span className="admin-nav-icon"><Icon name="check-square" size={16} /></span> Leave Requests
          </a>
          <a href="/hr/attendance" className="admin-nav-link">
            <span className="admin-nav-icon"><Icon name="bar-chart" size={16} /></span> Attendance Reports
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
            <h1>Leave Requests</h1>
            <div className="admin-rule" />
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-bell"><Icon name="bell" /></div>
            <div className="admin-topbar-avatar" id="admin-avatar-2">
              H
            </div>
          </div>
        </header>

        <main className="admin-content">
          <HRLeaveRequests />
        </main>
      </div>
    </div>,
    { title: 'Leave Requests - RPL Maheshwari College' }
  )
})
