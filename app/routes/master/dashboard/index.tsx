import { createRoute } from '../../../lib/factory'
import SignOutButton from '../../../islands/SignOutButton'
import AuthGuard from '../../../islands/AuthGuard'

export default createRoute((c) => {
  return c.render(
    <>
      <header className="welcome-topbar">
        <div className="login-crest">RPL</div>
        <p className="welcome-topbar-title">RPL Maheshwari College · Indore · Madhya Pradesh</p>
        <SignOutButton />
      </header>
      <main className="welcome-content" style={{ paddingTop: '48px' }}>
        <h1>Master Admin Dashboard</h1>
        <p>
          Welcome, <strong id="user-name">master admin</strong>. College-wide settings and oversight will appear
          here.
        </p>
      </main>
      <AuthGuard allowedRoles={['master']} />
    </>,
    { title: 'Master Dashboard - RPL Maheshwari College' }
  )
})
