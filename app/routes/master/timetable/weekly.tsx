import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="master" active="tt-weekly" />
      <div className="admin-main">
        <Topbar role="master" />
        <main className="admin-content">
          <PageHeader title="Weekly Timetable" subtitle="Week grid for any faculty or department" />
          <section className="admin-card tt-placeholder">
            <p>
              <strong>Phase 2 — page created.</strong> The weekly grid is built in Phase 4.
            </p>
          </section>
        </main>
      </div>
    </div>,
    { title: 'Weekly Timetable - RPL Maheshwari College' }
  )
)
