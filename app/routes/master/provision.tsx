import { createRoute } from '../../lib/factory'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import PageHeader from '../../components/PageHeader'
import ProvisionFaculty from '../../islands/ProvisionFaculty'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="master" active="provision" />
      <div className="admin-main">
        <Topbar role="master" />
        <main className="admin-content">
          <PageHeader
            title="Faculty Accounts"
            subtitle="Create login accounts (business email + password) for all faculty and staff"
          />
          <ProvisionFaculty />
        </main>
      </div>
    </div>,
    { title: 'Faculty Accounts - RPL Maheshwari College' }
  )
)
