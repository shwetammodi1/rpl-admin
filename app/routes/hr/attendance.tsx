import { createRoute } from '../../lib/factory'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import PageHeader from '../../components/PageHeader'
import HRAttendanceReport from '../../islands/HRAttendanceReport'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="hr" active="attendance" />
      <div className="admin-main">
        <Topbar role="hr" />
        <main className="admin-content">
          <PageHeader title="Attendance Reports" subtitle="Consolidated monthly report for all staff" />
          <HRAttendanceReport />
        </main>
      </div>
    </div>,
    { title: 'Attendance Reports - RPL Maheshwari College' }
  )
)
