import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'
import HRDashboard from '../../../islands/HRDashboard'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="hr" active="dashboard" />
      <div className="admin-main">
        <Topbar role="hr" />
        <main className="admin-content">
          <PageHeader title="HR Dashboard" subtitle="Live attendance across all faculty" />
          <HRDashboard />
        </main>
      </div>
    </div>,
    { title: 'HR Dashboard - RPL Maheshwari College' }
  )
)
