import { createRoute } from '../../lib/factory'
import AuthAside from '../../components/AuthAside'
import SignUpForm from '../../islands/SignUpForm'

export default createRoute((c) => {
  return c.render(
    <div className="login-page">
      <AuthAside />
      <main className="login-main">
        <div className="login-card">
          <h2>Create an account</h2>
          <p className="login-card-subtitle">
            New accounts start with pending access until HR or the master admin assigns your role.
          </p>
          <SignUpForm />
          <hr className="login-divider" />
          <p className="login-switch">
            Already have an account? <a href="/">Sign in</a>
          </p>
        </div>
      </main>
    </div>,
    { title: 'Create Account - RPL Maheshwari College' }
  )
})
