import { createRoute } from '../../lib/factory'
import SignOutButton from '../../islands/SignOutButton'
import MyApplications from '../../islands/MyApplications'

export default createRoute((c) => {
  return c.render(
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="login-crest">RPL</div>
          <span>RPL Maheshwari</span>
        </div>

        <nav className="admin-nav">
          <a href="/dashboard" className="admin-nav-link">
            <span className="admin-nav-icon">🏠</span> Dashboard
          </a>
          <a href="/dashboard/apply" className="admin-nav-link">
            <span className="admin-nav-icon">📝</span> Apply for Leave
          </a>
          <a href="/dashboard/applications" className="admin-nav-link is-active">
            <span className="admin-nav-icon">📋</span> My Applications
          </a>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar" id="admin-avatar">
              F
            </div>
            <div>
              <div className="admin-sidebar-name" id="admin-name">
                Faculty Member
              </div>
              <span className="admin-sidebar-role">Faculty</span>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-heading">
            <h1>My Applications</h1>
            <div className="admin-rule" />
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-search-icon">🔍</div>
            <div className="admin-bell">🔔</div>
            <div className="admin-topbar-avatar" id="admin-avatar-2">
              F
            </div>
          </div>
        </header>

        <main className="admin-content">
          <MyApplications />
        </main>
      </div>
    </div>,
    { title: 'My Applications - RPL Maheshwari College' }
  )
})
