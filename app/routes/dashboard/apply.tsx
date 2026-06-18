import { createRoute } from '../../lib/factory'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import PageHeader from '../../components/PageHeader'
import ApplyLeave from '../../islands/ApplyLeave'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="faculty" active="apply" />
      <div className="admin-main">
        <Topbar role="faculty" />
        <main className="admin-content">
          <PageHeader title="Apply for Leave" subtitle="Casual leave, half-day or short permission" />
          <ApplyLeave />
        </main>
      </div>
    </div>,
    { title: 'Apply for Leave - RPL Maheshwari College' }
  )
)
