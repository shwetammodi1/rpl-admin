import { createRoute } from '../../lib/factory'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import PageHeader from '../../components/PageHeader'
import HRAttendanceCalendar from '../../islands/HRAttendanceCalendar'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="hr" active="attendance" />
      <div className="admin-main">
        <Topbar role="hr" />
        <main className="admin-content">
          <PageHeader title="Attendance Calendar" subtitle="View daily attendance and mark leave for absent days" />
          <HRAttendanceCalendar />
        </main>
      </div>
    </div>,
    { title: 'Attendance Calendar - RPL Maheshwari College' }
  )
)
