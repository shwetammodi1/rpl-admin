import { createRoute } from '../../lib/factory'
import SignInForm from '../../islands/SignInForm'

export default createRoute((c) => {
  const user = c.get('user')
  if (user) return c.redirect('/dashboard')

  return c.render(
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="auth-aside-content">
          <div className="auth-logo">RPL</div>
          <h1>RPL Maheshwari College</h1>
          <p className="auth-aside-tagline">Indore · Est. 2001 · Admin Portal</p>
          <ul className="auth-aside-points">
            <li>NAAC Accredited &amp; UGC Approved</li>
            <li>25+ years of academic excellence</li>
            <li>95% placement record</li>
          </ul>
        </div>
        <p className="auth-aside-footer">&copy; RPL Maheshwari College, Indore</p>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <span className="auth-badge">Admin Portal</span>
          <h2>Welcome back</h2>
          <p className="auth-card-subtitle">Sign in to access the RPL Maheshwari College admin dashboard.</p>
          <SignInForm />
          <p className="auth-switch">
            Don't have an account? <a href="/signup">Sign up</a>
          </p>
        </div>
      </main>
    </div>,
    { title: 'Sign In - RPL Maheshwari College' }
  )
})
