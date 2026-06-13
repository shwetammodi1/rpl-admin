import { useState } from 'hono/jsx'

type Tab = 'password' | 'otp'

const ROLE_REDIRECTS: Record<string, string> = {
  pending: '/welcome',
  faculty: '/dashboard',
  hr: '/hr/dashboard',
  master: '/master',
}

export default function LoginForm() {
  const [tab, setTab] = useState<Tab>('password')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: Event) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const data = new FormData(form)

    if (tab === 'otp') {
      setError('Email OTP sign-in is coming soon. Please use your password for now.')
      return
    }

    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.get('email'),
        password: data.get('password'),
      }),
    })

    const result = await res.json<{ error?: string; token?: string; user?: { role?: string } }>()

    if (!res.ok || !result.token) {
      setLoading(false)
      setError(result.error ?? 'Something went wrong')
      return
    }

    localStorage.setItem('rpl_token', result.token)
    const role = result.user?.role ?? 'pending'
    window.location.href = ROLE_REDIRECTS[role] ?? '/welcome'
  }

  return (
    <div className="login-card">
      <h2>Sign in</h2>
      <p className="login-card-subtitle">Use your registered college email to access the portal.</p>

      <div className="login-tabs">
        <button
          type="button"
          className={`login-tab ${tab === 'password' ? 'is-active' : ''}`}
          onClick={() => setTab('password')}
        >
          Password
        </button>
        <button
          type="button"
          className={`login-tab ${tab === 'otp' ? 'is-active' : ''}`}
          onClick={() => setTab('otp')}
        >
          Email OTP
        </button>
      </div>

      <form className="login-form" onSubmit={onSubmit}>
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required />
        </label>

        {tab === 'password' ? (
          <label>
            Password
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
        ) : (
          <p className="login-otp-callout">A 6-digit code will be sent to your registered college email.</p>
        )}

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-gold" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in →'}
        </button>
      </form>

      <hr className="login-divider" />

      <p className="login-switch">
        New here? <a href="/signup">Create an account →</a>
      </p>
    </div>
  )
}
