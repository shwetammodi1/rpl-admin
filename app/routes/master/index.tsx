import { createRoute } from '../../lib/factory'
import SignOutButton from '../../islands/SignOutButton'
import MasterUserAccess from '../../islands/MasterUserAccess'
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
          <a href="/master" className="admin-nav-link is-active">
            <span className="admin-nav-icon"><Icon name="users" size={16} /></span> User Access
          </a>
          <a href="/hr/attendance" className="admin-nav-link">
            <span className="admin-nav-icon"><Icon name="bar-chart" size={16} /></span> Attendance Reports
          </a>
          <a href="/hr/requests" className="admin-nav-link">
            <span className="admin-nav-icon"><Icon name="check-square" size={16} /></span> Leave Requests
          </a>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar" id="admin-avatar">
              M
            </div>
            <div>
              <div className="admin-sidebar-name" id="admin-name">
                Master Admin
              </div>
              <span className="admin-sidebar-role">Master Admin</span>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-heading">
            <h1>User &amp; Role Access</h1>
            <div className="admin-rule" />
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-bell"><Icon name="bell" /></div>
            <div className="admin-topbar-avatar" id="admin-avatar-2">
              M
            </div>
          </div>
        </header>

        <main className="admin-content">
          <MasterUserAccess />
        </main>
      </div>
    </div>,
    { title: 'User & Role Access - RPL Maheshwari College' }
  )
})
