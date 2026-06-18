import { createRoute } from '../../lib/factory'
import SignOutButton from '../../islands/SignOutButton'
import ApplyLeave from '../../islands/ApplyLeave'
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
          <a href="/dashboard" className="admin-nav-link">
            <span className="admin-nav-icon"><Icon name="home" size={16} /></span> Dashboard
          </a>
          <a href="/dashboard/apply" className="admin-nav-link is-active">
            <span className="admin-nav-icon"><Icon name="calendar-plus" size={16} /></span> Apply for Leave
          </a>
          <a href="/dashboard/applications" className="admin-nav-link">
            <span className="admin-nav-icon"><Icon name="list" size={16} /></span> My Applications
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
            <h1>Apply for Leave</h1>
            <div className="admin-rule" />
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-search-icon"><Icon name="search" /></div>
            <div className="admin-bell"><Icon name="bell" /></div>
            <div className="admin-topbar-avatar" id="admin-avatar-2">
              F
            </div>
          </div>
        </header>

        <main className="admin-content">
          <ApplyLeave />
        </main>
      </div>
    </div>,
    { title: 'Apply for Leave - RPL Maheshwari College' }
  )
})
