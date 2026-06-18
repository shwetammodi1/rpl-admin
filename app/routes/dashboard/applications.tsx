import { createRoute } from '../../lib/factory'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import PageHeader from '../../components/PageHeader'
import MyApplications from '../../islands/MyApplications'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="faculty" active="applications" />
      <div className="admin-main">
        <Topbar role="faculty" />
        <main className="admin-content">
          <PageHeader title="My Applications" subtitle="Track the status of every request">
            <a href="/dashboard/apply" className="btn-gold">
              Apply for Leave →
            </a>
          </PageHeader>
          <MyApplications />
        </main>
      </div>
    </div>,
    { title: 'My Applications - RPL Maheshwari College' }
  )
)
