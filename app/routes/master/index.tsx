import { createRoute } from '../../lib/factory'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import PageHeader from '../../components/PageHeader'
import MasterUserAccess from '../../islands/MasterUserAccess'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="master" active="users" />
      <div className="admin-main">
        <Topbar role="master" />
        <main className="admin-content">
          <PageHeader title="User & Role Access" subtitle="Grant or revoke portal access for sign-ups" />
          <MasterUserAccess />
        </main>
      </div>
    </div>,
    { title: 'User & Role Access - RPL Maheshwari College' }
  )
)
