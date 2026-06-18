import Icon from './Icon'

type Role = 'faculty' | 'hr' | 'master'

const CONTEXT: Record<Role, string> = {
  faculty: 'Faculty Portal',
  hr: 'HR Console',
  master: 'Administration',
}

const INITIAL: Record<Role, string> = { faculty: 'F', hr: 'H', master: 'M' }

export default function Topbar({ role }: { role: Role }) {
  return (
    <header className="admin-topbar">
      <div className="topbar-context">{CONTEXT[role]}</div>
      <div className="admin-topbar-actions">
        <div className="admin-search-icon">
          <Icon name="search" />
        </div>
        <div className="admin-bell" id="hr-bell">
          <Icon name="bell" />
          <span className="admin-bell-badge" id="hr-bell-badge" style={{ display: 'none' }} />
        </div>
        <div className="admin-topbar-avatar" id="admin-avatar-2">
          {INITIAL[role]}
        </div>
      </div>
    </header>
  )
}
