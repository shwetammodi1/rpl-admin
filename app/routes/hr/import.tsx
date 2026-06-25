import { createRoute } from '../../lib/factory'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import PageHeader from '../../components/PageHeader'
import AttendanceImport from '../../islands/AttendanceImport'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="hr" active="import" />
      <div className="admin-main">
        <Topbar role="hr" />
        <main className="admin-content">
          <PageHeader
            title="Import Attendance"
            subtitle="Upload the TimeWatch punch export (CSV) to load attendance into the portal"
          />
          <AttendanceImport />
        </main>
      </div>
    </div>,
    { title: 'Import Attendance - RPL Maheshwari College' }
  )
)
