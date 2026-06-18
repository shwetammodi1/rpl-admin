import { createRoute } from '../../lib/factory'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import PageHeader from '../../components/PageHeader'
import FacultyDashboard from '../../islands/FacultyDashboard'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="faculty" active="dashboard" />
      <div className="admin-main">
        <Topbar role="faculty" />
        <main className="admin-content">
          <PageHeader title="Dashboard" subtitle="Your attendance and casual leave at a glance">
            <a href="/dashboard/apply" className="btn-gold">
              Apply for Leave →
            </a>
          </PageHeader>
          <FacultyDashboard />
        </main>
      </div>
    </div>,
    { title: 'Dashboard - RPL Maheshwari College' }
  )
)
