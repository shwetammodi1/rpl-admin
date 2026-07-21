import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="master" active="tt-dashboard" />
      <div className="admin-main">
        <Topbar role="master" />
        <main className="admin-content">
          <PageHeader title="Timetable Dashboard" subtitle="College-wide lecture overview" />
          <section className="admin-card tt-placeholder">
            <p>
              <strong>Phase 2 — page created.</strong> The dashboard UI is built in Phase 3.
            </p>
          </section>
        </main>
      </div>
    </div>,
    { title: 'Timetable Dashboard - RPL Maheshwari College' }
  )
)
