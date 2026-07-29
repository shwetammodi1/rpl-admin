import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'
import AuthGuard from '../../../islands/AuthGuard'
import StudentsAdmin from '../../../islands/StudentsAdmin'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="master" active="tt-students" />
      <div className="admin-main">
        <Topbar role="master" />
        <main className="admin-content">
          <PageHeader title="Students" subtitle="Upload each class's students — used for one-click attendance" />
          <StudentsAdmin />
        </main>
      </div>
      <AuthGuard allowedRoles={['master']} />
    </div>,
    { title: 'Students - RPL Maheshwari College' }
  )
)
