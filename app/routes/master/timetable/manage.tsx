import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'
import AuthGuard from '../../../islands/AuthGuard'
import TimetableManage from '../../../islands/TimetableManage'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="master" active="tt-manage" />
      <div className="admin-main">
        <Topbar role="master" />
        <main className="admin-content">
          <PageHeader title="Manage Timetable" subtitle="Create, edit and publish the college timetable" />
          <TimetableManage />
        </main>
      </div>
      <AuthGuard allowedRoles={['master']} />
    </div>,
    { title: 'Manage Timetable - RPL Maheshwari College' }
  )
)
