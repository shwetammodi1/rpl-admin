import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="master" active="tt-calendar" />
      <div className="admin-main">
        <Topbar role="master" />
        <main className="admin-content">
          <PageHeader title="Calendar View" subtitle="Monthly lecture calendar" />
          <section className="admin-card tt-placeholder">
            <p>
              <strong>Phase 2 — page created.</strong> The monthly calendar is built in Phase 5.
            </p>
          </section>
        </main>
      </div>
    </div>,
    { title: 'Calendar View - RPL Maheshwari College' }
  )
)
