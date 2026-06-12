import { createRoute } from '../../lib/factory'
import SignUpForm from '../../islands/SignUpForm'

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
          <h2>Create an account</h2>
          <p className="auth-card-subtitle">
            New accounts start with view-only access until a master admin grants admin rights.
          </p>
          <SignUpForm />
          <p className="auth-switch">
            Already have an account? <a href="/signin">Sign in</a>
          </p>
        </div>
      </main>
    </div>,
    { title: 'Sign Up - RPL Maheshwari College' }
  )
})
