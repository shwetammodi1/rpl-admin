import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'
import TimetableCalendar from '../../../islands/TimetableCalendar'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="faculty" active="tt-calendar" />
      <div className="admin-main">
        <Topbar role="faculty" />
        <main className="admin-content">
          <PageHeader title="Calendar View" subtitle="Monthly view of your lectures" />
          <TimetableCalendar />
        </main>
      </div>
    </div>,
    { title: 'Calendar View - RPL Maheshwari College' }
  )
)
