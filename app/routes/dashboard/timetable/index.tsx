import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'
import TimetableDashboard from '../../../islands/TimetableDashboard'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="faculty" active="tt-dashboard" />
      <div className="admin-main">
        <Topbar role="faculty" />
        <main className="admin-content">
          <PageHeader title="Timetable Dashboard" subtitle="Your lectures, today's schedule and weekly summary" />
          <TimetableDashboard />
        </main>
      </div>
    </div>,
    { title: 'Timetable Dashboard - RPL Maheshwari College' }
  )
)
