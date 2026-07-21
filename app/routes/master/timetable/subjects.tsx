import { createRoute } from '../../../lib/factory'
import Sidebar from '../../../components/Sidebar'
import Topbar from '../../../components/Topbar'
import PageHeader from '../../../components/PageHeader'
import AuthGuard from '../../../islands/AuthGuard'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="master" active="tt-subjects" />
      <div className="admin-main">
        <Topbar role="master" />
        <main className="admin-content">
          <PageHeader title="Subjects" subtitle="Subject master — code, name, department, colour" />
          <section className="admin-card tt-placeholder">
            <p>
              <strong>Phase 2 — page created (admin only).</strong> Subject list and CRUD are built
              in Phase 6 / Phase 8.
            </p>
          </section>
        </main>
      </div>
      <AuthGuard allowedRoles={['master']} />
    </div>,
    { title: 'Subjects - RPL Maheshwari College' }
  )
)
