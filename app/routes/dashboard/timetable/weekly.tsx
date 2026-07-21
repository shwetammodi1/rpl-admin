import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="faculty" active="tt-weekly" />
      <div className="admin-main">
        <Topbar role="faculty" />
        <main className="admin-content">
          <PageHeader title="Weekly Timetable" subtitle="Your week at a glance — day by day" />
          <section className="admin-card tt-placeholder">
            <p>
              <strong>Phase 2 — page created.</strong> The weekly grid (time rows × day columns,
              colour-coded lecture cards, lecture modal) is built in Phase 4.
            </p>
          </section>
        </main>
      </div>
    </div>,
    { title: 'Weekly Timetable - RPL Maheshwari College' }
  )
)
