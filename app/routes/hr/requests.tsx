import { createRoute } from '../../lib/factory'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import PageHeader from '../../components/PageHeader'
import HRLeaveRequests from '../../islands/HRLeaveRequests'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="hr" active="requests" />
      <div className="admin-main">
        <Topbar role="hr" />
        <main className="admin-content">
          <PageHeader title="Leave Requests" subtitle="Review and action pending applications" />
          <HRLeaveRequests />
        </main>
      </div>
    </div>,
    { title: 'Leave Requests - RPL Maheshwari College' }
  )
)
