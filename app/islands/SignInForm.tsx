import { useState } from 'hono/jsx'

export default function SignInForm() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: Event) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const data = new FormData(form)

    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.get('email'),
        password: data.get('password'),
      }),
    })

    const result = await res.json<{ error?: string }>()

    if (!res.ok) {
      setLoading(false)
      setError(result.error ?? 'Something went wrong')
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label>
        Email
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
