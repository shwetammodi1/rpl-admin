import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'
import AuthGuard from '../../../islands/AuthGuard'
import TimetableWeekly from '../../../islands/TimetableWeekly'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="hr" active="tt-weekly" />
      <div className="admin-main">
        <Topbar role="hr" />
        <main className="admin-content">
          <PageHeader title="Weekly Timetable" subtitle="Every faculty's week — view only" />
          <TimetableWeekly admin />
        </main>
      </div>
      <AuthGuard allowedRoles={['hr', 'master']} />
    </div>,
    { title: 'Weekly Timetable - RPL Maheshwari College' }
  )
)
