import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'
import AuthGuard from '../../../islands/AuthGuard'
import TimetableCalendar from '../../../islands/TimetableCalendar'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="hr" active="tt-calendar" />
      <div className="admin-main">
        <Topbar role="hr" />
        <main className="admin-content">
          <PageHeader title="Calendar View" subtitle="Every faculty's lectures — view only" />
          <TimetableCalendar admin />
        </main>
      </div>
      <AuthGuard allowedRoles={['hr', 'master']} />
    </div>,
    { title: 'Calendar View - RPL Maheshwari College' }
  )
)
