import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="faculty" active="tt-calendar" />
      <div className="admin-main">
        <Topbar role="faculty" />
        <main className="admin-content">
          <PageHeader title="Calendar View" subtitle="Monthly view of your lectures" />
          <section className="admin-card tt-placeholder">
            <p>
              <strong>Phase 2 — page created.</strong> The monthly calendar (events per day,
              month/week toggle, legend) is built in Phase 5.
            </p>
          </section>
        </main>
      </div>
    </div>,
    { title: 'Calendar View - RPL Maheshwari College' }
  )
)
