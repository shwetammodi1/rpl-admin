import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'
import AuthGuard from '../../../islands/AuthGuard'
import TimetableWeekly from '../../../islands/TimetableWeekly'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="faculty" active="tt-weekly" />
      <div className="admin-main">
        <Topbar role="faculty" />
        <main className="admin-content">
          <PageHeader title="Weekly Timetable" subtitle="Your week at a glance — day by day" />
          <TimetableWeekly />
        </main>
      </div>
      <AuthGuard allowedRoles={['faculty']} />
    </div>,
    { title: 'Weekly Timetable - RPL Maheshwari College' }
  )
)
