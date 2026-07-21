import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="master" active="tt-manage" />
      <div className="admin-main">
        <Topbar role="master" />
        <main className="admin-content">
          <PageHeader title="Manage Timetable" subtitle="Create, edit and publish the college timetable" />
          <section className="admin-card tt-placeholder">
            <p>
              <strong>Phase 2 — page created (admin only).</strong> Filters, the lecture entry form
              and the editable grid are built in Phase 6.
            </p>
          </section>
        </main>
      </div>
    </div>,
    { title: 'Manage Timetable - RPL Maheshwari College' }
  )
)
