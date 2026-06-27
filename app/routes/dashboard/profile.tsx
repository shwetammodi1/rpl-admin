import { createRoute } from '../../lib/factory'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import PageHeader from '../../components/PageHeader'
import MyProfile from '../../islands/MyProfile'

export default createRoute((c) =>
  c.render(
    <div className="admin-layout">
      <Sidebar role="faculty" active="profile" />
      <div className="admin-main">
        <Topbar role="faculty" />
        <main className="admin-content">
          <PageHeader title="My Profile" subtitle="Update your photo, academic details and contact information" />
          <MyProfile />
        </main>
      </div>
    </div>,
    { title: 'My Profile - RPL Maheshwari College' }
  )
)
