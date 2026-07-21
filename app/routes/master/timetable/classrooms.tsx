import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'
import AuthGuard from '../../../islands/AuthGuard'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="master" active="tt-classrooms" />
      <div className="admin-main">
        <Topbar role="master" />
        <main className="admin-content">
          <PageHeader title="Classrooms" subtitle="Rooms, buildings and seating capacity" />
          <section className="admin-card tt-placeholder">
            <p>
              <strong>Phase 2 — page created (admin only).</strong> Classroom list and CRUD are
              built in Phase 6 / Phase 8.
            </p>
          </section>
        </main>
      </div>
      <AuthGuard allowedRoles={['master']} />
    </div>,
    { title: 'Classrooms - RPL Maheshwari College' }
  )
)
