import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'
import AuthGuard from '../../../islands/AuthGuard'
import LogReport from '../../../islands/LogReport'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="hr" active="tt-log" />
      <div className="admin-main">
        <Topbar role="hr" />
        <main className="admin-content">
          <PageHeader title="Lesson Log & Attendance" subtitle="What was taught and who was present — download daily or weekly" />
          <LogReport admin />
        </main>
      </div>
      <AuthGuard allowedRoles={['hr', 'master']} />
    </div>,
    { title: 'Lesson Log - RPL Maheshwari College' }
  )
)
