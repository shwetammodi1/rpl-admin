import { useState } from 'hono/jsx'

type Tab = 'password' | 'otp'

const ROLE_REDIRECTS: Record<string, string> = {
  pending: '/welcome',
  faculty: '/dashboard',
  hr: '/hr/dashboard',
  master: '/master',
}

function redirectByRole(role: string | undefined) {
  window.location.href = ROLE_REDIRECTS[role ?? 'pending'] ?? '/welcome'
}

export default function LoginForm() {
  const [tab, setTab] = useState<Tab>('password')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Password tab
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // OTP tab
  const [otpSent, setOtpSent] = useState(false)
  const [otpMessage, setOtpMessage] = useState('')
  const [code, setCode] = useState('')

  const switchTab = (next: Tab) => {
    setTab(next)
    setError('')
    setOtpMessage('')
    setOtpSent(false)
    setCode('')
  }

  const handlePasswordSubmit = async (e: Event) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: email, password }),
    })
    const result = await res.json<{ error?: string; token?: string; user?: { role?: string } }>()

    if (!res.ok || !result.token) {
      setLoading(false)
      setError(result.error ?? 'Something went wrong')
      return
    }

    localStorage.setItem('rpl_token', result.token)
    redirectByRole(result.user?.role)
  }

  const handleSendCode = async (e: Event) => {
    e.preventDefault()
    if (!email) {
      setError('Enter your college email first')
      return
    }
    setError('')
    setLoading(true)

    await fetch('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    setLoading(false)
    setOtpSent(true)
    setOtpMessage('Code sent to your email. It expires in 10 minutes.')
  }

  const handleVerify = async (e: Event) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })
    const result = await res.json<{ error?: string; token?: string; user?: { role?: string } }>()

    if (!res.ok || !result.token) {
      setLoading(false)
      setError(result.error ?? 'Invalid or expired code')
      return
    }

    localStorage.setItem('rpl_token', result.token)
    redirectByRole(result.user?.role)
  }

  return (
    <div className="login-card">
      <h2>Sign in</h2>
      <p className="login-card-subtitle">Use your registered college email to access the portal.</p>

      <div className="login-tabs">
        <button
          type="button"
          className={`login-tab ${tab === 'password' ? 'is-active' : ''}`}
          onClick={() => switchTab('password')}
        >
          Password
        </button>
        <button
          type="button"
          className={`login-tab ${tab === 'otp' ? 'is-active' : ''}`}
          onClick={() => switchTab('otp')}
        >
          Email OTP
        </button>
      </div>

      {tab === 'password' ? (
        <form className="login-form" onSubmit={handlePasswordSubmit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-gold" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>
      ) : (
        <form className="login-form" onSubmit={otpSent ? handleVerify : handleSendCode}>
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              disabled={otpSent}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            />
          </label>

          {!otpSent ? (
            <p className="login-otp-callout">A 6-digit code will be sent to your registered college email.</p>
          ) : (
            <>
              {otpMessage && <p className="login-otp-callout">{otpMessage}</p>}
              <label>
                6-digit code
                <input
                  type="text"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onInput={(e) => setCode((e.target as HTMLInputElement).value)}
                />
              </label>
            </>
          )}

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-gold" disabled={loading}>
            {loading ? 'Please wait…' : otpSent ? 'Verify & Sign in →' : 'Send code →'}
          </button>

          {otpSent && (
            <button
              type="button"
              className="login-switch"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => {
                setOtpSent(false)
                setCode('')
                setOtpMessage('')
                setError('')
              }}
            >
              Use a different email
            </button>
          )}
        </form>
      )}

      <hr className="login-divider" />

      <p className="login-switch">
        New here? <a href="/signup">Create an account →</a>
      </p>
    </div>
  )
}
