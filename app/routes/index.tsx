import { createRoute } from '../lib/factory'
import AuthAside from '../components/AuthAside'
import LoginForm from '../islands/LoginForm'

export default createRoute((c) => {
  return c.render(
    <div className="login-page">
      <AuthAside />
      <main className="login-main">
        <LoginForm />
      </main>
    </div>,
    { title: 'Sign In - RPL Maheshwari College' }
  )
})
