import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'
import AuthGuard from '../../../islands/AuthGuard'
import TimetableWeekly from '../../../islands/TimetableWeekly'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="master" active="tt-weekly" />
      <div className="admin-main">
        <Topbar role="master" />
        <main className="admin-content">
          <PageHeader title="Weekly Timetable" subtitle="Week grid for any faculty or department" />
          <TimetableWeekly admin />
        </main>
      </div>
      <AuthGuard allowedRoles={['master']} />
    </div>,
    { title: 'Weekly Timetable - RPL Maheshwari College' }
  )
)
